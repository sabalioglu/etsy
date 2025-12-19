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
