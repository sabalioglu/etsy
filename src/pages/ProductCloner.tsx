import { useState, useEffect } from 'react'
import { Sparkles, Settings, Eye, Download, CheckCircle, XCircle, Loader2, Image as ImageIcon } from 'lucide-react'
import Card from '../components/shared/Card'
import Button from '../components/shared/Button'
import Badge, { type BadgeStatus } from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import { cloneProducts, getClonedProducts, subscribeToClonedProducts } from '../lib/api'
import { supabase } from '../lib/supabase'

interface ClonedProduct {
  id: string
  original_product_id: string | null
  generated_title: string | null
  generated_description: string | null
  generated_tags: string[] | null
  ai_model_used: string
  status: 'generating' | 'completed' | 'failed'
  error_message: string | null
  cloned_product_images?: Array<{
    id: string
    variation_name: string | null
    prompt_used: string | null
    image_url: string
  }>
}

interface AISettings {
  model: string
  creativity: number
  includeImages: boolean
}

export function ProductCloner() {
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [clonedProducts, setClonedProducts] = useState<ClonedProduct[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [aiSettings, setAiSettings] = useState<AISettings>({
    model: 'gpt-4',
    creativity: 0.7,
    includeImages: true,
  })
  const [showSettings, setShowSettings] = useState(false)
  const [previewProduct, setPreviewProduct] = useState<ClonedProduct | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadUserAndProducts()

    // Get selected products from session storage
    const stored = sessionStorage.getItem('selectedProducts')
    if (stored) {
      setSelectedProductIds(JSON.parse(stored))
    }
  }, [])

  useEffect(() => {
    if (userId) {
      const channel = subscribeToClonedProducts(userId, (payload) => {
        const newProduct = payload.new as ClonedProduct
        setClonedProducts((prev) => [newProduct, ...prev])

        if (newProduct.status === 'completed' || newProduct.status === 'failed') {
          setProgress((prev) => prev + (100 / selectedProductIds.length))
        }
      })

      return () => {
        channel.then((c) => c.unsubscribe())
      }
    }
  }, [userId, selectedProductIds.length])

  const loadUserAndProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }

      const products = await getClonedProducts()
      setClonedProducts(products)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleStartCloning = async () => {
    if (selectedProductIds.length === 0) {
      return
    }

    setProcessing(true)
    setProgress(0)

    try {
      await cloneProducts(selectedProductIds)
    } catch (error) {
      console.error('Error cloning products:', error)
    }
  }

  const handleExport = (product: ClonedProduct) => {
    const data = {
      title: product.generated_title,
      description: product.generated_description,
      tags: product.generated_tags,
      images: product.cloned_product_images?.map((img) => ({
        url: img.image_url,
        variation: img.variation_name,
      })),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cloned_product_${product.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string): BadgeStatus => {
    switch (status) {
      case 'completed':
        return 'completed'
      case 'generating':
        return 'processing'
      case 'failed':
        return 'failed'
      default:
        return 'pending'
    }
  }

  const completedCount = clonedProducts.filter((p) => p.status === 'completed').length
  const failedCount = clonedProducts.filter((p) => p.status === 'failed').length
  const processingCount = clonedProducts.filter((p) => p.status === 'generating').length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Product Cloner</h1>
        <p className="mt-2 text-gray-600">
          Generate AI-powered product listings with unique titles, descriptions, and images
        </p>
      </div>

      {/* Queue and settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cloning Queue</h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} ready to clone
              </p>
            </div>
            <Button
              onClick={handleStartCloning}
              disabled={processing || selectedProductIds.length === 0}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cloning...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Cloning
                </>
              )}
            </Button>
          </div>

          {processing && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                <span>Generating products...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Completed</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{completedCount}</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Loader2 className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Processing</span>
              </div>
              <p className="text-2xl font-bold text-yellow-900">{processingCount}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-900">{failedCount}</p>
            </div>
          </div>

          {/* Message when no products selected */}
          {selectedProductIds.length === 0 && !processing && clonedProducts.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No products selected</p>
              <p className="text-sm text-gray-500 mt-1">
                Go to Product Selection to choose products to clone
              </p>
            </div>
          )}
        </Card>

        {/* AI Settings */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">AI Settings</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Model
              </label>
              <select
                value={aiSettings.model}
                onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={processing}
              >
                <option value="gpt-4">GPT-4 (Best quality)</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
                <option value="claude-3">Claude 3 (Creative)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Creativity Level: {aiSettings.creativity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={aiSettings.creativity}
                onChange={(e) =>
                  setAiSettings({ ...aiSettings, creativity: parseFloat(e.target.value) })
                }
                className="w-full"
                disabled={processing}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Conservative</span>
                <span>Creative</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Generate Images</p>
                <p className="text-xs text-gray-600">Use AI to create product images</p>
              </div>
              <input
                type="checkbox"
                checked={aiSettings.includeImages}
                onChange={(e) =>
                  setAiSettings({ ...aiSettings, includeImages: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                disabled={processing}
              />
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Estimated Cost</h3>
              <p className="text-2xl font-bold text-blue-900">
                ${(selectedProductIds.length * 0.15).toFixed(2)}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Based on {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Cloned products */}
      {clonedProducts.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated Products</h2>
          <div className="space-y-4">
            {clonedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Product preview */}
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {product.cloned_product_images?.[0] ? (
                    <img
                      src={product.cloned_product_images[0].image_url}
                      alt={product.generated_title || 'Product'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 line-clamp-1">
                      {product.generated_title || 'Generating...'}
                    </h3>
                    <Badge status={getStatusBadge(product.status)} />
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {product.generated_description || 'Generating description...'}
                  </p>
                  {product.generated_tags && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {product.generated_tags.slice(0, 5).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Model: {product.ai_model_used}</span>
                    {product.cloned_product_images && (
                      <span className="text-xs text-gray-500">
                        • {product.cloned_product_images.length} image{product.cloned_product_images.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {product.error_message && (
                    <p className="text-sm text-red-600 mt-2">{product.error_message}</p>
                  )}
                </div>

                {/* Actions */}
                {product.status === 'completed' && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPreviewProduct(product)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleExport(product)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Preview modal */}
      {previewProduct && (
        <Modal
          isOpen={!!previewProduct}
          onClose={() => setPreviewProduct(null)}
          title="Product Preview"
          size="lg"
        >
          <div className="space-y-6">
            {/* Images */}
            {previewProduct.cloned_product_images && previewProduct.cloned_product_images.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Images</h3>
                <div className="grid grid-cols-2 gap-4">
                  {previewProduct.cloned_product_images.map((image) => (
                    <div key={image.id} className="space-y-2">
                      <img
                        src={image.image_url}
                        alt={image.variation_name || 'Product'}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      {image.variation_name && (
                        <p className="text-sm text-gray-600">{image.variation_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Title</h3>
              <p className="text-gray-800">{previewProduct.generated_title}</p>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-800 whitespace-pre-wrap">
                {previewProduct.generated_description}
              </p>
            </div>

            {/* Tags */}
            {previewProduct.generated_tags && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {previewProduct.generated_tags.map((tag, idx) => (
                    <Badge key={idx} status="completed">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setPreviewProduct(null)}>
                Close
              </Button>
              <Button onClick={() => handleExport(previewProduct)}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
