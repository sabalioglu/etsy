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

interface ProcessedProduct {
  listing_id: string;
  shop_id: string;
  shop_name: string;
  title: string;
  url: string;
  price: number;
  discounted_price?: number;
  quantity: number;
  in_cart_count: number;
  num_favorers: number;
  num_favorers_source: string;
  num_favorers_confidence: string;
  listing_review_photo_count: number;
  listing_review_video_count: number;
  variation_count: number;
  has_video: boolean;
  image_count: number;
  last_sale_date?: number;
  create_date?: number;
  original_create_date?: number;
  is_bestseller: boolean;
  is_top_rated: boolean;
  is_personalizable: boolean;
  has_free_shipping: boolean;
  shop_average_rating: number;
  shop_total_rating_count: number;
  is_star_seller: boolean;
  shop_sales: number;
  image_url?: string;
  rating?: number;
  reviews_count: number;
  sales_count: number;
}

interface ScoredProduct extends ProcessedProduct {
  advanced_sales_score: number;
  score_breakdown: string;
  product_tier: string;
  tier_description: string;
  scoring_version: string;
  is_2025_compliant: boolean;
  needs_urgent_action: boolean;
}

function estimateFavorites(cartCount: number): number {
  if (cartCount >= 200) return Math.round(cartCount * 28);
  if (cartCount >= 100) return Math.round(cartCount * 20);
  if (cartCount >= 50) return Math.round(cartCount * 17);
  if (cartCount >= 20) return Math.round(cartCount * 12);
  if (cartCount >= 10) return Math.round(cartCount * 10);
  if (cartCount >= 5) return Math.round(cartCount * 7);
  return Math.round(cartCount * 5);
}

function processApifyData(rawItems: any[]): ProcessedProduct[] {
  const allProducts: any[] = [];

  for (const item of rawItems) {
    if (item.display_listings && Array.isArray(item.display_listings)) {
      const shopMetadata = {
        shop_id: item.shop_id,
        shop_name: item.shop_name,
        shop_average_rating: item.sales_count ? 4.9 : null,
        shop_total_rating_count: item.sales_count || 0,
        is_star_seller: item.sales_count > 5000,
        shop_sales: item.sales_count
      };

      for (const listing of item.display_listings) {
        allProducts.push({ ...listing, ...shopMetadata });
      }
    } else if (item.listing_id || item.listingId) {
      allProducts.push(item);
    }
  }

  return allProducts.map(product => {
    const cartCount = product.in_cart_count || 0;
    let numFavorers = product.num_favorers || 0;
    let favoritersSource = 'native';
    let confidenceLevel = 'high';

    if (!numFavorers || numFavorers === 0) {
      numFavorers = estimateFavorites(cartCount);
      favoritersSource = 'estimated';

      if (cartCount >= 50) confidenceLevel = 'high';
      else if (cartCount >= 10) confidenceLevel = 'medium';
      else confidenceLevel = 'low';
    }

    const listingId = product.listing_id || product.listingId || '';
    const images = product.listing_images || product.images || [];
    const imageCount = Array.isArray(images) ? images.length : 1;

    return {
      listing_id: String(listingId),
      shop_id: String(product.shop_id || ''),
      shop_name: product.shop_name || '',
      title: product.title || '',
      url: product.url || '',
      price: parseFloat(product.price?.value || product.price || 0),
      discounted_price: product.discounted_price?.amount ?
        product.discounted_price.amount / 100 : undefined,
      quantity: product.quantity || 0,
      in_cart_count: cartCount,
      num_favorers: numFavorers,
      num_favorers_source: favoritersSource,
      num_favorers_confidence: confidenceLevel,
      listing_review_photo_count: product.listing_review_photo_count || 0,
      listing_review_video_count: product.listing_review_video_count || 0,
      variation_count: product.variations_data?.length || 0,
      has_video: product.video_key ? true : false,
      image_count: imageCount,
      last_sale_date: product.last_sale_date || null,
      create_date: product.create_date || null,
      original_create_date: product.original_create_date || product.create_date || null,
      is_bestseller: product.is_bestseller || false,
      is_top_rated: product.is_top_rated || false,
      is_personalizable: product.is_personalizable || false,
      has_free_shipping: product.free_shipping_countries?.includes("ANY") || false,
      shop_average_rating: product.shop_average_rating || 4.9,
      shop_total_rating_count: product.shop_total_rating_count || 0,
      is_star_seller: product.has_star_seller_signal || product.is_star_seller || false,
      shop_sales: product.shop_sales || 0,
      image_url: Array.isArray(images) && images[0] ?
        (images[0].url || images[0]) :
        (typeof images === 'string' ? images : ''),
      rating: parseFloat(product.rating || product.shop_average_rating || 0),
      reviews_count: parseInt(product.listing_review_count || product.num_reviews || 0, 10),
      sales_count: parseInt(product.salesCount || product.sales || product.shop_sales || 0, 10),
    };
  });
}

function calculateAdvancedScore(product: ProcessedProduct): Omit<ScoredProduct, keyof ProcessedProduct> {
  let score = 0;
  const scoreBreakdown: string[] = [];

  const favorers = product.num_favorers || 0;
  if (favorers > 0) {
    const favScore = Math.min(Math.log10(favorers + 1) * 8.5, 30);
    score += favScore;
    scoreBreakdown.push(`⭐ Favorers (${favorers}) (+${Math.round(favScore)})`);
  }

  const cartCount = product.in_cart_count || 0;
  if (cartCount > 0) {
    const cartScore = Math.min(cartCount * 1.0, 15);
    score += cartScore;
    scoreBreakdown.push(`Cart (${cartCount}) (+${Math.round(cartScore)})`);
  }

  const photoCount = product.listing_review_photo_count || 0;
  const videoCount = product.listing_review_video_count || 0;
  if (photoCount > 50 || videoCount > 2) {
    const engagementScore = Math.min((photoCount / 30) + (videoCount * 4), 12);
    score += Math.round(engagementScore);
    scoreBreakdown.push(`High Engagement (${photoCount}p/${videoCount}v) (+${Math.round(engagementScore)})`);
  }

  if (product.is_star_seller) {
    score += 12;
    scoreBreakdown.push("⭐ Star Seller (+12)");
  }

  if (product.is_top_rated) {
    score += 8;
    scoreBreakdown.push("Top Rated (+8)");
  }

  const reviewCount = product.reviews_count || 0;
  const avgRating = product.shop_average_rating || product.rating || 0;
  if (reviewCount > 0 && avgRating > 0) {
    let reviewScore = Math.round(Math.log(reviewCount + 1) * 3);

    if (avgRating >= 4.9) reviewScore *= 1.8;
    else if (avgRating >= 4.8) reviewScore *= 1.4;
    else if (avgRating >= 4.5) reviewScore *= 1.0;
    else if (avgRating < 4.0) reviewScore *= 0.3;

    score += Math.round(reviewScore);
    scoreBreakdown.push(`Reviews (${reviewCount}@${avgRating.toFixed(1)}★) (+${Math.round(reviewScore)})`);
  }

  const lastSale = product.last_sale_date;
  const now = Date.now();
  if (lastSale) {
    const hoursSince = (now - lastSale) / 3600000;
    let activityScore = 0;

    if (hoursSince < 24) activityScore = 10;
    else if (hoursSince < 72) activityScore = 7;
    else if (hoursSince < 168) activityScore = 4;
    else if (hoursSince < 720) activityScore = 2;

    if (activityScore > 0) {
      score += activityScore;
      scoreBreakdown.push(`Recent Activity (${Math.floor(hoursSince)}h) (+${activityScore})`);
    }
  }

  const imageCount = product.image_count || 1;
  if (imageCount >= 5) {
    score += 8;
    scoreBreakdown.push("5+ Photos (+8)");
  } else if (imageCount >= 3) {
    score += 4;
    scoreBreakdown.push("3-4 Photos (+4)");
  } else {
    score -= 5;
    scoreBreakdown.push("❌ <3 Photos (-5)");
  }

  if (product.has_video) {
    score += 10;
    scoreBreakdown.push("✅ Has Video (+10)");
  } else {
    score -= 3;
    scoreBreakdown.push("⚠️ No Video (-3)");
  }

  if (product.is_personalizable) {
    score += 6;
    scoreBreakdown.push("Personalizable (+6)");
  }

  if (product.variation_count > 0) {
    const varScore = Math.min(product.variation_count * 2, 6);
    score += varScore;
    scoreBreakdown.push(`Variations (${product.variation_count}) (+${varScore})`);
  }

  if (product.is_bestseller) {
    score += 4;
    scoreBreakdown.push("Bestseller (+4)");
  }

  if (product.has_free_shipping) {
    score += 3;
    scoreBreakdown.push("Free Ship (+3)");
  }

  if (avgRating > 0 && avgRating < 4.0) {
    score -= 20;
    scoreBreakdown.push("❌ Poor Rating (-20)");
  }

  if (reviewCount < 20) {
    score -= 8;
    scoreBreakdown.push("⚠️ Unproven Listing (-8)");
  }

  if (product.quantity < 1 && (cartCount > 0 || favorers > 0)) {
    score -= 10;
    scoreBreakdown.push("❌ Out of Stock (-10)");
  }

  const titleLength = product.title?.length || 0;
  if (titleLength > 140) {
    score -= 5;
    scoreBreakdown.push("⚠️ Title Too Long (-5)");
  }

  const finalScore = Math.max(Math.round(score), 0);

  let product_tier = "";
  let tier_description = "";

  if (finalScore >= 80) {
    product_tier = "🦄 Unicorn";
    tier_description = "2025 Algorithm Winner - Replicate NOW!";
  } else if (finalScore >= 55) {
    product_tier = "🔥 Hot";
    tier_description = "High 2025 potential, optimize & push";
  } else if (finalScore >= 35) {
    product_tier = "📈 Rising";
    tier_description = "Growing, needs quality boost (video+photos)";
  } else if (finalScore >= 15) {
    product_tier = "👀 Watch";
    tier_description = "Needs serious optimization";
  } else {
    product_tier = "💀 Dead";
    tier_description = "Archive or complete overhaul needed";
  }

  const is_2025_compliant = imageCount >= 5 && product.has_video && avgRating >= 4.5;
  const needs_urgent_action = !is_2025_compliant || finalScore < 35;

  return {
    advanced_sales_score: finalScore,
    score_breakdown: scoreBreakdown.join(", "),
    product_tier,
    tier_description,
    scoring_version: "v3.3-DEC2025-FINAL",
    is_2025_compliant,
    needs_urgent_action,
  };
}

async function fetchShopDataFromApify(shopName: string, numberOfProducts: number, apifyApiKey: string): Promise<any[]> {
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

  return items;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AnalyzeShopRequest = await req.json();
    const { analysisId, shopName, numberOfProducts } = body;

    if (!analysisId || !shopName || !numberOfProducts) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: analysisId, shopName, numberOfProducts' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabase
      .from('shop_analyses')
      .update({ status: 'processing' })
      .eq('id', analysisId);

    if (updateError) {
      throw new Error(`Failed to update shop analysis: ${updateError.message}`);
    }

    try {
      const apifyApiKey = Deno.env.get('APIFY_API_KEY');
      if (!apifyApiKey) {
        throw new Error('APIFY_API_KEY environment variable is not set');
      }

      console.log(`Fetching shop data for ${shopName}, ${numberOfProducts} products`);
      const rawItems = await fetchShopDataFromApify(shopName, numberOfProducts, apifyApiKey);

      console.log('Processing Apify data...');
      const processedProducts = processApifyData(rawItems);
      console.log(`Processed ${processedProducts.length} products`);

      console.log('Calculating advanced scores...');
      const scoredProducts: ScoredProduct[] = processedProducts.map(product => ({
        ...product,
        ...calculateAdvancedScore(product)
      }));

      scoredProducts.sort((a, b) => b.advanced_sales_score - a.advanced_sales_score);

      const averageScore = scoredProducts.reduce((sum, p) => sum + p.advanced_sales_score, 0) / scoredProducts.length;

      console.log('Preparing products for database insertion...');
      const productsToInsert = scoredProducts.map(product => ({
        shop_analysis_id: analysisId,
        product_id: product.listing_id,
        product_title: product.title,
        product_url: product.url,
        price: product.price,
        original_price: product.discounted_price,
        image_url: product.image_url,
        rating: product.rating,
        reviews_count: product.reviews_count,
        sales_count: product.sales_count,
        score: product.advanced_sales_score,
        tier: product.product_tier,
        in_cart_count: product.in_cart_count,
        num_favorers: product.num_favorers,
        num_favorers_source: product.num_favorers_source,
        num_favorers_confidence: product.num_favorers_confidence,
        listing_review_photo_count: product.listing_review_photo_count,
        listing_review_video_count: product.listing_review_video_count,
        variation_count: product.variation_count,
        has_video: product.has_video,
        image_count: product.image_count,
        is_top_rated: product.is_top_rated,
        has_free_shipping: product.has_free_shipping,
        shop_average_rating: product.shop_average_rating,
        shop_total_rating_count: product.shop_total_rating_count,
        is_star_seller: product.is_star_seller,
        shop_sales: product.shop_sales,
        advanced_sales_score: product.advanced_sales_score,
        score_breakdown: product.score_breakdown,
        product_tier: product.product_tier,
        tier_description: product.tier_description,
        scoring_version: product.scoring_version,
        is_2025_compliant: product.is_2025_compliant,
        needs_urgent_action: product.needs_urgent_action,
      }));

      console.log(`Inserting ${productsToInsert.length} products into database...`);

      const { error: productsError } = await supabase
        .from('analyzed_products')
        .insert(productsToInsert);

      if (productsError) {
        console.error('Database insert error:', productsError);
        throw new Error(`Failed to insert products: ${productsError.message}`);
      }

      console.log('Products inserted successfully');

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

      await supabase.from('api_usage_logs').insert({
        user_id: user.id,
        api_provider: 'apify',
        endpoint: 'etsy-shop-scraper',
        success: true,
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            shopAnalysisId: analysisId,
            shopName,
            totalProducts: scoredProducts.length,
            averageScore: Math.round(averageScore * 100) / 100,
            tierDistribution: {
              unicorn: scoredProducts.filter(p => p.advanced_sales_score >= 80).length,
              hot: scoredProducts.filter(p => p.advanced_sales_score >= 55 && p.advanced_sales_score < 80).length,
              rising: scoredProducts.filter(p => p.advanced_sales_score >= 35 && p.advanced_sales_score < 55).length,
              watch: scoredProducts.filter(p => p.advanced_sales_score >= 15 && p.advanced_sales_score < 35).length,
              dead: scoredProducts.filter(p => p.advanced_sales_score < 15).length,
            },
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
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