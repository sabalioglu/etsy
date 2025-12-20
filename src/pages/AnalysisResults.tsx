import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, TrendingUp, Star, Heart, ShoppingCart, Package, Filter, Search, ChevronDown } from 'lucide-react'
import Card from '../components/shared/Card'
import Button from '../components/shared/Button'
import Input from '../components/shared/Input'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import Badge, { type BadgeStatus } from '../components/shared/Badge'
import { getShopAnalysis, getAnalyzedProducts } from '../lib/api'
import { supabase } from '../lib/supabase'

interface AnalyzedProduct {
  id: string
  product_id: string
  product_title: string
  product_url: string
  price: number
  original_price: number
  discount_percentage: number
  image_url: string
  advanced_sales_score: number
  product_tier: string
  num_favorers: number
  num_favorers_source: string
  in_cart_count: number
  is_bestseller: boolean
  is_top_rated: boolean
  is_star_seller: boolean
  is_personalizable: boolean
  has_video: boolean
  has_free_shipping: boolean
  variation_count: number
  variations_text: string
  stock_quantity: number
  shop_sales: number
  shop_average_rating: number
  rating: number
  reviews_count: number
  listing_review_photo_count: number
  listing_review_video_count: number
  image_count: number
  last_sale_hours_ago: number
  listing_age_days: number
  processing_time_days: string
  create_date: string
  last_sale_date: string
}

interface Analysis {
  id: string
  shop_name: string
  shop_url: string
  total_products: number
  average_score: number
  status: string
  created_at: string
}

type TierFilter = 'all' | 'unicorn' | 'hot' | 'rising' | 'watch' | 'dead'
type SortOption = 'score-desc' | 'score-asc' | 'price-desc' | 'price-asc' | 'favorites-desc' | 'recent'

export function AnalysisResults() {
  const { analysisId } = useParams<{ analysisId: string }>()
  const navigate = useNavigate()

  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [products, setProducts] = useState<AnalyzedProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<AnalyzedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('score-desc')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (analysisId) {
      loadData()
    }
  }, [analysisId])

  useEffect(() => {
    applyFiltersAndSort()
  }, [products, searchQuery, tierFilter, sortOption])

  const loadData = async () => {
    try {
      setLoading(true)
      const [analysisData, productsData] = await Promise.all([
        getShopAnalysis(analysisId!),
        getAnalyzedProducts(analysisId!)
      ])
      setAnalysis(analysisData)
      setProducts(productsData)
    } catch (error) {
      console.error('Error loading analysis results:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...products]

    if (tierFilter !== 'all') {
      filtered = filtered.filter(p => {
        const tier = p.product_tier.toLowerCase()
        return tier.includes(tierFilter)
      })
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.product_title.toLowerCase().includes(query) ||
        p.product_id.toLowerCase().includes(query)
      )
    }

    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'score-desc':
          return b.advanced_sales_score - a.advanced_sales_score
        case 'score-asc':
          return a.advanced_sales_score - b.advanced_sales_score
        case 'price-desc':
          return b.price - a.price
        case 'price-asc':
          return a.price - b.price
        case 'favorites-desc':
          return b.num_favorers - a.num_favorers
        case 'recent':
          return new Date(b.create_date).getTime() - new Date(a.create_date).getTime()
        default:
          return 0
      }
    })

    setFilteredProducts(filtered)
  }

  const handleExportCSV = async () => {
    if (!analysis || !analysisId) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-analysis-csv`
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({
          analysisId,
          format: 'csv',
        }),
      })

      if (!response.ok) throw new Error('Failed to export analysis')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${analysis.shop_name.replace(/[^a-z0-9]/gi, '_')}_analysis_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV. Please try again.')
    }
  }

  const getTierBadge = (tier: string): BadgeStatus => {
    const lowerTier = tier.toLowerCase()
    if (lowerTier.includes('unicorn')) return 'completed'
    if (lowerTier.includes('hot')) return 'processing'
    if (lowerTier.includes('rising')) return 'pending'
    return 'failed'
  }

  const getTierIcon = (tier: string) => {
    const lowerTier = tier.toLowerCase()
    if (lowerTier.includes('unicorn')) return '🦄'
    if (lowerTier.includes('hot')) return '🔥'
    if (lowerTier.includes('rising')) return '📈'
    if (lowerTier.includes('watch')) return '👀'
    return '💀'
  }

  const calculateStats = () => {
    const stats = {
      unicorns: 0,
      hot: 0,
      rising: 0,
      watch: 0,
      dead: 0,
      bestsellers: 0,
      withVideo: 0,
      avgPrice: 0,
      totalPrice: 0,
      avgScore: 0,
      totalScore: 0,
    }

    products.forEach(p => {
      const tier = p.product_tier.toLowerCase()
      if (tier.includes('unicorn')) stats.unicorns++
      else if (tier.includes('hot')) stats.hot++
      else if (tier.includes('rising')) stats.rising++
      else if (tier.includes('watch')) stats.watch++
      else stats.dead++

      if (p.is_bestseller) stats.bestsellers++
      if (p.has_video) stats.withVideo++
      stats.totalPrice += p.price
      stats.totalScore += p.advanced_sales_score
    })

    stats.avgPrice = products.length > 0 ? stats.totalPrice / products.length : 0
    stats.avgScore = products.length > 0 ? stats.totalScore / products.length : 0

    return stats
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Analysis not found</p>
        <Button onClick={() => navigate('/history')} variant="secondary" className="mt-4">
          Back to History
        </Button>
      </div>
    )
  }

  const stats = calculateStats()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/history')}
            className="!p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{analysis.shop_name}</h1>
            <p className="text-gray-600 mt-1">
              Analysis Results - {products.length} products analyzed
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <a
            href={analysis.shop_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Shop
            </Button>
          </a>
          <Button onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">
              🦄
            </div>
            <div>
              <p className="text-sm text-gray-600">Unicorns</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unicorns}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-xl">
              🔥
            </div>
            <div>
              <p className="text-sm text-gray-600">Hot Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats.hot}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgScore.toFixed(0)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bestsellers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.bestsellers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-xl">
              💰
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Price</p>
              <p className="text-2xl font-bold text-gray-900">${stats.avgPrice.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 w-full sm:w-auto">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as TierFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Tiers</option>
              <option value="unicorn">🦄 Unicorns</option>
              <option value="hot">🔥 Hot</option>
              <option value="rising">📈 Rising</option>
              <option value="watch">👀 Watch</option>
              <option value="dead">💀 Dead</option>
            </select>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="score-desc">Highest Score</option>
              <option value="score-asc">Lowest Score</option>
              <option value="price-desc">Highest Price</option>
              <option value="price-asc">Lowest Price</option>
              <option value="favorites-desc">Most Favorites</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="text-sm text-gray-600 mb-2">
        Showing {filteredProducts.length} of {products.length} products
      </div>

      {filteredProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No products found</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-6">
                <img
                  src={product.image_url}
                  alt={product.product_title}
                  className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-2xl">{getTierIcon(product.product_tier)}</span>
                        <Badge status={getTierBadge(product.product_tier)}>
                          {product.product_tier}
                        </Badge>
                        <span className="text-xl font-bold text-blue-600">
                          {product.advanced_sales_score}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-lg mb-2">
                        {product.product_title}
                      </h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 mb-2">
                        <span className="flex items-center">
                          <Heart className="w-4 h-4 mr-1.5" />
                          {product.num_favorers.toLocaleString()} favorites
                          <span className="text-xs text-gray-400 ml-1">({product.num_favorers_source})</span>
                        </span>
                        <span className="flex items-center">
                          <ShoppingCart className="w-4 h-4 mr-1.5" />
                          {product.in_cart_count} in carts
                        </span>
                        <span className="flex items-center">
                          <Star className="w-4 h-4 mr-1.5" />
                          {product.rating ? product.rating.toFixed(1) : 'N/A'} ({product.reviews_count} reviews)
                        </span>
                        <span className="flex items-center">
                          {product.variations_text || 'No variations'}
                        </span>
                        <span className="flex items-center">
                          {product.image_count} images
                        </span>
                        {product.last_sale_hours_ago !== null && product.last_sale_hours_ago < 1000 && (
                          <span className="text-green-600">
                            Last sale: {product.last_sale_hours_ago < 1 ? '<1h' : `${product.last_sale_hours_ago}h`} ago
                          </span>
                        )}
                        {product.listing_age_days !== null && (
                          <span>
                            Age: {product.listing_age_days} days
                          </span>
                        )}
                        <span className="flex items-center">
                          Photo reviews: {product.listing_review_photo_count}
                        </span>
                        <span className="flex items-center">
                          Video reviews: {product.listing_review_video_count}
                        </span>
                        <span>
                          Stock: {product.stock_quantity}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-gray-900">
                        ${product.price.toFixed(2)}
                      </div>
                      {product.original_price && product.original_price > product.price && (
                        <>
                          <div className="text-sm text-gray-500 line-through">
                            ${product.original_price.toFixed(2)}
                          </div>
                          {product.discount_percentage && (
                            <div className="text-xs text-green-600 font-semibold">
                              {product.discount_percentage}% OFF
                            </div>
                          )}
                        </>
                      )}
                      {product.processing_time_days && (
                        <div className="text-xs text-gray-500 mt-1">
                          Processing: {product.processing_time_days}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 mb-3">
                    {product.is_bestseller && (
                      <Badge status="completed">Bestseller</Badge>
                    )}
                    {product.is_star_seller && (
                      <Badge status="completed">Star Seller</Badge>
                    )}
                    {product.is_top_rated && (
                      <Badge status="completed">Top Rated</Badge>
                    )}
                    {product.has_video && (
                      <Badge status="processing">Video</Badge>
                    )}
                    {product.has_free_shipping && (
                      <Badge status="pending">Free Ship</Badge>
                    )}
                    {product.is_personalizable && (
                      <Badge status="processing">Personalizable</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Shop Sales: {product.shop_sales.toLocaleString()}</span>
                      <span>Shop Rating: {product.shop_average_rating.toFixed(1)}</span>
                      <span>Listing ID: {product.product_id}</span>
                    </div>
                    <a
                      href={product.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="secondary" size="sm">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Product
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
