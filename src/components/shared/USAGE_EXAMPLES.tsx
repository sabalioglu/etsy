/**
 * USAGE EXAMPLES - Shared UI Components
 *
 * This file demonstrates real-world usage patterns for all shared components.
 * Copy and adapt these examples for your use case.
 */

import { useState } from 'react';
import { Search, Mail, Lock, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Badge,
  Modal,
  LoadingSpinner,
} from './index';

// ============================================
// Example 1: Product Creation Form
// ============================================

export function ProductCreationForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <Card
      header={<h2 className="text-xl font-bold">Create New Product</h2>}
      padding="lg"
    >
      <div className="space-y-4">
        <Input
          label="Product Name"
          placeholder="Enter product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          helperText="3-100 characters recommended"
        />

        <Input
          label="Email"
          type="email"
          placeholder="seller@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          icon={<Mail className="w-4 h-4" />}
        />

        <div className="flex gap-2 pt-4">
          <Button variant="secondary" disabled={isLoading}>
            Cancel
          </Button>
          <Button loading={isLoading} onClick={handleSubmit}>
            {isLoading ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// Example 2: Product List with Status Badges
// ============================================

interface Product {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  price: number;
}

export function ProductList() {
  const [products] = useState<Product[]>([
    {
      id: '1',
      name: 'Handmade Ceramics',
      status: 'completed',
      price: 45.99,
    },
    {
      id: '2',
      name: 'Vintage Books Set',
      status: 'processing',
      price: 32.5,
    },
    {
      id: '3',
      name: 'Custom Jewelry',
      status: 'pending',
      price: 89.99,
    },
    {
      id: '4',
      name: 'Broken Item',
      status: 'failed',
      price: 0,
    },
  ]);

  return (
    <div className="space-y-3">
      {products.map((product) => (
        <Card key={product.id} padding="md">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-600">${product.price.toFixed(2)}</p>
            </div>
            <Badge status={product.status} />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// Example 3: Search with Loading State
// ============================================

export function ProductSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setIsSearching(true);
      // Simulate search delay
      setTimeout(() => setIsSearching(false), 1500);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="Search Products"
        placeholder="Search by name, SKU, or ID..."
        icon={<Search className="w-4 h-4" />}
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />

      {isSearching && (
        <div className="flex items-center gap-2 text-gray-600">
          <LoadingSpinner size="sm" />
          <span>Searching...</span>
        </div>
      )}

      {query && !isSearching && (
        <div className="text-sm text-gray-600">
          Found 5 products matching "{query}"
        </div>
      )}
    </div>
  );
}

// ============================================
// Example 4: Confirmation Dialog
// ============================================

export function DeleteProductDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    // Simulate deletion
    setTimeout(() => {
      setIsDeleting(false);
      setIsOpen(false);
    }, 1500);
  };

  return (
    <>
      <Button variant="danger" onClick={() => setIsOpen(true)}>
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Product
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Delete Product"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-gray-700">
            Are you sure you want to delete this product?
          </p>
          <p className="text-sm text-red-600 font-medium">
            This action cannot be undone.
          </p>
        </div>
      </Modal>
    </>
  );
}

// ============================================
// Example 5: Login Form
// ============================================

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate login
    setTimeout(() => {
      if (!email.includes('@')) {
        setError('Invalid email format');
      }
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card padding="lg" className="w-full max-w-md">
        <form onSubmit={handleLogin} className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Login</h2>

          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />

          <Button fullWidth loading={isLoading} type="submit">
            Sign In
          </Button>

          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </p>
        </form>
      </Card>
    </div>
  );
}

// ============================================
// Example 6: Product Bulk Actions
// ============================================

export function BulkActionsBar() {
  const [isProcessing, setIsProcessing] = useState(false);
  const selectedCount = 5;

  const handlePublishAll = async () => {
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 2000);
  };

  return (
    <Card padding="md" className="bg-blue-50 border-blue-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{selectedCount} products selected</p>
          <p className="text-sm text-gray-600">Perform batch operations</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={isProcessing}
          >
            Duplicate
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isProcessing}
          >
            Archive
          </Button>
          <Button
            size="sm"
            loading={isProcessing}
            onClick={handlePublishAll}
          >
            {isProcessing ? 'Publishing...' : 'Publish All'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// Example 7: Order Status Timeline
// ============================================

export function OrderStatusTimeline() {
  const statuses: Array<{
    label: string;
    status: 'completed' | 'processing' | 'pending' | 'failed';
  }> = [
    { label: 'Order Placed', status: 'completed' },
    { label: 'Payment Confirmed', status: 'completed' },
    { label: 'Processing', status: 'processing' },
    { label: 'Shipped', status: 'pending' },
    { label: 'Delivered', status: 'pending' },
  ];

  return (
    <Card header={<h3 className="font-semibold">Order Status</h3>}>
      <div className="space-y-3">
        {statuses.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <Badge status={item.status} label="" />
            <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================
// Example 8: Loading Page State
// ============================================

export function ProductDetailsLoading() {
  return (
    <div className="space-y-4">
      <Card>
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2" />
      </Card>
      <LoadingSpinner centered text="Loading product details..." />
    </div>
  );
}

// ============================================
// Export all examples for testing
// ============================================

export function ComponentShowcase() {
  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <section>
        <h2 className="text-2xl font-bold mb-4">Product Creation Form</h2>
        <ProductCreationForm />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Product List</h2>
        <ProductList />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Search</h2>
        <ProductSearch />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Delete Dialog</h2>
        <DeleteProductDialog />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Bulk Actions</h2>
        <BulkActionsBar />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Order Timeline</h2>
        <OrderStatusTimeline />
      </section>
    </div>
  );
}
