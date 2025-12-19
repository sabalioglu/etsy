import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessCsvRequest {
  uploadId: string;
}

interface CsvRow {
  productId: string;
  title: string;
  url?: string;
}

interface ProductDetails {
  productId: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  variations: Array<{
    name: string;
    options: string[];
    prices?: Record<string, number>;
  }>;
  tags: string[];
  category: string;
  shopInfo: {
    shopName: string;
    shopUrl: string;
    rating: number;
  };
}

// Mock RapidAPI response - simulates real product details API
function mockRapidApiResponse(productId: string, title: string): ProductDetails {
  const categories = ['Jewelry', 'Home & Living', 'Clothing', 'Art & Collectibles', 'Craft Supplies'];
  const tagSets = [
    ['handmade', 'vintage', 'unique', 'gift'],
    ['boho', 'minimalist', 'modern', 'rustic'],
    ['custom', 'personalized', 'engraved', 'monogram'],
  ];
  
  const numImages = Math.floor(Math.random() * 5) + 3; // 3-7 images
  const images = Array.from({ length: numImages }, (_, i) => 
    `https://i.etsystatic.com/product-${productId}-${i + 1}.jpg`
  );
  
  const hasVariations = Math.random() > 0.5;
  const variations = hasVariations ? [
    {
      name: 'Size',
      options: ['Small', 'Medium', 'Large'],
      prices: {
        'Small': Math.floor(Math.random() * 20) + 10,
        'Medium': Math.floor(Math.random() * 25) + 15,
        'Large': Math.floor(Math.random() * 30) + 20,
      },
    },
    {
      name: 'Color',
      options: ['Black', 'White', 'Blue', 'Red'],
    },
  ] : [];
  
  const basePrice = Math.floor(Math.random() * 80) + 20;
  const randomTags = tagSets[Math.floor(Math.random() * tagSets.length)];
  
  return {
    productId,
    title,
    description: `Beautiful handcrafted ${title}. Made with high-quality materials and attention to detail. Perfect for gifts or personal use. Each piece is unique and made to order.\n\nFeatures:\n- Handmade with care\n- High-quality materials\n- Unique design\n- Fast shipping\n\nCare Instructions:\nHandle with care and store in a dry place.`,
    price: basePrice,
    images,
    variations,
    tags: [...randomTags, title.toLowerCase().split(' ')[0]],
    category: categories[Math.floor(Math.random() * categories.length)],
    shopInfo: {
      shopName: `Shop${Math.floor(Math.random() * 1000)}`,
      shopUrl: `https://www.etsy.com/shop/Shop${Math.floor(Math.random() * 1000)}`,
      rating: Math.round((Math.random() * 1 + 4) * 10) / 10, // 4.0 - 5.0
    },
  };
}

// Parse CSV content
function parseCSV(csvContent: string): CsvRow[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }
  
  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const productIdIndex = header.findIndex(h => h.includes('product') && h.includes('id'));
  const titleIndex = header.findIndex(h => h.includes('title') || h.includes('name'));
  const urlIndex = header.findIndex(h => h.includes('url') || h.includes('link'));
  
  if (productIdIndex === -1 || titleIndex === -1) {
    throw new Error('CSV must contain productId and title columns');
  }
  
  // Parse data rows
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length > Math.max(productIdIndex, titleIndex)) {
      rows.push({
        productId: values[productIdIndex],
        title: values[titleIndex],
        url: urlIndex !== -1 && values[urlIndex] ? values[urlIndex] : undefined,
      });
    }
  }
  
  return rows;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ProcessCsvRequest = await req.json();
    const { uploadId } = body;

    if (!uploadId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: uploadId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get upload record
    const { data: upload, error: uploadError } = await supabase
      .from('product_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', user.id)
      .single();

    if (uploadError || !upload) {
      return new Response(
        JSON.stringify({ error: 'Upload not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (upload.status !== 'uploaded') {
      return new Response(
        JSON.stringify({ error: `Upload is already ${upload.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabase
      .from('product_uploads')
      .update({ status: 'processing' })
      .eq('id', uploadId);

    try {
      // Download CSV file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('product-uploads')
        .download(upload.file_url.split('/').pop()!);

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      // Parse CSV
      const csvContent = await fileData.text();
      const csvRows = parseCSV(csvContent);

      if (csvRows.length === 0) {
        throw new Error('No valid products found in CSV');
      }

      // Process each product (in batches to avoid timeout)
      const batchSize = 10;
      const processedProducts: any[] = [];
      
      for (let i = 0; i < csvRows.length; i += batchSize) {
        const batch = csvRows.slice(i, i + batchSize);
        
        // Simulate calling RapidAPI for each product (mock data for now)
        const batchResults = await Promise.all(
          batch.map(async (row) => {
            const details = mockRapidApiResponse(row.productId, row.title);
            return {
              upload_id: uploadId,
              original_product_id: details.productId,
              product_title: details.title,
              description: details.description,
              price: details.price,
              images: details.images,
              variations: details.variations,
              tags: details.tags,
              category: details.category,
              shop_info: details.shopInfo,
            };
          })
        );

        // Insert batch into database
        const { data: insertedProducts, error: insertError } = await supabase
          .from('product_details')
          .insert(batchResults)
          .select();

        if (insertError) {
          throw new Error(`Failed to insert products: ${insertError.message}`);
        }

        processedProducts.push(...(insertedProducts || []));

        // Update progress
        await supabase
          .from('product_uploads')
          .update({
            products_processed: Math.min(i + batchSize, csvRows.length),
          })
          .eq('id', uploadId);
      }

      // Update upload with completion status
      await supabase
        .from('product_uploads')
        .update({
          status: 'completed',
          products_count: csvRows.length,
          products_processed: csvRows.length,
          processed_at: new Date().toISOString(),
        })
        .eq('id', uploadId);

      // Log API usage
      await supabase.from('api_usage_logs').insert({
        user_id: user.id,
        api_provider: 'rapidapi',
        endpoint: 'etsy-product-details',
        success: true,
      });

      // Return results
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            uploadId,
            totalProducts: csvRows.length,
            processedCount: processedProducts.length,
            products: processedProducts,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      // Update upload with error status
      await supabase
        .from('product_uploads')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', uploadId);

      throw error;
    }
  } catch (error) {
    console.error('Error in process-product-csv function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
