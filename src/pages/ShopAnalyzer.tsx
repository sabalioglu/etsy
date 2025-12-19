import { useState, useEffect } from 'react'
import { Search, Download, TrendingUp, Star, DollarSign, ShoppingBag, AlertCircle } from 'lucide-react'
import Card from '../components/shared/Card'
import Button from '../components/shared/Button'
import Input from '../components/shared/Input'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { analyzeShop, getAnalyzedProducts, subscribeToAnalysis } from '../lib/api'
import { supabase } from '../lib/supabase'

interface Product {
  id: string
  product_title: string
  product_url: string
  price: number | null
  original_price: number | null
  discount_percentage: number | null
  image_url: string | null
  rating: number | null
  reviews_count: number
  sales_count: number
  score: number
  tier: string | null
  marked_for_cloning: boolean
}

export function ShopAnalyzer() {
  const [shopName, setShopName] = useState('')
  const [numberOfProducts, setNumberOfProducts] = useState('50')
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (analysisId) {
      const channel = subscribeToAnalysis(analysisId, (payload) => {
        const analysis = payload.new
        if (analysis.status === 'completed') {
          setProgress(100)
          loadProducts(analysisId)
        } else if (analysis.status === 'failed') {
          setError(analysis.error_message || 'Analysis failed')
          setAnalyzing(false)
          setProgress(0)
        }
      })

      const pollInterval = setInterval(async () => {
        try {
          const { data } = await supabase
            .from('shop_analyses')
            .select('status, error_message')
            .eq('id', analysisId)
            .single()

          if (data?.status === 'completed') {
            setProgress(100)
            loadProducts(analysisId)
            clearInterval(pollInterval)
          } else if (data?.status === 'failed') {
            setError(data.error_message || 'Analysis failed')
            setAnalyzing(false)
            setProgress(0)
            clearInterval(pollInterval)
          }
        } catch (err) {
          console.error('Error polling analysis status:', err)
        }
      }, 3000)

      return () => {
        channel.then((c) => c.unsubscribe())
        clearInterval(pollInterval)
      }
    }
  }, [analysisId])

  const loadProducts = async (id: string) => {
    try {
      const data = await getAnalyzedProducts(id)
      setProducts(data)
      setAnalyzing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
      setAnalyzing(false)
    }
  }

  const handleAnalyze = async () => {
    if (!shopName.trim()) {
      setError('Please enter a shop name')
      return
    }

    const numProducts = parseInt(numberOfProducts)
    if (isNaN(numProducts) || numProducts < 1 || numProducts > 500) {
      setError('Number of products must be between 1 and 500')
      return
    }

    setError(null)
    setAnalyzing(true)
    setProgress(10)
    setProducts([])

    try {
      const shopUrl = `https://www.etsy.com/shop/${shopName}`
      const analysis = await analyzeShop(shopUrl, shopName, numProducts)
      setAnalysisId(analysis.id)

      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 10
        })
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis')
      setAnalyzing(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Title', 'URL', 'Price', 'Rating', 'Reviews', 'Sales', 'Score', 'Tier'],
      ...products.map((p) => [
        p.product_title,
        p.product_url,
        p.price?.toFixed(2) || '',
        p.rating?.toFixed(1) || '',
        p.reviews_count,
        p.sales_count,
        p.score.toFixed(2),
        p.tier || '',
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${shopName}_analysis.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getTierColor = (tier: string | null): string => {
    switch (tier) {
      case 'S':
        return 'bg-purple-100 text-purple-800'
      case 'A':
        return 'bg-blue-100 text-blue-800'
      case 'B':
        return 'bg-green-100 text-green-800'
      case 'C':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Shop Analyzer</h1>
        <p className="mt-2 text-gray-600">
          Analyze Etsy shops to find top-performing products
        </p>
      </div>

      {/* Analysis form */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shop Name
              </label>
              <Input
                placeholder="Enter Etsy shop name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                disabled={analyzing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Products
              </label>
              <Input
                type="number"
                placeholder="50"
                value={numberOfProducts}
                onChange={(e) => setNumberOfProducts(e.target.value)}
                disabled={analyzing}
                min="1"
                max="500"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full md:w-auto"
          >
            {analyzing ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Analyze Shop
              </>
            )}
          </Button>
        </div>

        {/* Progress indicator */}
        {analyzing && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
              <span>Analyzing products...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Results */}
      {products.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Analysis Results
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {products.length} products analyzed
              </p>
            </div>
            <Button variant="secondary" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-600 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Avg Score</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {(products.reduce((sum, p) => sum + p.score, 0) / products.length).toFixed(1)}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 text-green-600 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Avg Price</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${(products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length).toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center space-x-2 text-purple-600 mb-2">
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">Avg Rating</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {(products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length).toFixed(1)}
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center space-x-2 text-orange-600 mb-2">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-sm font-medium">Total Sales</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {products.reduce((sum, p) => sum + p.sales_count, 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Products table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Rating
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Reviews
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Sales
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                    Score
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                    Tier
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.product_title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <a
                            href={product.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block"
                          >
                            {product.product_title}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-gray-900">
                      ${product.price?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-900">
                          {product.rating?.toFixed(1) || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-gray-900">
                      {product.reviews_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-gray-900">
                      {product.sales_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {product.score.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${getTierColor(
                          product.tier
                        )}`}
                      >
                        {product.tier || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
