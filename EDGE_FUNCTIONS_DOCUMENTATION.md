# Supabase Edge Functions - Etsy Product Management Platform

This document provides comprehensive documentation for the three main Edge Functions that power the backend workflows of the Etsy Product Management Platform.

## Overview

All Edge Functions are deployed and active on Supabase. They follow these common patterns:

- Built with Deno runtime (not Node.js)
- Use Supabase authentication (JWT verification enabled)
- Handle CORS headers correctly
- Include comprehensive error handling
- Return JSON responses
- Log API usage to the database

## Edge Functions

### 1. analyze-shop

**Endpoint**: `https://[your-project].supabase.co/functions/v1/analyze-shop`

**Purpose**: Analyzes an Etsy shop's products and calculates scores based on a proprietary algorithm.

#### Request Format

```json
{
  "shopName": "string",
  "numberOfProducts": number
}
```

#### Response Format

```json
{
  "success": true,
  "data": {
    "shopAnalysisId": "uuid",
    "shopName": "string",
    "totalProducts": number,
    "averageScore": number,
    "products": [
      {
        "productId": "string",
        "title": "string",
        "url": "string",
        "price": number,
        "originalPrice": number,
        "discountPercentage": number,
        "imageUrl": "string",
        "rating": number,
        "reviewsCount": number,
        "salesCount": number,
        "score": number,
        "scoreBreakdown": {
          "reviewScore": number,
          "salesScore": number,
          "ratingScore": number,
          "discountScore": number
        },
        "tier": "S" | "A" | "B" | "C" | "D"
      }
    ],
    "tierDistribution": {
      "S": number,
      "A": number,
      "B": number,
      "C": number,
      "D": number
    }
  }
}
```

#### Scoring Algorithm

The function implements a 100-point scoring system:

**Review Score (0-25 points)**
- > 500 reviews: 25 points
- > 200 reviews: 20 points
- > 100 reviews: 15 points
- > 50 reviews: 10 points
- > 20 reviews: 5 points

**Sales Score (0-35 points)**
- > 2000 sales: 35 points
- > 1000 sales: 30 points
- > 500 sales: 25 points
- > 200 sales: 20 points
- > 100 sales: 15 points
- > 50 sales: 10 points
- > 20 sales: 5 points

**Rating Score (0-25 points)**
- >= 4.8: 25 points
- >= 4.5: 20 points
- >= 4.0: 15 points
- >= 3.5: 10 points
- >= 3.0: 5 points

**Discount Score (0-15 points)**
- >= 40% discount: 15 points
- >= 30% discount: 12 points
- >= 20% discount: 9 points
- >= 10% discount: 6 points
- > 0% discount: 3 points

**Tier Classification**
- S Tier: >= 85 points
- A Tier: >= 70 points
- B Tier: >= 55 points
- C Tier: >= 40 points
- D Tier: < 40 points

#### Database Operations

1. Creates record in `shop_analyses` table with status 'processing'
2. Fetches product data (currently using mock Apify data)
3. Calculates scores for each product
4. Inserts products into `analyzed_products` table
5. Updates `shop_analyses` with completion status and average score
6. Logs API usage to `api_usage_logs`

#### Example Usage

```bash
curl -X POST 'https://[your-project].supabase.co/functions/v1/analyze-shop' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shopName": "MyEtsyShop",
    "numberOfProducts": 50
  }'
```

---

### 2. process-product-csv

**Endpoint**: `https://[your-project].supabase.co/functions/v1/process-product-csv`

**Purpose**: Processes uploaded CSV files containing product IDs and fetches detailed product information.

#### Request Format

```json
{
  "uploadId": "uuid"
}
```

#### Response Format

```json
{
  "success": true,
  "data": {
    "uploadId": "uuid",
    "totalProducts": number,
    "processedCount": number,
    "products": [
      {
        "id": "uuid",
        "upload_id": "uuid",
        "original_product_id": "string",
        "product_title": "string",
        "description": "string",
        "price": number,
        "images": ["string"],
        "variations": [
          {
            "name": "string",
            "options": ["string"],
            "prices": {
              "option": number
            }
          }
        ],
        "tags": ["string"],
        "category": "string",
        "shop_info": {
          "shopName": "string",
          "shopUrl": "string",
          "rating": number
        }
      }
    ]
  }
}
```

#### CSV Format Requirements

The CSV file must contain at least two columns:
- A column containing "product" and "id" (case-insensitive)
- A column containing "title" or "name" (case-insensitive)
- Optional: A column containing "url" or "link"

Example CSV:
```csv
productId,title,url
12345,Handmade Jewelry,https://etsy.com/listing/12345
67890,Custom Print,https://etsy.com/listing/67890
```

#### Processing Details

1. Validates upload exists and belongs to user
2. Downloads CSV file from Supabase Storage
3. Parses CSV and validates structure
4. Processes products in batches of 10 (to prevent timeouts)
5. Fetches product details (currently using mock RapidAPI data)
6. Stores detailed product information in `product_details` table
7. Updates progress in `product_uploads` table
8. Logs API usage

#### Database Operations

- Updates `product_uploads.status` to 'processing'
- Inserts records into `product_details` table
- Updates `product_uploads.products_processed` for progress tracking
- Updates `product_uploads.status` to 'completed' on success
- Logs to `api_usage_logs`

#### Example Usage

```bash
curl -X POST 'https://[your-project].supabase.co/functions/v1/process-product-csv' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### 3. clone-products

**Endpoint**: `https://[your-project].supabase.co/functions/v1/clone-products`

**Purpose**: Generates AI-powered product clones with new titles, descriptions, and tags using Google Gemini API.

#### Request Format

```json
{
  "productIds": ["uuid", "uuid", ...]
}
```

#### Response Format

```json
{
  "success": true,
  "data": {
    "totalRequested": number,
    "successfullyCloned": number,
    "failed": number,
    "usedAI": boolean,
    "tokensUsed": number,
    "products": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "original_product_id": "uuid",
        "generated_title": "string",
        "generated_description": "string",
        "generated_tags": ["string"],
        "ai_model_used": "google-gemini-1.5-pro" | "mock",
        "status": "completed",
        "completed_at": "timestamp",
        "original_product": {
          "id": "uuid",
          "title": "string"
        }
      }
    ]
  }
}
```

#### AI Content Generation

The function uses Google Gemini 1.5 Pro API with the following configuration:

```javascript
{
  temperature: 0.9,      // High creativity
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048
}
```

**Prompt Structure**:
The function sends a detailed prompt to Gemini including:
- Original product title
- Product category
- Full description
- Existing tags

The AI generates:
1. New product title (max 140 characters - Etsy limit)
2. Detailed, SEO-optimized description (300-500 words)
3. 10-13 relevant tags (Etsy limit is 13)

**Fallback Behavior**:
If the `GOOGLE_GEMINI_API_KEY` environment variable is not set, the function automatically falls back to mock generation, which still creates unique content using algorithmic variation.

#### Database Operations

1. Fetches products from `product_details` table
2. Generates new content using AI or mock algorithm
3. Creates records in `cloned_products` table
4. Creates records in `cloned_product_images` table for each image
5. Logs token usage and costs to `api_usage_logs`

#### Example Usage

```bash
curl -X POST 'https://[your-project].supabase.co/functions/v1/clone-products' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": [
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
    ]
  }'
```

---

## Authentication

All Edge Functions require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

The token can be obtained from Supabase Auth client:

```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## Error Handling

All functions return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (missing or invalid parameters)
- `401`: Unauthorized (missing or invalid token)
- `404`: Resource not found
- `500`: Internal server error

## Environment Variables

The Edge Functions use the following environment variables (automatically configured by Supabase):

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `GOOGLE_GEMINI_API_KEY`: (Optional) Google Gemini API key for AI generation

## API Usage Tracking

All functions log their API usage to the `api_usage_logs` table with:
- `user_id`: The authenticated user
- `api_provider`: The external API used (apify, rapidapi, google-gemini)
- `endpoint`: The specific endpoint called
- `tokens_used`: Number of tokens consumed (for AI services)
- `cost_estimate`: Estimated cost in USD
- `success`: Whether the call succeeded
- `error_message`: Error details if failed

## Rate Limiting

Consider implementing rate limiting based on:
- User tier/subscription level
- API usage logs
- Cost estimates

## Testing

Test the functions locally using the Supabase CLI:

```bash
supabase functions serve analyze-shop --env-file .env
supabase functions serve process-product-csv --env-file .env
supabase functions serve clone-products --env-file .env
```

## Deployment

Functions are deployed using the Supabase MCP tools and are currently active:

- `analyze-shop`: ACTIVE
- `process-product-csv`: ACTIVE
- `clone-products`: ACTIVE

## Future Enhancements

1. **Real API Integration**:
   - Replace mock Apify calls with real Apify Actor integration
   - Replace mock RapidAPI calls with real Etsy API integration
   - Add retry logic and rate limiting

2. **Image Processing**:
   - Integrate AI image generation (DALL-E, Midjourney, Stable Diffusion)
   - Process and optimize images for Etsy requirements
   - Generate variation-specific images

3. **Batch Processing**:
   - Implement queue-based processing for large batches
   - Add webhook notifications for completion
   - Email notifications with results

4. **Advanced Scoring**:
   - Machine learning-based score prediction
   - Competitive analysis features
   - Trend detection and seasonal adjustments

5. **Export Features**:
   - Generate CSV exports of analyzed products
   - Create Etsy-compatible import files
   - PDF reports with visualizations

## Support

For issues or questions about the Edge Functions, check:
- Supabase Function logs in the dashboard
- API usage logs in the database
- Error messages in function responses
