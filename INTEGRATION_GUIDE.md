# Edge Functions Integration Guide

Quick reference for integrating the Etsy Product Management Platform Edge Functions into your React frontend.

## Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Initialize Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

## Frontend Integration Examples

### Workflow 1: Shop Analysis

```typescript
// Hook for shop analysis
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AnalyzeShopParams {
  shopName: string;
  numberOfProducts: number;
}

export function useAnalyzeShop() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeShop = async ({ shopName, numberOfProducts }: AnalyzeShopParams) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-shop`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ shopName, numberOfProducts }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze shop');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { analyzeShop, loading, error };
}

// Component usage
function ShopAnalysisForm() {
  const { analyzeShop, loading, error } = useAnalyzeShop();
  const [shopName, setShopName] = useState('');
  const [numberOfProducts, setNumberOfProducts] = useState(50);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await analyzeShop({ shopName, numberOfProducts });
      console.log('Analysis complete:', result);
      // Handle success - navigate to results page, show toast, etc.
    } catch (err) {
      // Error is already set in the hook
      console.error('Analysis failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={shopName}
        onChange={(e) => setShopName(e.target.value)}
        placeholder="Shop Name"
        required
      />
      <input
        type="number"
        value={numberOfProducts}
        onChange={(e) => setNumberOfProducts(Number(e.target.value))}
        min={1}
        max={100}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze Shop'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### Workflow 2: CSV Processing

```typescript
// Hook for CSV processing
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useProcessProductCsv() {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadAndProcessCsv = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // 1. Upload file to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('product-uploads')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Get file URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-uploads')
        .getPublicUrl(fileName);

      // 3. Create upload record
      const { data: upload, error: dbError } = await supabase
        .from('product_uploads')
        .insert({
          file_name: file.name,
          file_url: publicUrl,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Failed to create upload record: ${dbError.message}`);
      }

      setUploading(false);
      setProcessing(true);

      // 4. Call Edge Function to process CSV
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-product-csv`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uploadId: upload.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process CSV');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  return { uploadAndProcessCsv, uploading, processing, error };
}

// Component usage
function CsvUploadForm() {
  const { uploadAndProcessCsv, uploading, processing, error } = useProcessProductCsv();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) return;

    try {
      const result = await uploadAndProcessCsv(selectedFile);
      console.log('Processing complete:', result);
      // Handle success
    } catch (err) {
      console.error('Processing failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        required
      />
      <button type="submit" disabled={uploading || processing || !selectedFile}>
        {uploading ? 'Uploading...' : processing ? 'Processing...' : 'Upload & Process'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### Workflow 3: Product Cloning

```typescript
// Hook for product cloning
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CloneProductsParams {
  productIds: string[];
}

export function useCloneProducts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cloneProducts = async ({ productIds }: CloneProductsParams) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clone-products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productIds }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clone products');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { cloneProducts, loading, error };
}

// Component usage
function ProductCloningButton({ selectedProducts }: { selectedProducts: string[] }) {
  const { cloneProducts, loading, error } = useCloneProducts();

  const handleClone = async () => {
    try {
      const result = await cloneProducts({ productIds: selectedProducts });
      console.log('Cloning complete:', result);
      // Handle success - show results, navigate, etc.
    } catch (err) {
      console.error('Cloning failed:', err);
    }
  };

  return (
    <>
      <button
        onClick={handleClone}
        disabled={loading || selectedProducts.length === 0}
      >
        {loading ? 'Cloning...' : `Clone ${selectedProducts.length} Products`}
      </button>
      {error && <div className="error">{error}</div>}
    </>
  );
}
```

## Real-time Progress Tracking

Use Supabase Realtime to track processing progress:

```typescript
// Subscribe to shop analysis updates
function useShopAnalysisProgress(analysisId: string) {
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    if (!analysisId) return;

    const channel = supabase
      .channel(`shop-analysis-${analysisId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shop_analyses',
          filter: `id=eq.${analysisId}`,
        },
        (payload) => {
          setProgress(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [analysisId]);

  return progress;
}

// Subscribe to CSV processing progress
function useCsvProcessingProgress(uploadId: string) {
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    if (!uploadId) return;

    const channel = supabase
      .channel(`csv-processing-${uploadId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'product_uploads',
          filter: `id=eq.${uploadId}`,
        },
        (payload) => {
          setProgress(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uploadId]);

  return progress;
}
```

## Error Handling Best Practices

```typescript
// Centralized error handler
function handleEdgeFunctionError(error: any) {
  if (error.message.includes('JWT')) {
    // Token expired - redirect to login
    window.location.href = '/login';
    return;
  }

  if (error.message.includes('rate limit')) {
    // Show rate limit message
    toast.error('Rate limit exceeded. Please try again later.');
    return;
  }

  // Generic error
  toast.error(error.message || 'An error occurred');
}

// Usage in components
try {
  await analyzeShop({ shopName, numberOfProducts });
} catch (error) {
  handleEdgeFunctionError(error);
}
```

## Testing

### Mock Edge Function Responses

```typescript
// For testing without calling real Edge Functions
const mockAnalyzeShopResponse = {
  success: true,
  data: {
    shopAnalysisId: 'test-id',
    shopName: 'TestShop',
    totalProducts: 10,
    averageScore: 75.5,
    products: [
      {
        productId: 'prod-1',
        title: 'Test Product',
        score: 85,
        tier: 'A',
        // ... other fields
      },
    ],
    tierDistribution: {
      S: 2,
      A: 3,
      B: 3,
      C: 2,
      D: 0,
    },
  },
};

// Use in tests
if (import.meta.env.MODE === 'test') {
  return mockAnalyzeShopResponse;
}
```

## Performance Optimization

### 1. Debounce API Calls

```typescript
import { debounce } from 'lodash';

const debouncedAnalyze = debounce(async (params) => {
  await analyzeShop(params);
}, 500);
```

### 2. Implement Request Cancellation

```typescript
const abortControllerRef = useRef<AbortController>();

const analyzeShop = async (params: AnalyzeShopParams) => {
  // Cancel previous request
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  const controller = new AbortController();
  abortControllerRef.current = controller;

  const response = await fetch(url, {
    signal: controller.signal,
    // ... other options
  });
};
```

### 3. Cache Results

```typescript
// Simple in-memory cache
const cache = new Map<string, any>();

const getCachedOrFetch = async (key: string, fetcher: () => Promise<any>) => {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = await fetcher();
  cache.set(key, result);
  return result;
};
```

## Environment Variables

Add to your `.env` file:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## TypeScript Types

Create a shared types file for Edge Function responses:

```typescript
// src/types/edge-functions.ts

export interface AnalyzeShopResponse {
  success: boolean;
  data: {
    shopAnalysisId: string;
    shopName: string;
    totalProducts: number;
    averageScore: number;
    products: AnalyzedProduct[];
    tierDistribution: Record<string, number>;
  };
}

export interface AnalyzedProduct {
  productId: string;
  title: string;
  url: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  imageUrl?: string;
  rating?: number;
  reviewsCount: number;
  salesCount: number;
  score: number;
  scoreBreakdown: {
    reviewScore: number;
    salesScore: number;
    ratingScore: number;
    discountScore: number;
  };
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
}

export interface ProcessCsvResponse {
  success: boolean;
  data: {
    uploadId: string;
    totalProducts: number;
    processedCount: number;
    products: ProductDetail[];
  };
}

export interface ProductDetail {
  id: string;
  upload_id: string;
  original_product_id: string;
  product_title: string;
  description: string;
  price: number;
  images: string[];
  variations: ProductVariation[];
  tags: string[];
  category: string;
  shop_info: {
    shopName: string;
    shopUrl: string;
    rating: number;
  };
}

export interface ProductVariation {
  name: string;
  options: string[];
  prices?: Record<string, number>;
}

export interface CloneProductsResponse {
  success: boolean;
  data: {
    totalRequested: number;
    successfullyCloned: number;
    failed: number;
    usedAI: boolean;
    tokensUsed: number;
    products: ClonedProduct[];
  };
}

export interface ClonedProduct {
  id: string;
  user_id: string;
  original_product_id: string;
  generated_title: string;
  generated_description: string;
  generated_tags: string[];
  ai_model_used: string;
  status: 'generating' | 'completed' | 'failed';
  completed_at: string;
  original_product: {
    id: string;
    title: string;
  };
}
```

## Support

For issues with Edge Functions:
1. Check the browser console for errors
2. Verify authentication token is valid
3. Check Supabase Edge Function logs
4. Review the API usage logs in the database
5. Ensure environment variables are set correctly
