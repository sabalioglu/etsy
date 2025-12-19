import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Package, Copy, Clock, ArrowRight, Search, Upload } from 'lucide-react'
import Card from '../components/shared/Card'
import Button from '../components/shared/Button'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import Badge, { type BadgeStatus } from '../components/shared/Badge'
import { getShopAnalyses, getClonedProducts } from '../lib/api'

interface Stats {
  totalAnalyses: number
  totalProducts: number
  totalCloned: number
  recentActivity: number
}

interface Activity {
  id: string
  type: 'analysis' | 'clone' | 'upload'
  title: string
  description: string
  timestamp: string
  status: 'completed' | 'processing' | 'failed'
}

export function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({
    totalAnalyses: 0,
    totalProducts: 0,
    totalCloned: 0,
    recentActivity: 0,
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [analyses, clonedProducts] = await Promise.all([
        getShopAnalyses(),
        getClonedProducts(),
      ])

      // Calculate stats
      const totalProducts = analyses.reduce((sum, a) => sum + a.total_products, 0)
      setStats({
        totalAnalyses: analyses.length,
        totalProducts,
        totalCloned: clonedProducts.length,
        recentActivity: analyses.filter(
          (a) => new Date(a.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
      })

      // Build activity list
      const recentActivities: Activity[] = []

      // Add analyses
      analyses.slice(0, 5).forEach((analysis) => {
        recentActivities.push({
          id: analysis.id,
          type: 'analysis',
          title: `Analyzed ${analysis.shop_name}`,
          description: `${analysis.total_products} products analyzed`,
          timestamp: analysis.created_at,
          status: analysis.status as any,
        })
      })

      // Add clones
      clonedProducts.slice(0, 5).forEach((product) => {
        recentActivities.push({
          id: product.id,
          type: 'clone',
          title: 'Product Cloned',
          description: product.generated_title || 'New product',
          timestamp: product.created_at,
          status: product.status as any,
        })
      })

      // Sort by timestamp
      recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setActivities(recentActivities.slice(0, 10))
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  const getStatusBadge = (status: string): BadgeStatus => {
    switch (status) {
      case 'completed':
        return 'completed'
      case 'processing':
        return 'processing'
      case 'failed':
        return 'failed'
      case 'pending':
        return 'pending'
      default:
        return 'pending'
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of your Etsy product management activities
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Analyses</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalAnalyses}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            {stats.recentActivity} this week
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Products Analyzed</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Across all shops
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Products Cloned</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalCloned}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Copy className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Ready to list
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Activity</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{activities.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Last 30 days
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="secondary"
            className="justify-start h-auto py-4"
            onClick={() => navigate('/analyze')}
          >
            <div className="flex items-center w-full">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900">Analyze Shop</div>
                <div className="text-sm text-gray-600">Find top products</div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </Button>

          <Button
            variant="secondary"
            className="justify-start h-auto py-4"
            onClick={() => navigate('/products')}
          >
            <div className="flex items-center w-full">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <Upload className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900">Upload Products</div>
                <div className="text-sm text-gray-600">From CSV file</div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </Button>

          <Button
            variant="secondary"
            className="justify-start h-auto py-4"
            onClick={() => navigate('/clone')}
          >
            <div className="flex items-center w-full">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <Copy className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900">Clone Products</div>
                <div className="text-sm text-gray-600">Generate listings</div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </Button>
        </div>
      </Card>

      {/* Recent activity */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
            View All
          </Button>
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No recent activity</p>
            <p className="text-sm text-gray-500 mt-1">Start by analyzing a shop</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activity.type === 'analysis' ? 'bg-blue-100' :
                  activity.type === 'clone' ? 'bg-green-100' : 'bg-purple-100'
                }`}>
                  {activity.type === 'analysis' && <Search className="w-5 h-5 text-blue-600" />}
                  {activity.type === 'clone' && <Copy className="w-5 h-5 text-green-600" />}
                  {activity.type === 'upload' && <Upload className="w-5 h-5 text-purple-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <Badge status={getStatusBadge(activity.status)} />
                  </div>
                  <p className="text-sm text-gray-600 truncate">{activity.description}</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatTimestamp(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
