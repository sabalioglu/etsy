import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckSquare, Square, Grid3X3, List, Search, ArrowRight, AlertCircle } from 'lucide-react'
import Card from '../components/shared/Card'
import Button from '../components/shared/Button'
import Input from '../components/shared/Input'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import Badge from '../components/shared/Badge'
import { uploadProductCsv, processProductCsv, getProductDetails } from '../lib/api'

interface Product {
  id: string
  product_title: string
  description: string | null
  price: number | null
  images: Record<string, any> | null
  category: string | null
  marked_for_cloning: boolean
}

type ViewMode = 'grid' | 'list'

export function ProductSelection() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      setFilteredProducts(
        products.filter(
          (p) =>
            p.product_title.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query) ||
            p.category?.toLowerCase().includes(query)
        )
      )
    } else {
      setFilteredProducts(products)
    }
  }, [searchQuery, products])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    setError(null)
    setUploading(true)

    try {
      const upload = await uploadProductCsv(file)
      setProcessing(true)

      await processProductCsv(upload.id)

      const productsData = await getProductDetails(upload.id)
      setProducts(productsData)
      setProcessing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process CSV file')
      setProcessing(false)
    } finally {
      setUploading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p.id)))
    }
  }

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const handleProceedToClone = () => {
    if (selectedProducts.size === 0) {
      setError('Please select at least one product')
      return
    }
    // Store selected products in session storage for the clone page
    sessionStorage.setItem('selectedProducts', JSON.stringify(Array.from(selectedProducts)))
    navigate('/clone')
  }

  const getFirstImage = (images: Record<string, unknown> | null): string | null => {
    if (!images) return null
    const imageArray = Object.values(images)
    return imageArray.length > 0 ? (imageArray[0] as { url?: string })?.url || null : null
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Product Selection</h1>
        <p className="mt-2 text-gray-600">
          Upload a CSV file with product details and select products to clone
        </p>
      </div>

      {/* Upload area */}
      {products.length === 0 && (
        <Card className="p-8">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Product CSV
            </h3>
            <p className="text-gray-600 mb-4">
              Click to browse or drag and drop your CSV file here
            </p>
            <p className="text-sm text-gray-500">
              CSV should include: title, description, price, images, category
            </p>

            {uploading && (
              <div className="mt-6">
                <LoadingSpinner size="md" className="mx-auto" />
                <p className="text-sm text-gray-600 mt-2">
                  {processing ? 'Processing products...' : 'Uploading file...'}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-6 flex items-start justify-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Products view */}
      {products.length > 0 && (
        <>
          {/* Toolbar */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedProducts.size === filteredProducts.length ? (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
                <Badge status="completed">
                  {selectedProducts.size} of {filteredProducts.length} selected
                </Badge>
              </div>

              <div className="flex items-center space-x-4 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none sm:w-64">
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search className="w-4 h-4" />}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Products grid/list */}
          <Card className="p-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProducts.has(product.id)
                  const imageUrl = getFirstImage(product.images)

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product.id)}
                      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Selection indicator */}
                      <div className="absolute top-2 right-2 z-10">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-blue-600' : 'bg-white border-2 border-gray-300'
                          }`}
                        >
                          {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                        </div>
                      </div>

                      {/* Product image */}
                      <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.product_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            No image
                          </div>
                        )}
                      </div>

                      {/* Product info */}
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2">
                        {product.product_title}
                      </h3>
                      {product.category && (
                        <Badge status="completed" className="mb-2">
                          {product.category}
                        </Badge>
                      )}
                      {product.price && (
                        <p className="text-lg font-bold text-gray-900">
                          ${product.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProducts.has(product.id)
                  const imageUrl = getFirstImage(product.images)

                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product.id)}
                      className={`flex items-start space-x-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Selection indicator */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                          isSelected ? 'bg-blue-600' : 'bg-white border-2 border-gray-300'
                        }`}
                      >
                        {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                      </div>

                      {/* Product image */}
                      <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.product_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 mb-2">
                          {product.product_title}
                        </h3>
                        {product.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-3">
                          {product.category && (
                            <Badge status="completed">{product.category}</Badge>
                          )}
                          {product.price && (
                            <span className="text-lg font-bold text-gray-900">
                              ${product.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Action bar */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
              </div>
              <Button
                onClick={handleProceedToClone}
                disabled={selectedProducts.size === 0}
              >
                Proceed to Clone
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
