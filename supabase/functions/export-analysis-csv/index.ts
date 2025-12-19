import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExportRequest {
  analysisId: string;
  format?: 'csv' | 'json';
}

interface ProductRow {
  'Shop Name': string;
  'Product URL': string;
  'Listing ID': string;
  'Product Title': string;
  'Price (USD)': string;
  'Original Price (USD)': string;
  'Discount %': number;
  'Image URL': string;
  'Variations (Size/Color)': string;
  'Rank Score': number;
  'Tier (Kategori)': string;
  'In Cart Count': number;
  'Estimated Favorites': number;
  'Favorites Source': string;
  'Last Sale (Hours Ago)': string | number;
  'Listing Age (Days)': string | number;
  'Has Video': string;
  'Has Free Shipping': string;
  'Is Bestseller': string;
  'Is Top Rated': string;
  'Is Star Seller': string;
  'Is Personalizable': string;
  'Total Sales (Shop)': number;
  'Average Rating': string;
  'Review Photo Count': number;
  'Review Video Count': number;
  'Image Count': number;
  'Stock Quantity': number;
  'Processing Time (Days)': string;
}

function convertToCSV(rows: ProductRow[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map(header => {
      const value = row[header as keyof ProductRow];
      const stringValue = value === null || value === undefined ? '' : String(value);
      return `"${stringValue.replace(/"/g, '""')}`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
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

    const body: ExportRequest = await req.json();
    const { analysisId, format = 'csv' } = body;

    if (!analysisId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: analysisId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: analysis, error: analysisError } = await supabase
      .from('shop_analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', user.id)
      .single();

    if (analysisError || !analysis) {
      return new Response(
        JSON.stringify({ error: 'Analysis not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: products, error: productsError } = await supabase
      .from('analyzed_products')
      .select('*')
      .eq('shop_analysis_id', analysisId)
      .order('advanced_sales_score', { ascending: false });

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No products found for this analysis' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stats = {
      totalProducts: products.length,
      unicorns: 0,
      hot: 0,
      rising: 0,
      watch: 0,
      dead: 0,
      bestsellers: 0,
      topRated: 0,
      starSellers: 0,
      withVideo: 0,
      withFreeShipping: 0,
      totalScore: 0,
      totalPrice: 0,
      validPrices: 0,
      minScore: 999,
      maxScore: 0,
      totalSales: 0
    };

    const sheetsRows: ProductRow[] = products.map((product, index) => {
      const score = product.advanced_sales_score || 0;
      const tier = product.product_tier || '💀 Dead';

      stats.totalScore += score;
      stats.minScore = Math.min(stats.minScore, score);
      stats.maxScore = Math.max(stats.maxScore, score);

      if (tier.includes('Unicorn')) stats.unicorns++;
      else if (tier.includes('Hot')) stats.hot++;
      else if (tier.includes('Rising')) stats.rising++;
      else if (tier.includes('Watch')) stats.watch++;
      else stats.dead++;

      if (product.is_bestseller) stats.bestsellers++;
      if (product.is_top_rated) stats.topRated++;
      if (product.is_star_seller) stats.starSellers++;
      if (product.has_video) stats.withVideo++;
      if (product.has_free_shipping) stats.withFreeShipping++;

      if (product.shop_sales) stats.totalSales = product.shop_sales;

      const currentPrice = Number(product.price) || 0;
      const originalPrice = Number(product.original_price) || currentPrice;

      if (currentPrice > 0) {
        stats.totalPrice += currentPrice;
        stats.validPrices++;
      }

      let discountPercent = 0;
      if (originalPrice > 0 && currentPrice > 0 && currentPrice < originalPrice) {
        discountPercent = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      }

      const variationsText = product.variation_count > 0
        ? `${product.variation_count} variations`
        : 'No variations';

      const favoritesSource = product.num_favorers_source === 'estimated' ? 'Estimated' : 'Native';

      const lastSaleHours = product.last_sale_date
        ? Math.round((Date.now() - new Date(product.last_sale_date).getTime()) / (1000 * 60 * 60))
        : '';

      const listingAgeDays = product.create_date
        ? Math.round((Date.now() - new Date(product.create_date).getTime()) / (1000 * 60 * 60 * 24))
        : '';

      return {
        'Shop Name': analysis.shop_name || '',
        'Product URL': product.product_url || '',
        'Listing ID': product.product_id || '',
        'Product Title': product.product_title || '',
        'Price (USD)': currentPrice.toFixed(2),
        'Original Price (USD)': originalPrice.toFixed(2),
        'Discount %': discountPercent,
        'Image URL': product.image_url || '',
        'Variations (Size/Color)': variationsText,
        'Rank Score': score,
        'Tier (Kategori)': tier,
        'In Cart Count': product.in_cart_count || 0,
        'Estimated Favorites': product.num_favorers || 0,
        'Favorites Source': favoritesSource,
        'Last Sale (Hours Ago)': lastSaleHours,
        'Listing Age (Days)': listingAgeDays,
        'Has Video': product.has_video ? 'YES' : 'NO',
        'Has Free Shipping': product.has_free_shipping ? 'YES' : 'NO',
        'Is Bestseller': product.is_bestseller ? 'YES' : 'NO',
        'Is Top Rated': product.is_top_rated ? 'YES' : 'NO',
        'Is Star Seller': product.is_star_seller ? 'YES' : 'NO',
        'Is Personalizable': product.is_personalizable ? 'YES' : 'NO',
        'Total Sales (Shop)': product.shop_sales || 0,
        'Average Rating': (Number(product.shop_average_rating) || 0).toFixed(1),
        'Review Photo Count': product.listing_review_photo_count || 0,
        'Review Video Count': product.listing_review_video_count || 0,
        'Image Count': product.image_count || 1,
        'Stock Quantity': product.quantity || 0,
        'Processing Time (Days)': '1-5 days',
      };
    });

    const insights: string[] = [];

    if (stats.unicorns > 0) {
      const topUnicorns = products
        .filter(p => (p.product_tier || '').includes('Unicorn'))
        .slice(0, 3)
        .map(p => `"${(p.product_title || '').substring(0, 50)}..." (Score: ${p.advanced_sales_score})`)
        .join(', ');

      insights.push(`🦄 ${stats.unicorns} UNICORN products found - Top 3: ${topUnicorns}`);
    }

    const highEngagement = products.filter(p =>
      (p.in_cart_count || 0) > 100 || (p.num_favorers || 0) > 1000
    ).length;

    if (highEngagement > 0) {
      insights.push(`🔥 ${highEngagement} products with high engagement (>100 carts OR >1000 favorites)`);
    }

    if (stats.withVideo > stats.totalProducts / 2) {
      const videoRate = ((stats.withVideo / stats.totalProducts) * 100).toFixed(0);
      insights.push(`🎥 ${videoRate}% of products have video content`);
    }

    if (stats.withFreeShipping > stats.totalProducts / 2) {
      const freeShipRate = ((stats.withFreeShipping / stats.totalProducts) * 100).toFixed(0);
      insights.push(`📦 ${freeShipRate}% offer free shipping - competitive advantage`);
    }

    if (stats.dead > stats.totalProducts * 0.3) {
      insights.push(`⚠️ ${stats.dead} products in Dead/Low tier - consider optimization or removal`);
    }

    const avgScore = stats.totalProducts > 0
      ? (stats.totalScore / stats.totalProducts).toFixed(1)
      : "0.0";
    const avgPrice = stats.validPrices > 0
      ? (stats.totalPrice / stats.validPrices).toFixed(2)
      : "0.00";

    console.log("\n═══════════════════════════════════════════");
    console.log("✅ CSV EXPORTER v3.7.3 COMPLETED");
    console.log("═══════════════════════════════════════════");
    console.log(`📦 Total Products: ${stats.totalProducts}`);
    console.log(`📊 Score Range: ${stats.minScore} - ${stats.maxScore}`);
    console.log(`⭐ Average Score: ${avgScore}`);
    console.log(`💰 Average Price: $${avgPrice}`);
    console.log("═══════════════════════════════════════════\n");

    if (format === 'csv') {
      const csvContent = convertToCSV(sheetsRows);

      return new Response(csvContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="etsy-analysis-${analysisId}.csv"`,
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            products: sheetsRows,
            stats: {
              totalProducts: stats.totalProducts,
              scoreRange: `${stats.minScore} - ${stats.maxScore}`,
              averageScore: avgScore,
              averagePrice: avgPrice,
              tierDistribution: {
                unicorns: stats.unicorns,
                hot: stats.hot,
                rising: stats.rising,
                watch: stats.watch,
                dead: stats.dead,
              },
              metrics: {
                bestsellers: stats.bestsellers,
                topRated: stats.topRated,
                starSellers: stats.starSellers,
                withVideo: stats.withVideo,
                withFreeShipping: stats.withFreeShipping,
              },
            },
            insights,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in export-analysis-csv function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});