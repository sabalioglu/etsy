import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CloneProductsRequest {
  productIds: string[];
}

interface ProductToClone {
  id: string;
  product_title: string;
  description: string;
  category: string;
  tags: string[];
  images: string[];
  variations: any[];
}

interface GeneratedContent {
  title: string;
  description: string;
  tags: string[];
}

// Call Google Gemini API for content generation
async function generateWithGemini(product: ProductToClone, apiKey: string): Promise<GeneratedContent> {
  const prompt = `You are an expert Etsy product listing optimizer. Create a new, unique product listing based on the following product information. Make it compelling and SEO-friendly.

Original Product:
Title: ${product.product_title}
Category: ${product.category}
Description: ${product.description}
Existing Tags: ${product.tags?.join(', ') || 'none'}

Generate:
1. A new, catchy product title (max 140 characters)
2. A detailed, engaging product description (300-500 words)
3. 10-13 relevant SEO tags

Respond in JSON format:
{
  "title": "new product title",
  "description": "detailed product description",
  "tags": ["tag1", "tag2", ...]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini API');
  }

  const generatedText = data.candidates[0].content.parts[0].text;
  
  // Extract JSON from markdown code blocks if present
  let jsonText = generatedText;
  const jsonMatch = generatedText.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }
  
  const result = JSON.parse(jsonText.trim());
  
  return {
    title: result.title.substring(0, 140), // Etsy title limit
    description: result.description,
    tags: result.tags.slice(0, 13), // Etsy tag limit
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
    const body: CloneProductsRequest = await req.json();
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid productIds array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Google Gemini API key (required)
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_GEMINI_API_KEY environment variable is not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch products to clone
    const { data: products, error: productsError } = await supabase
      .from('product_details')
      .select('*')
      .in('id', productIds);

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No products found with provided IDs' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each product
    const clonedProducts: any[] = [];
    let totalTokensUsed = 0;

    for (const product of products) {
      try {
        // Generate new content using Gemini AI
        const generatedContent = await generateWithGemini(product, geminiApiKey);
        const tokensUsed = Math.floor(generatedContent.description.length / 4);
        totalTokensUsed += tokensUsed;

        // Create cloned product record
        const { data: clonedProduct, error: cloneError } = await supabase
          .from('cloned_products')
          .insert({
            user_id: user.id,
            original_product_id: product.id,
            generated_title: generatedContent.title,
            generated_description: generatedContent.description,
            generated_tags: generatedContent.tags,
            ai_model_used: 'google-gemini-1.5-pro',
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (cloneError) {
          throw new Error(`Failed to create cloned product: ${cloneError.message}`);
        }

        // Copy images references (in real implementation, these would be processed)
        if (product.images && Array.isArray(product.images)) {
          const imageRecords = product.images.slice(0, 10).map((imageUrl: string, index: number) => ({
            cloned_product_id: clonedProduct.id,
            variation_name: product.variations?.[index]?.name,
            prompt_used: `Product image ${index + 1}`,
            image_url: imageUrl,
            generation_provider: 'original',
          }));

          await supabase
            .from('cloned_product_images')
            .insert(imageRecords);
        }

        clonedProducts.push({
          ...clonedProduct,
          original_product: {
            id: product.id,
            title: product.product_title,
          },
        });
      } catch (productError) {
        // Log error but continue with other products
        console.error(`Failed to clone product ${product.id}:`, productError);
        
        // Create failed record
        await supabase
          .from('cloned_products')
          .insert({
            user_id: user.id,
            original_product_id: product.id,
            status: 'failed',
            error_message: productError instanceof Error ? productError.message : 'Unknown error',
          });
      }
    }

    // Log API usage
    if (totalTokensUsed > 0) {
      await supabase.from('api_usage_logs').insert({
        user_id: user.id,
        api_provider: 'google-gemini',
        endpoint: 'gemini-1.5-pro',
        tokens_used: totalTokensUsed,
        cost_estimate: (totalTokensUsed / 1000) * 0.01,
        success: true,
      });
    }

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalRequested: productIds.length,
          successfullyCloned: clonedProducts.length,
          failed: productIds.length - clonedProducts.length,
          tokensUsed: totalTokensUsed,
          products: clonedProducts,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in clone-products function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});