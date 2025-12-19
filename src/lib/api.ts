import { supabase } from './supabase'

export async function analyzeShop(shopUrl: string, shopName: string, numberOfProducts: number) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: analysis, error: analysisError } = await supabase
    .from('shop_analyses')
    .insert({
      user_id: user.id,
      shop_url: shopUrl,
      shop_name: shopName,
      total_products: 0,
      status: 'pending'
    })
    .select()
    .single()

  if (analysisError) throw analysisError

  const response = await supabase.functions.invoke('analyze-shop', {
    body: {
      analysisId: analysis.id,
      shopName,
      numberOfProducts
    }
  })

  if (response.error) throw response.error

  return analysis
}

export async function getShopAnalyses() {
  const { data, error } = await supabase
    .from('shop_analyses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getShopAnalysis(id: string) {
  const { data, error } = await supabase
    .from('shop_analyses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getAnalyzedProducts(shopAnalysisId: string) {
  const { data, error } = await supabase
    .from('analyzed_products')
    .select('*')
    .eq('shop_analysis_id', shopAnalysisId)
    .order('score', { ascending: false })

  if (error) throw error
  return data
}

export async function updateProductCloneStatus(productId: string, marked: boolean) {
  const { error } = await supabase
    .from('analyzed_products')
    .update({ marked_for_cloning: marked })
    .eq('id', productId)

  if (error) throw error
}

export async function uploadProductCsv(file: File) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const fileName = `${user.id}/${Date.now()}_${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('product-uploads')
    .upload(fileName, file)

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('product-uploads')
    .getPublicUrl(fileName)

  const { data: upload, error: dbError } = await supabase
    .from('product_uploads')
    .insert({
      user_id: user.id,
      file_name: file.name,
      file_url: urlData.publicUrl,
      products_count: 0,
      products_processed: 0,
      status: 'uploaded'
    })
    .select()
    .single()

  if (dbError) throw dbError

  return upload
}

export async function processProductCsv(uploadId: string) {
  const response = await supabase.functions.invoke('process-product-csv', {
    body: { uploadId }
  })

  if (response.error) throw response.error
  return response.data
}

export async function getProductUploads() {
  const { data, error } = await supabase
    .from('product_uploads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getProductDetails(uploadId: string) {
  const { data, error } = await supabase
    .from('product_details')
    .select('*')
    .eq('upload_id', uploadId)

  if (error) throw error
  return data
}

export async function cloneProducts(productIds: string[]) {
  const response = await supabase.functions.invoke('clone-products', {
    body: { productIds }
  })

  if (response.error) throw response.error
  return response.data
}

export async function getClonedProducts() {
  const { data, error } = await supabase
    .from('cloned_products')
    .select(`
      *,
      cloned_product_images(*)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function subscribeToAnalysis(analysisId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`analysis:${analysisId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'shop_analyses',
        filter: `id=eq.${analysisId}`
      },
      callback
    )
    .subscribe()
}

export async function subscribeToClonedProducts(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`cloned:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'cloned_products',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

export async function generateProductImages(data: {
  productId?: string
  listingId: string
  productTitle: string
  productUrl: string
  images: Array<{ index: number; url: string }>
}) {
  const response = await supabase.functions.invoke('generate-product-images', {
    body: data
  })

  if (response.error) throw response.error
  return response.data
}

export async function getImageGenerationJobs() {
  const { data, error } = await supabase
    .from('image_generation_jobs')
    .select(`
      *,
      generated_images(*)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getImageGenerationJob(jobId: string) {
  const { data, error } = await supabase
    .from('image_generation_jobs')
    .select(`
      *,
      generated_images(*)
    `)
    .eq('id', jobId)
    .single()

  if (error) throw error
  return data
}

export async function subscribeToImageJob(jobId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`image-job:${jobId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'image_generation_jobs',
        filter: `id=eq.${jobId}`
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'generated_images',
        filter: `job_id=eq.${jobId}`
      },
      callback
    )
    .subscribe()
}

export function extractImagesFromProduct(product: any): Array<{ index: number; url: string }> {
  const images: Array<{ index: number; url: string }> = []

  if (product.images && typeof product.images === 'object') {
    if (Array.isArray(product.images)) {
      product.images.forEach((url: string, index: number) => {
        if (url && url.trim() && url.startsWith('http')) {
          images.push({ index: index + 1, url: url.trim() })
        }
      })
    } else {
      for (let i = 1; i <= 13; i++) {
        const url = product.images[`Image ${i} URLs`] || product.images[`image_${i}`] || product.images[i]
        if (url && typeof url === 'string' && url.trim() && url.startsWith('http')) {
          images.push({ index: i, url: url.trim() })
        }
      }
    }
  }

  return images
}

export async function generateImagesFromProducts(products: any[]) {
  const results = []

  for (const product of products) {
    const images = extractImagesFromProduct(product)

    if (images.length === 0) {
      results.push({
        success: false,
        productId: product.id,
        error: 'No valid images found'
      })
      continue
    }

    try {
      const result = await generateProductImages({
        productId: product.id,
        listingId: product.original_product_id || product.product_id || product.id,
        productTitle: product.product_title || 'Untitled Product',
        productUrl: product.product_url || '',
        images
      })

      results.push({
        success: true,
        productId: product.id,
        jobId: result.jobId,
        totalImages: images.length
      })
    } catch (error) {
      results.push({
        success: false,
        productId: product.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}

export async function generateProductVideo(data: {
  clonedProductId?: string
  listingId: string
  productTitle: string
  productDescription?: string
  productTags?: string[]
  heroImageUrl: string
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: job, error: jobError } = await supabase
    .from('video_generation_jobs')
    .insert({
      user_id: user.id,
      cloned_product_id: data.clonedProductId || null,
      listing_id: data.listingId,
      product_title: data.productTitle,
      hero_image_url: data.heroImageUrl,
      status: 'pending'
    })
    .select()
    .single()

  if (jobError) throw jobError

  const response = await supabase.functions.invoke('generate-product-video', {
    body: {
      jobId: job.id,
      listingId: data.listingId,
      productTitle: data.productTitle,
      productDescription: data.productDescription,
      productTags: data.productTags,
      heroImageUrl: data.heroImageUrl
    }
  })

  if (response.error) throw response.error

  return { jobId: job.id, ...response.data }
}

export async function getVideoGenerationJobs() {
  const { data, error } = await supabase
    .from('video_generation_jobs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getVideoGenerationJob(jobId: string) {
  const { data, error } = await supabase
    .from('video_generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error) throw error
  return data
}

export async function subscribeToVideoJob(jobId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`video-job:${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'video_generation_jobs',
        filter: `id=eq.${jobId}`
      },
      callback
    )
    .subscribe()
}

export async function generateVideosFromProducts(products: any[]) {
  const results = []

  for (const product of products) {
    try {
      const heroImageUrl = product.cloned_product_images?.[0]?.image_url ||
                          product.generated_image_1 ||
                          product.image_url

      if (!heroImageUrl) {
        results.push({
          success: false,
          productId: product.id,
          error: 'No hero image found'
        })
        continue
      }

      const result = await generateProductVideo({
        clonedProductId: product.id,
        listingId: product.original_product_id || product.listing_id || product.id,
        productTitle: product.generated_title || product.product_title || 'Untitled Product',
        productDescription: product.generated_description || product.description,
        productTags: product.generated_tags || product.tags || [],
        heroImageUrl
      })

      results.push({
        success: true,
        productId: product.id,
        jobId: result.jobId
      })
    } catch (error) {
      results.push({
        success: false,
        productId: product.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}
