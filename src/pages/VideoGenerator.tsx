import { useState, useEffect } from 'react'
import { Video, Play, CheckCircle, XCircle, Loader2, Download, Eye } from 'lucide-react'
import Card from '../components/shared/Card'
import Button from '../components/shared/Button'
import Badge, { type BadgeStatus } from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import {
  getClonedProducts,
  generateVideosFromProducts,
  getVideoGenerationJobs,
  subscribeToVideoJob
} from '../lib/api'
import { supabase } from '../lib/supabase'

interface ClonedProduct {
  id: string
  generated_title: string | null
  generated_description: string | null
  generated_tags: string[] | null
  status: string
  cloned_product_images?: Array<{
    id: string
    image_url: string
  }>
}

interface VideoJob {
  id: string
  listing_id: string
  product_title: string
  hero_image_url: string
  edited_image_url: string | null
  video_script: string | null
  video_url: string | null
  thumbnail_url: string | null
  status: string
  human_detected: boolean
  image_edited: boolean
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export function VideoGenerator() {
  const [products, setProducts] = useState<ClonedProduct[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>([])
  const [processing, setProcessing] = useState(false)
  const [previewVideo, setPreviewVideo] = useState<VideoJob | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (userId && videoJobs.length > 0) {
      const activeJobs = videoJobs.filter(j => j.status !== 'completed' && j.status !== 'failed')

      const subscriptions = activeJobs.map(job =>
        subscribeToVideoJob(job.id, (payload) => {
          const updatedJob = payload.new as VideoJob
          setVideoJobs(prev =>
            prev.map(j => j.id === updatedJob.id ? updatedJob : j)
          )
        })
      )

      return () => {
        Promise.all(subscriptions).then(channels =>
          channels.forEach(channel => channel.unsubscribe())
        )
      }
    }
  }, [userId, videoJobs.length])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }

      const [productsData, jobsData] = await Promise.all([
        getClonedProducts(),
        getVideoGenerationJobs()
      ])

      const completedProducts = productsData.filter(p => p.status === 'completed')
      setProducts(completedProducts)
      setVideoJobs(jobsData)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSelectProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSelectAll = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([])
    } else {
      setSelectedProductIds(products.map(p => p.id))
    }
  }

  const handleGenerateVideos = async () => {
    if (selectedProductIds.length === 0) return

    setProcessing(true)

    try {
      const selectedProducts = products.filter(p => selectedProductIds.includes(p.id))
      const results = await generateVideosFromProducts(selectedProducts)

      console.log('Video generation started:', results)

      await loadData()
      setSelectedProductIds([])
    } catch (error) {
      console.error('Error generating videos:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleDownloadVideo = (videoUrl: string, productTitle: string) => {
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = `${productTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`
    link.click()
  }

  const getStatusBadge = (status: string): BadgeStatus => {
    switch (status) {
      case 'completed':
        return 'completed'
      case 'failed':
        return 'failed'
      case 'pending':
      case 'detecting_human':
      case 'editing_image':
      case 'generating_script':
      case 'generating_video':
        return 'processing'
      default:
        return 'pending'
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Queued'
      case 'detecting_human':
        return 'Analyzing image'
      case 'editing_image':
        return 'Editing image'
      case 'generating_script':
        return 'Writing script'
      case 'generating_video':
        return 'Creating video'
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      default:
        return status
    }
  }

  const completedCount = videoJobs.filter(j => j.status === 'completed').length
  const failedCount = videoJobs.filter(j => j.status === 'failed').length
  const processingCount = videoJobs.filter(j =>
    !['completed', 'failed'].includes(j.status)
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Video Generator</h1>
        <p className="mt-2 text-gray-600">
          Create UGC-style marketing videos for your products automatically
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Select Products</h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSelectAll}
                disabled={processing || products.length === 0}
              >
                {selectedProductIds.length === products.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                onClick={handleGenerateVideos}
                disabled={processing || selectedProductIds.length === 0}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Generate Videos
                  </>
                )}
              </Button>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No products available</p>
              <p className="text-sm text-gray-500 mt-1">
                Clone some products first to generate videos
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-start space-x-4 p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedProductIds.includes(product.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectProduct(product.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(product.id)}
                    onChange={() => handleSelectProduct(product.id)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.cloned_product_images?.[0] ? (
                      <img
                        src={product.cloned_product_images[0].image_url}
                        alt={product.generated_title || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Video className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 line-clamp-1">
                      {product.generated_title || 'Untitled Product'}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                      {product.generated_description || 'No description'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Video Stats</h2>
          <div className="space-y-4">
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

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Estimated Cost</h3>
            <p className="text-2xl font-bold text-blue-900">
              ${(selectedProductIds.length * 0.25).toFixed(2)}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Based on {selectedProductIds.length} video{selectedProductIds.length !== 1 ? 's' : ''}
            </p>
          </div>
        </Card>
      </div>

      {videoJobs.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Video Generation Jobs</h2>
          <div className="space-y-4">
            {videoJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {job.video_url ? (
                    <video
                      src={job.video_url}
                      className="w-full h-full object-cover"
                      poster={job.thumbnail_url || undefined}
                    />
                  ) : (
                    <img
                      src={job.edited_image_url || job.hero_image_url}
                      alt={job.product_title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 line-clamp-1">
                      {job.product_title}
                    </h3>
                    <Badge status={getStatusBadge(job.status)}>
                      {getStatusText(job.status)}
                    </Badge>
                  </div>

                  {job.video_script && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {job.video_script}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    {job.human_detected && (
                      <span className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Human detected
                      </span>
                    )}
                    {job.image_edited && (
                      <span className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Image edited
                      </span>
                    )}
                  </div>

                  {job.error_message && (
                    <p className="text-sm text-red-600 mt-2">{job.error_message}</p>
                  )}
                </div>

                {job.status === 'completed' && job.video_url && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPreviewVideo(job)}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadVideo(job.video_url!, job.product_title)}
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

      {previewVideo && (
        <Modal
          isOpen={!!previewVideo}
          onClose={() => setPreviewVideo(null)}
          title="Video Preview"
          size="lg"
        >
          <div className="space-y-4">
            <video
              src={previewVideo.video_url!}
              controls
              autoPlay
              className="w-full rounded-lg"
              poster={previewVideo.thumbnail_url || undefined}
            />

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Product Title</h3>
              <p className="text-gray-800">{previewVideo.product_title}</p>
            </div>

            {previewVideo.video_script && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Video Script</h3>
                <p className="text-gray-800 text-sm">{previewVideo.video_script}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setPreviewVideo(null)}>
                Close
              </Button>
              <Button onClick={() => handleDownloadVideo(previewVideo.video_url!, previewVideo.product_title)}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
