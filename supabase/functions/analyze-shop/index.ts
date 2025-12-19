import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalyzeShopRequest {
  analysisId: string;
  shopName: string;
  numberOfProducts: number;
}

interface ProductData {
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
}

interface ScoreBreakdown {
  reviewScore: number;
  salesScore: number;
  ratingScore: number;
  discountScore: number;
}

interface ScoredProduct extends ProductData {
  score: number;
  scoreBreakdown: ScoreBreakdown;
  tier: string;
}

// Fetch real shop data from Apify Etsy Scraper
async function fetchShopDataFromApify(shopName: string, numberOfProducts: number, apifyApiKey: string): Promise<ProductData[]> {
  // Start Apify actor run
  const actorRunResponse = await fetch(
    'https://api.apify.com/v2/acts/t9Tgk34msbnKXNHzH/runs',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apifyApiKey}`,
      },
      body: JSON.stringify({
        query: shopName,
        limit: numberOfProducts,
        max_shop_listings: numberOfProducts,
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL'],
        },
      }),
    }
  );

  if (!actorRunResponse.ok) {
    const errorText = await actorRunResponse.text();
    throw new Error(`Apify actor start failed: ${actorRunResponse.status} - ${errorText}`);
  }

  const runData = await actorRunResponse.json();
  const runId = runData.data.id;
  const defaultDatasetId = runData.data.defaultDatasetId;

  // Poll for completion
  let isFinished = false;
  let attempts = 0;
  const maxAttempts = 60;

  while (!isFinished && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}`,
      {
        headers: { 'Authorization': `Bearer ${apifyApiKey}` },
      }
    );

    const statusData = await statusResponse.json();
    const status = statusData.data.status;

    if (status === 'SUCCEEDED') {
      isFinished = true;
    } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Apify run ${status.toLowerCase()}`);
    }

    attempts++;
  }

  if (!isFinished) {
    throw new Error('Apify scraper timeout after 5 minutes');
  }

  // Fetch results from dataset
  const datasetResponse = await fetch(
    `https://api.apify.com/v2/datasets/${defaultDatasetId}/items`,
    {
      headers: { 'Authorization': `Bearer ${apifyApiKey}` },
    }
  );

  if (!datasetResponse.ok) {
    throw new Error('Failed to fetch Apify results');
  }

  const items = await datasetResponse.json();

  console.log('Apify returned items count:', items.length);
  console.log('Sample item structure:', JSON.stringify(items[0], null, 2));

  // Transform Apify results to our ProductData format
  return items.map((item: any, index: number) => {
    try {
      return {
        productId: item.listingId || item.id || item.listing_id || `product-${Date.now()}-${index}`,
        title: item.title || item.name || 'Unknown Product',
        url: item.url || item.link || '',
        price: parseFloat(item.price?.value || item.price || item.priceValue || 0),
        originalPrice: item.originalPrice || item.original_price ? parseFloat(item.originalPrice || item.original_price) : undefined,
        discountPercentage: item.discount || item.discountPercentage ? parseFloat(item.discount || item.discountPercentage) : undefined,
        imageUrl: item.images?.[0] || item.image || item.imageUrl || item.img || '',
        rating: parseFloat(item.rating || item.averageRating || 0),
        reviewsCount: parseInt(item.reviewsCount || item.reviews || item.numReviews || item.reviewCount || 0, 10),
        salesCount: parseInt(item.salesCount || item.sales || item.numFavorers || item.orders || 0, 10),
      };
    } catch (error) {
      console.error(`Error mapping item ${index}:`, error, item);
      throw error;
    }
  });
}

// Scoring algorithm based on n8n workflow
function calculateProductScore(product: ProductData): { score: number; breakdown: ScoreBreakdown; tier: string } {
  // Review Score (0-25 points)
  let reviewScore = 0;
  if (product.reviewsCount > 500) reviewScore = 25;
  else if (product.reviewsCount > 200) reviewScore = 20;
  else if (product.reviewsCount > 100) reviewScore = 15;
  else if (product.reviewsCount > 50) reviewScore = 10;
  else if (product.reviewsCount > 20) reviewScore = 5;
  
  // Sales Score (0-35 points)
  let salesScore = 0;
  if (product.salesCount > 2000) salesScore = 35;
  else if (product.salesCount > 1000) salesScore = 30;
  else if (product.salesCount > 500) salesScore = 25;
  else if (product.salesCount > 200) salesScore = 20;
  else if (product.salesCount > 100) salesScore = 15;
  else if (product.salesCount > 50) salesScore = 10;
  else if (product.salesCount > 20) salesScore = 5;
  
  // Rating Score (0-25 points)
  let ratingScore = 0;
  const rating = product.rating || 0;
  if (rating >= 4.8) ratingScore = 25;
  else if (rating >= 4.5) ratingScore = 20;
  else if (rating >= 4.0) ratingScore = 15;
  else if (rating >= 3.5) ratingScore = 10;
  else if (rating >= 3.0) ratingScore = 5;
  
  // Discount Score (0-15 points)
  let discountScore = 0;
  const discount = product.discountPercentage || 0;
  if (discount >= 40) discountScore = 15;
  else if (discount >= 30) discountScore = 12;
  else if (discount >= 20) discountScore = 9;
  else if (discount >= 10) discountScore = 6;
  else if (discount > 0) discountScore = 3;
  
  // Total Score (0-100)
  const totalScore = reviewScore + salesScore + ratingScore + discountScore;
  
  // Determine tier
  let tier = 'D';
  if (totalScore >= 85) tier = 'S';
  else if (totalScore >= 70) tier = 'A';
  else if (totalScore >= 55) tier = 'B';
  else if (totalScore >= 40) tier = 'C';
  
  return {
    score: totalScore,
    breakdown: {
      reviewScore,
      salesScore,
      ratingScore,
      discountScore,
    },
    tier,
  };
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
    const body: AnalyzeShopRequest = await req.json();
    const { analysisId, shopName, numberOfProducts } = body;

    if (!analysisId || !shopName || !numberOfProducts) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: analysisId, shopName, numberOfProducts' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update shop analysis to processing status
    const { error: updateError } = await supabase
      .from('shop_analyses')
      .update({ status: 'processing' })
      .eq('id', analysisId);

    if (updateError) {
      throw new Error(`Failed to update shop analysis: ${updateError.message}`);
    }

    try {
      // Get Apify API key from environment
      const apifyApiKey = Deno.env.get('APIFY_API_KEY');
      if (!apifyApiKey) {
        throw new Error('APIFY_API_KEY environment variable is not set');
      }

      // Fetch real shop data from Apify
      console.log(`Fetching shop data for ${shopName}, ${numberOfProducts} products`);
      const products = await fetchShopDataFromApify(shopName, numberOfProducts, apifyApiKey);
      console.log(`Successfully fetched ${products.length} products from Apify`);

      // Calculate scores for each product
      console.log('Calculating product scores...');
      const scoredProducts: ScoredProduct[] = products.map(product => {
        const { score, breakdown, tier } = calculateProductScore(product);
        return {
          ...product,
          score,
          scoreBreakdown: breakdown,
          tier,
        };
      });
      console.log('Scores calculated successfully');

      // Calculate average score
      const averageScore = scoredProducts.reduce((sum, p) => sum + p.score, 0) / scoredProducts.length;

      // Store analyzed products
      console.log('Preparing products for database insertion...');
      const productsToInsert = scoredProducts.map(product => ({
        shop_analysis_id: analysisId,
        product_id: product.productId,
        product_title: product.title,
        product_url: product.url,
        price: product.price,
        original_price: product.originalPrice,
        discount_percentage: product.discountPercentage,
        image_url: product.imageUrl,
        rating: product.rating,
        reviews_count: product.reviewsCount,
        sales_count: product.salesCount,
        score: product.score,
        score_breakdown: product.scoreBreakdown,
        tier: product.tier,
      }));

      console.log(`Inserting ${productsToInsert.length} products into database...`);
      console.log('Sample product to insert:', JSON.stringify(productsToInsert[0], null, 2));

      const { error: productsError } = await supabase
        .from('analyzed_products')
        .insert(productsToInsert);

      if (productsError) {
        console.error('Database insert error:', productsError);
        throw new Error(`Failed to insert products: ${productsError.message}`);
      }

      console.log('Products inserted successfully');

      // Update shop analysis with completion status
      const { error: completeError } = await supabase
        .from('shop_analyses')
        .update({
          status: 'completed',
          average_score: averageScore,
          completed_at: new Date().toISOString(),
        })
        .eq('id', analysisId);

      if (completeError) {
        throw new Error(`Failed to update shop analysis: ${completeError.message}`);
      }

      // Log API usage (for Apify call)
      await supabase.from('api_usage_logs').insert({
        user_id: user.id,
        api_provider: 'apify',
        endpoint: 'etsy-shop-scraper',
        success: true,
      });

      // Return results
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            shopAnalysisId: analysisId,
            shopName,
            totalProducts: numberOfProducts,
            averageScore: Math.round(averageScore * 100) / 100,
            products: scoredProducts,
            tierDistribution: {
              S: scoredProducts.filter(p => p.tier === 'S').length,
              A: scoredProducts.filter(p => p.tier === 'A').length,
              B: scoredProducts.filter(p => p.tier === 'B').length,
              C: scoredProducts.filter(p => p.tier === 'C').length,
              D: scoredProducts.filter(p => p.tier === 'D').length,
            },
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      // Update shop analysis with error status
      await supabase
        .from('shop_analyses')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', analysisId);

      throw error;
    }
  } catch (error) {
    console.error('Error in analyze-shop function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});