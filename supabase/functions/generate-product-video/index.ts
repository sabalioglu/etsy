import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''
const KIE_API_KEY = Deno.env.get('KIE_API_KEY') || ''

interface VideoGenerationRequest {
  jobId: string
  listingId: string
  productTitle: string
  productDescription?: string
  productTags?: string[]
  heroImageUrl: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const body = await req.json() as VideoGenerationRequest
    const { jobId, listingId, productTitle, productDescription, productTags, heroImageUrl } = body

    console.log('Starting video generation:', { jobId, listingId, productTitle })

    // Step 1: Download image
    await updateJobStatus(supabase, jobId, 'detecting_human')
    const imageResponse = await fetch(heroImageUrl)
    const imageBlob = await imageResponse.blob()
    const imageArrayBuffer = await imageBlob.arrayBuffer()
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)))

    // Step 2: Detect human in image
    const humanDetected = await detectHuman(imageBase64)
    await supabase.from('video_generation_jobs').update({ human_detected: humanDetected }).eq('id', jobId)

    console.log('Human detection result:', humanDetected)

    let processedImageUrl = heroImageUrl
    let imageEdited = false

    // Step 3: Edit image if human detected
    if (humanDetected) {
      await updateJobStatus(supabase, jobId, 'editing_image')
      const editedImageBase64 = await removeHumanFromImage(imageBase64)
      processedImageUrl = await uploadToKie(editedImageBase64, 'edited-product.jpg')
      imageEdited = true
      await supabase.from('video_generation_jobs').update({ 
        image_edited: imageEdited,
        edited_image_url: processedImageUrl 
      }).eq('id', jobId)
      console.log('Image edited and uploaded:', processedImageUrl)
    } else {
      // Just resize/optimize the original image
      const resizedImageBase64 = await resizeImage(imageBase64)
      processedImageUrl = await uploadToKie(resizedImageBase64, 'product.jpg')
      await supabase.from('video_generation_jobs').update({ edited_image_url: processedImageUrl }).eq('id', jobId)
      console.log('Image optimized and uploaded:', processedImageUrl)
    }

    // Step 4: Generate video script
    await updateJobStatus(supabase, jobId, 'generating_script')
    const videoScript = await generateVideoScript({
      title: productTitle,
      description: productDescription || '',
      tags: productTags || [],
      imageUrl: processedImageUrl
    })

    await supabase.from('video_generation_jobs').update({ video_script: videoScript }).eq('id', jobId)
    console.log('Video script generated:', videoScript.substring(0, 100) + '...')

    // Step 5: Generate video with Sora 2
    await updateJobStatus(supabase, jobId, 'generating_video')
    const soraTaskId = await createSoraVideo(videoScript, processedImageUrl)
    await supabase.from('video_generation_jobs').update({ sora_task_id: soraTaskId }).eq('id', jobId)

    console.log('Sora video task created:', soraTaskId)

    // Step 6: Poll for video completion (with retry logic)
    const videoUrl = await pollSoraVideo(soraTaskId, videoScript, processedImageUrl, supabase, jobId)

    // Step 7: Mark as completed
    await supabase.from('video_generation_jobs').update({
      status: 'completed',
      video_url: videoUrl,
      thumbnail_url: videoUrl.replace('.mp4', '_thumbnail.jpg'),
      completed_at: new Date().toISOString()
    }).eq('id', jobId)

    console.log('Video generation completed:', videoUrl)

    return new Response(
      JSON.stringify({ success: true, videoUrl, jobId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Video generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function updateJobStatus(supabase: any, jobId: string, status: string) {
  await supabase.from('video_generation_jobs').update({ status }).eq('id', jobId)
}

async function detectHuman(imageBase64: string): Promise<boolean> {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + GEMINI_API_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'You are an image analyst. Your ONLY job is to detect if there is a REALISTIC HUMAN in this image.\n\nHUMAN MEANS:\n- Real person (not cartoon, not illustration)\n- Face visible OR\n- Hands visible OR\n- Body visible OR\n- Any part of a real human\n\nRESPOND:\n- If you see ANY part of a real human → "YES"\n- If NO real human → "NO"\n\nIMPORTANT: \n- Hands holding objects = YES\n- Face in background = YES\n- Person wearing product = YES\n- Empty product shot = NO\n- Cartoon/drawing = NO\n\nLook at the image now. Is there a REAL HUMAN?\n\nRespond with ONLY ONE WORD: "YES" or "NO"' },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
          ]
        }]
      })
    }
  )

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase()
  return text === 'YES'
}

async function removeHumanFromImage(imageBase64: string): Promise<string> {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:editImage?key=' + GEMINI_API_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'You are a professional product photographer and image editor. Your task is to transform this image into a CLEAN PRODUCT HERO SHOT.\n\nCURRENT IMAGE ANALYSIS:\nThis image contains a realistic human figure (person, hands, face, or body) holding or displaying a product.\n\nYOUR TASK:\n\n1. IDENTIFY the main product being held or displayed\n2. REMOVE all human elements completely:\n   - Remove person\'s face\n   - Remove hands\n   - Remove arms, body, legs\n   - Remove any human presence\n   \n3. CREATE a professional product hero shot:\n   - Product should be CENTERED in the frame\n   - Product should be the ONLY focus\n   - Keep the product in perfect condition (no blur, no distortion)\n   - Maintain product\'s original colors and details\n   \n4. CLEAN the background:\n   - Keep the original background setting (kitchen, living room, etc.) BUT remove the person\n   - OR replace with a clean, minimal background if removal is difficult\n   - Ensure natural lighting remains consistent\n   - Fill any gaps left by removed person seamlessly',
        image: { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
      })
    }
  )

  const data = await response.json()
  return data.generatedImage?.data || imageBase64
}

async function resizeImage(imageBase64: string): Promise<string> {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:editImage?key=' + GEMINI_API_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Optimize this product image while maintaining visual quality. Keep all details, colors, and clarity intact, but compress the file size. Do not change composition, do not add anything, do not remove anything. Simply re-encode the image efficiently',
        image: { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
      })
    }
  )

  const data = await response.json()
  return data.generatedImage?.data || imageBase64
}

async function uploadToKie(imageBase64: string, fileName: string): Promise<string> {
  const imageBlob = new Blob([Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0))], { type: 'image/jpeg' })
  
  const formData = new FormData()
  formData.append('file', imageBlob, fileName)
  formData.append('uploadPath', 'images/user-uploads')
  formData.append('fileName', fileName)

  const response = await fetch('https://kieai.redpandaai.co/api/file-stream-upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KIE_API_KEY}` },
    body: formData
  })

  const data = await response.json()
  return data.data.downloadUrl
}

async function generateVideoScript(product: any): Promise<string> {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + GEMINI_API_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `You are a viral UGC video creator expert. Create a Sora 2 video generation prompt for this Etsy product that MUST feature a realistic person showing the product.\n\nPRODUCT DATA:\nTitle: ${product.title}\nDescription: ${product.description}\nTags: ${product.tags.join(', ')}\n\nYOUR TASK: Create a 10-15 second UGC video where a REAL PERSON authentically showcases this product. The video should feel like a friend showing you something cool.\n\nRESPOND WITH ONLY THE SORA 2 PROMPT PARAGRAPH (include person description, camera angle, emotions, voiceover dialogue, and product showcase).` },
            { inline_data: { mime_type: 'image/jpeg', data: await fetchImageAsBase64(product.imageUrl) } }
          ]
        }]
      })
    }
  )

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const blob = await response.blob()
  const arrayBuffer = await blob.arrayBuffer()
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
}

async function createSoraVideo(prompt: string, imageUrl: string): Promise<string> {
  const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sora-2-image-to-video',
      input: {
        prompt,
        image_urls: [imageUrl],
        aspect_ratio: 'landscape',
        n_frames: '10',
        remove_watermark: true
      }
    })
  })

  const data = await response.json()
  return data.data.taskId
}

async function pollSoraVideo(
  taskId: string, 
  originalPrompt: string, 
  imageUrl: string,
  supabase: any,
  jobId: string
): Promise<string> {
  const maxAttempts = 30
  const delayMs = 10000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, delayMs))

    const response = await fetch(
      `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`,
      { headers: { 'Authorization': `Bearer ${KIE_API_KEY}` } }
    )

    const data = await response.json()
    const state = data.data.state

    if (state === 'success') {
      const resultJson = JSON.parse(data.data.resultJson)
      return resultJson.resultUrls[0]
    }

    if (state === 'fail') {
      const failMsg = data.data.failMsg || ''
      const isGuardrailViolation = 
        failMsg.toLowerCase().includes('guardrail') ||
        failMsg.toLowerCase().includes('third-party content') ||
        failMsg.toLowerCase().includes('violate') ||
        failMsg.toLowerCase().includes('policy') ||
        failMsg.toLowerCase().includes('copyright')

      if (isGuardrailViolation) {
        console.log('Guardrail violation detected, regenerating prompt...')
        const sanitizedPrompt = await sanitizePrompt(originalPrompt, failMsg)
        const newTaskId = await createSoraVideo(sanitizedPrompt, imageUrl)
        await supabase.from('video_generation_jobs').update({ 
          sora_task_id: newTaskId,
          retry_count: 1,
          video_script: sanitizedPrompt
        }).eq('id', jobId)
        return await pollSoraVideo(newTaskId, sanitizedPrompt, imageUrl, supabase, jobId)
      }

      throw new Error(`Video generation failed: ${failMsg}`)
    }
  }

  throw new Error('Video generation timeout')
}

async function sanitizePrompt(originalPrompt: string, failReason: string): Promise<string> {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + GEMINI_API_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `REJECTED PROMPT (Copyright violation):\n${originalPrompt}\n\nREJECTION REASON: ${failReason}\n\nREWRITE this UGC video prompt to REMOVE copyrighted content. Replace brand names, character names, and trademarked terms with generic alternatives. Keep the person description, camera angle, and technical specs unchanged.\n\nRESPOND WITH ONLY THE REWRITTEN PROMPT (no explanation).`
          }]
        }]
      })
    }
  )

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || originalPrompt
}
