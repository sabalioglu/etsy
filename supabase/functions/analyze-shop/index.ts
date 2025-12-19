import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalyzeShopRequest {
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

// Mock Apify API response - simulates real Etsy shop data
function mockApifyResponse(shopName: string, numberOfProducts: number): ProductData[] {
  const products: ProductData[] = [];
  
  for (let i = 0; i < numberOfProducts; i++) {
    const basePrice = Math.floor(Math.random() * 100) + 10;
    const hasDiscount = Math.random() > 0.5;
    const discountPercentage = hasDiscount ? Math.floor(Math.random() * 50) + 10 : 0;
    const price = hasDiscount ? basePrice * (1 - discountPercentage / 100) : basePrice;
    
    products.push({
      productId: `etsy-${shopName}-${i + 1}`,
      title: `Product ${i + 1} from ${shopName}`,
      url: `https://www.etsy.com/listing/${Math.floor(Math.random() * 1000000)}`,
      price: Math.round(price * 100) / 100,
      originalPrice: hasDiscount ? basePrice : undefined,
      discountPercentage: hasDiscount ? discountPercentage : undefined,
      imageUrl: `https://i.etsystatic.com/placeholder-${i + 1}.jpg`,
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 - 5.0
      reviewsCount: Math.floor(Math.random() * 1000),
      salesCount: Math.floor(Math.random() * 5000),
    });
  }
  
  return products;
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
    const { shopName, numberOfProducts } = body;

    if (!shopName || !numberOfProducts) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: shopName, numberOfProducts' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create shop analysis record
    const { data: shopAnalysis, error: analysisError } = await supabase
      .from('shop_analyses')
      .insert({
        user_id: user.id,
        shop_name: shopName,
        shop_url: `https://www.etsy.com/shop/${shopName}`,
        status: 'processing',
        total_products: numberOfProducts,
      })
      .select()
      .single();

    if (analysisError) {
      throw new Error(`Failed to create shop analysis: ${analysisError.message}`);
    }

    try {
      // Simulate calling Apify API (mock data for now)
      const products = mockApifyResponse(shopName, numberOfProducts);

      // Calculate scores for each product
      const scoredProducts: ScoredProduct[] = products.map(product => {
        const { score, breakdown, tier } = calculateProductScore(product);
        return {
          ...product,
          score,
          scoreBreakdown: breakdown,
          tier,
        };
      });

      // Calculate average score
      const averageScore = scoredProducts.reduce((sum, p) => sum + p.score, 0) / scoredProducts.length;

      // Store analyzed products
      const productsToInsert = scoredProducts.map(product => ({
        shop_analysis_id: shopAnalysis.id,
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

      const { error: productsError } = await supabase
        .from('analyzed_products')
        .insert(productsToInsert);

      if (productsError) {
        throw new Error(`Failed to insert products: ${productsError.message}`);
      }

      // Update shop analysis with completion status
      const { error: updateError } = await supabase
        .from('shop_analyses')
        .update({
          status: 'completed',
          average_score: averageScore,
          completed_at: new Date().toISOString(),
        })
        .eq('id', shopAnalysis.id);

      if (updateError) {
        throw new Error(`Failed to update shop analysis: ${updateError.message}`);
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
            shopAnalysisId: shopAnalysis.id,
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
        .eq('id', shopAnalysis.id);

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
