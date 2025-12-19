import { useState, useEffect } from 'react'
import { Search, Calendar, Filter, Download, ExternalLink, Clock, TrendingUp, Copy, Upload } from 'lucide-react'
import Card from '../components/shared/Card'
import Button from '../components/shared/Button'
import Input from '../components/shared/Input'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import Badge, { type BadgeStatus } from '../components/shared/Badge'
import { getShopAnalyses, getProductUploads, getClonedProducts } from '../lib/api'
import { supabase } from '../lib/supabase'

interface HistoryItem {
  id: string
  type: 'analysis' | 'upload' | 'clone'
  title: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  timestamp: string
  metadata?: Record<string, any>
}

type FilterType = 'all' | 'analysis' | 'upload' | 'clone'
type FilterStatus = 'all' | 'completed' | 'processing' | 'failed'

export function History() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchQuery, filterType, filterStatus, items])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const [analyses, uploads, clones] = await Promise.all([
        getShopAnalyses(),
        getProductUploads(),
        getClonedProducts(),
      ])

      const historyItems: HistoryItem[] = []

      // Add analyses
      analyses.forEach((analysis) => {
        historyItems.push({
          id: analysis.id,
          type: 'analysis',
          title: `Shop Analysis: ${analysis.shop_name}`,
          description: `${analysis.total_products} products analyzed`,
          status: analysis.status as any,
          timestamp: analysis.created_at,
          metadata: {
            shopName: analysis.shop_name,
            shopUrl: analysis.shop_url,
            totalProducts: analysis.total_products,
            averageScore: analysis.average_score,
            exportUrl: analysis.export_file_url,
          },
        })
      })

      // Add uploads
      uploads.forEach((upload) => {
        historyItems.push({
          id: upload.id,
          type: 'upload',
          title: `Product Upload: ${upload.file_name}`,
          description: `${upload.products_count} products uploaded`,
          status: upload.status as any,
          timestamp: upload.created_at,
          metadata: {
            fileName: upload.file_name,
            fileUrl: upload.file_url,
            productsCount: upload.products_count,
            productsProcessed: upload.products_processed,
          },
        })
      })

      // Add clones
      clones.forEach((clone) => {
        historyItems.push({
          id: clone.id,
          type: 'clone',
          title: clone.generated_title || 'Product Clone',
          description: `Cloned with ${clone.ai_model_used}`,
          status: clone.status === 'generating' ? 'processing' : clone.status as any,
          timestamp: clone.created_at,
          metadata: {
            aiModel: clone.ai_model_used,
            generatedTitle: clone.generated_title,
            generatedDescription: clone.generated_description,
            tags: clone.generated_tags,
          },
        })
      })

      // Sort by timestamp (newest first)
      historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setItems(historyItems)
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = items

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((item) => item.type === filterType)
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((item) => item.status === filterStatus)
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      )
    }

    setFilteredItems(filtered)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return <TrendingUp className="w-5 h-5" />
      case 'upload':
        return <Upload className="w-5 h-5" />
      case 'clone':
        return <Copy className="w-5 h-5" />
      default:
        return <Clock className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'analysis':
        return 'bg-blue-100 text-blue-600'
      case 'upload':
        return 'bg-purple-100 text-purple-600'
      case 'clone':
        return 'bg-green-100 text-green-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusBadge = (status: string): BadgeStatus => {
    switch (status) {
      case 'completed':
        return 'completed'
      case 'processing':
        return 'processing'
      case 'pending':
        return 'pending'
      case 'failed':
        return 'failed'
      default:
        return 'pending'
    }
  }

  const handleExport = () => {
    const csv = [
      ['Type', 'Title', 'Description', 'Status', 'Date'],
      ...filteredItems.map((item) => [
        item.type,
        item.title,
        item.description,
        item.status,
        formatTimestamp(item.timestamp),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `history_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportAnalysis = async (analysisId: string, shopName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

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

      if (!response.ok) {
        throw new Error('Failed to export analysis')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${shopName.replace(/[^a-z0-9]/gi, '_')}_analysis_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting analysis:', error)
      alert('Failed to export analysis. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">History</h1>
          <p className="mt-2 text-gray-600">
            View all your analyses, uploads, and cloned products
          </p>
        </div>
        <Button onClick={handleExport} variant="secondary" className="mt-4 sm:mt-0">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-xl font-bold text-gray-900">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Analyses</p>
              <p className="text-xl font-bold text-gray-900">
                {items.filter((i) => i.type === 'analysis').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Uploads</p>
              <p className="text-xl font-bold text-gray-900">
                {items.filter((i) => i.type === 'upload').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Copy className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Clones</p>
              <p className="text-xl font-bold text-gray-900">
                {items.filter((i) => i.type === 'clone').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="analysis">Shop Analysis</option>
                <option value="upload">Product Upload</option>
                <option value="clone">Product Clone</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* History list */}
      <Card className="p-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No history items found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Start by analyzing a shop or uploading products'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(item.type)}`}>
                  {getTypeIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-medium text-gray-900 truncate">
                      {item.title}
                    </h3>
                    <Badge status={getStatusBadge(item.status)} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatTimestamp(item.timestamp)}
                    </span>
                    {item.type === 'analysis' && item.status === 'completed' && (
                      <button
                        onClick={() => handleExportAnalysis(item.id, item.metadata?.shopName || 'shop')}
                        className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Export CSV
                      </button>
                    )}
                    {item.type === 'analysis' && item.metadata?.shopUrl && (
                      <a
                        href={item.metadata.shopUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Shop
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
