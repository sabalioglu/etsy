# Edge Functions Testing Guide

This guide provides test data, curl commands, and example responses for testing the Etsy Product Management Platform Edge Functions.

## Prerequisites

Before testing, you need:
1. A valid JWT token from Supabase Auth
2. Your Supabase project URL
3. The Edge Functions deployed (all three are currently ACTIVE)

## Getting Your JWT Token

### Option 1: From Browser Console

```javascript
// In your app's browser console
const { data: { session } } = await supabase.auth.getSession();
console.log(session.access_token);
```

### Option 2: Using Supabase CLI

```bash
# Login to Supabase
supabase login

# Get an access token
supabase auth token
```

### Option 3: Programmatically

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password123',
});

const token = data.session?.access_token;
```

## Test Commands

Replace these placeholders in all commands:
- `YOUR_PROJECT_URL` - Your Supabase project URL
- `YOUR_JWT_TOKEN` - Your authentication token

### 1. Testing analyze-shop

#### Basic Test

```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/analyze-shop' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shopName": "TestShop123",
    "numberOfProducts": 10
  }'
```

#### Expected Response

```json
{
  "success": true,
  "data": {
    "shopAnalysisId": "550e8400-e29b-41d4-a716-446655440000",
    "shopName": "TestShop123",
    "totalProducts": 10,
    "averageScore": 64.2,
    "products": [
      {
        "productId": "etsy-TestShop123-1",
        "title": "Product 1 from TestShop123",
        "url": "https://www.etsy.com/listing/123456",
        "price": 29.99,
        "originalPrice": 39.99,
        "discountPercentage": 25,
        "imageUrl": "https://i.etsystatic.com/placeholder-1.jpg",
        "rating": 4.7,
        "reviewsCount": 234,
        "salesCount": 567,
        "score": 75,
        "scoreBreakdown": {
          "reviewScore": 20,
          "salesScore": 25,
          "ratingScore": 20,
          "discountScore": 9
        },
        "tier": "A"
      }
    ],
    "tierDistribution": {
      "S": 1,
      "A": 3,
      "B": 4,
      "C": 2,
      "D": 0
    }
  }
}
```

#### Test Cases

**Test 1: Small shop (5 products)**
```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/analyze-shop' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shopName": "SmallShop",
    "numberOfProducts": 5
  }'
```

**Test 2: Large shop (100 products)**
```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/analyze-shop' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shopName": "LargeShop",
    "numberOfProducts": 100
  }'
```

**Test 3: Missing parameters (should fail)**
```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/analyze-shop' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shopName": "TestShop"
  }'
```

Expected error:
```json
{
  "error": "Missing required fields: shopName, numberOfProducts"
}
```

**Test 4: Unauthorized (should fail)**
```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/analyze-shop' \
  -H "Content-Type: application/json" \
  -d '{
    "shopName": "TestShop",
    "numberOfProducts": 10
  }'
```

Expected error:
```json
{
  "error": "Missing Authorization header"
}
```

### 2. Testing process-product-csv

#### Step 1: Create Test CSV File

Create a file named `test-products.csv`:

```csv
productId,title,url
PROD-001,Handmade Leather Wallet,https://www.etsy.com/listing/123456
PROD-002,Custom Name Necklace,https://www.etsy.com/listing/234567
PROD-003,Vintage Coffee Mug,https://www.etsy.com/listing/345678
PROD-004,Minimalist Wall Art,https://www.etsy.com/listing/456789
PROD-005,Bohemian Throw Pillow,https://www.etsy.com/listing/567890
```

#### Step 2: Upload CSV to Supabase Storage

```bash
# Using Supabase CLI
supabase storage cp test-products.csv supabase://product-uploads/test-products.csv

# Or use the Supabase Dashboard to upload manually
```

#### Step 3: Create Upload Record

```bash
# First, create the upload record in the database
curl -X POST 'YOUR_PROJECT_URL/rest/v1/product_uploads' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "file_name": "test-products.csv",
    "file_url": "YOUR_STORAGE_URL/product-uploads/test-products.csv"
  }'

# Note the returned 'id' from the response
```

#### Step 4: Process the CSV

```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/process-product-csv' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "UPLOAD_ID_FROM_STEP_3"
  }'
```

#### Expected Response

```json
{
  "success": true,
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "totalProducts": 5,
    "processedCount": 5,
    "products": [
      {
        "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "upload_id": "550e8400-e29b-41d4-a716-446655440000",
        "original_product_id": "PROD-001",
        "product_title": "Handmade Leather Wallet",
        "description": "Beautiful handcrafted Handmade Leather Wallet...",
        "price": 45.99,
        "images": [
          "https://i.etsystatic.com/product-PROD-001-1.jpg",
          "https://i.etsystatic.com/product-PROD-001-2.jpg",
          "https://i.etsystatic.com/product-PROD-001-3.jpg"
        ],
        "variations": [
          {
            "name": "Size",
            "options": ["Small", "Medium", "Large"],
            "prices": {
              "Small": 35,
              "Medium": 45,
              "Large": 55
            }
          },
          {
            "name": "Color",
            "options": ["Black", "White", "Blue", "Red"]
          }
        ],
        "tags": ["handmade", "vintage", "unique", "gift", "leather"],
        "category": "Accessories",
        "shop_info": {
          "shopName": "Shop123",
          "shopUrl": "https://www.etsy.com/shop/Shop123",
          "rating": 4.8
        }
      }
    ]
  }
}
```

#### Test Cases

**Test 1: Invalid upload ID (should fail)**
```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/process-product-csv' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "00000000-0000-0000-0000-000000000000"
  }'
```

Expected error:
```json
{
  "error": "Upload not found"
}
```

**Test 2: Missing uploadId (should fail)**
```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/process-product-csv' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected error:
```json
{
  "error": "Missing required field: uploadId"
}
```

### 3. Testing clone-products

#### Prerequisite: Get Product IDs

First, query the database to get some product IDs:

```bash
curl 'YOUR_PROJECT_URL/rest/v1/product_details?select=id&limit=3' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY"
```

#### Basic Test

```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/clone-products' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": [
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "7c9d2e4f-1234-5678-9abc-def012345678"
    ]
  }'
```

#### Expected Response

```json
{
  "success": true,
  "data": {
    "totalRequested": 2,
    "successfullyCloned": 2,
    "failed": 0,
    "usedAI": false,
    "tokensUsed": 0,
    "products": [
      {
        "id": "8d7c6b5a-4321-8765-9cba-fed210987654",
        "user_id": "user-uuid",
        "original_product_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "generated_title": "Premium Handmade Leather Wallet - Collection",
        "generated_description": "Introducing our premium handmade leather wallet collection!\n\nThis exquisite piece combines quality craftsmanship with modern design sensibilities...",
        "generated_tags": [
          "handmade",
          "vintage",
          "unique",
          "premium",
          "quality",
          "gift-ready"
        ],
        "ai_model_used": "mock",
        "status": "completed",
        "completed_at": "2025-12-19T10:30:00.000Z",
        "original_product": {
          "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "title": "Handmade Leather Wallet"
        }
      }
    ]
  }
}
```

#### Test Cases

**Test 1: Single product**
```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/clone-products' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"]
  }'
```

**Test 2: Multiple products (batch)**
```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/clone-products' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": [
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "7c9d2e4f-1234-5678-9abc-def012345678",
      "8e1f3a5b-2345-6789-0bcd-ef0123456789",
      "9f2g4b6c-3456-7890-1cde-f01234567890"
    ]
  }'
```

**Test 3: Empty array (should fail)**
```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/clone-products' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": []
  }'
```

Expected error:
```json
{
  "error": "Missing or invalid productIds array"
}
```

**Test 4: Non-existent product IDs**
```bash
curl -X POST 'YOUR_PROJECT_URL/functions/v1/clone-products' \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": ["00000000-0000-0000-0000-000000000000"]
  }'
```

Expected error:
```json
{
  "error": "No products found with provided IDs"
}
```

## Automated Testing Script

Create a test script `test-edge-functions.sh`:

```bash
#!/bin/bash

# Configuration
PROJECT_URL="YOUR_PROJECT_URL"
JWT_TOKEN="YOUR_JWT_TOKEN"

echo "=== Testing Etsy Platform Edge Functions ==="
echo ""

# Test 1: Analyze Shop
echo "Test 1: Analyzing shop..."
ANALYSIS_RESPONSE=$(curl -s -X POST "${PROJECT_URL}/functions/v1/analyze-shop" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "shopName": "AutoTestShop",
    "numberOfProducts": 5
  }')

echo "Response: $ANALYSIS_RESPONSE"
echo ""

# Extract shop analysis ID
ANALYSIS_ID=$(echo $ANALYSIS_RESPONSE | jq -r '.data.shopAnalysisId')
echo "Analysis ID: $ANALYSIS_ID"
echo ""

# Test 2: Create test CSV and upload
echo "Test 2: Creating test CSV..."
cat > /tmp/test-products.csv << EOF
productId,title,url
TEST-001,Test Product 1,https://etsy.com/listing/1
TEST-002,Test Product 2,https://etsy.com/listing/2
TEST-003,Test Product 3,https://etsy.com/listing/3
EOF

echo "CSV created. Please upload manually to Supabase Storage and create upload record."
echo ""

# Test 3: Clone products (requires existing product IDs)
echo "Test 3: This test requires existing product IDs in your database."
echo "Run manually with actual product IDs."
echo ""

echo "=== Testing Complete ==="
```

## Database Verification

After running tests, verify the data in the database:

```sql
-- Check shop analyses
SELECT * FROM shop_analyses ORDER BY created_at DESC LIMIT 5;

-- Check analyzed products
SELECT * FROM analyzed_products WHERE shop_analysis_id = 'YOUR_ANALYSIS_ID';

-- Check product uploads
SELECT * FROM product_uploads ORDER BY created_at DESC LIMIT 5;

-- Check product details
SELECT * FROM product_details WHERE upload_id = 'YOUR_UPLOAD_ID';

-- Check cloned products
SELECT * FROM cloned_products ORDER BY created_at DESC LIMIT 5;

-- Check API usage logs
SELECT * FROM api_usage_logs ORDER BY created_at DESC LIMIT 10;
```

## Performance Testing

### Load Test analyze-shop

```bash
# Run 10 concurrent requests
for i in {1..10}; do
  curl -X POST 'YOUR_PROJECT_URL/functions/v1/analyze-shop' \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"shopName\": \"LoadTestShop${i}\",
      \"numberOfProducts\": 10
    }" &
done
wait
```

### Monitor Function Logs

```bash
# Using Supabase CLI
supabase functions logs analyze-shop
supabase functions logs process-product-csv
supabase functions logs clone-products
```

## Common Issues and Solutions

### Issue 1: "Missing Authorization header"

**Solution**: Ensure you're passing the JWT token correctly:
```bash
-H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Issue 2: "Unauthorized"

**Solutions**:
1. Token expired - get a new token
2. Token invalid - verify you're using the access_token from session
3. User not authenticated - sign in first

### Issue 3: Function timeout

**Solutions**:
1. Reduce numberOfProducts for analyze-shop
2. Process CSV in smaller batches
3. Clone fewer products at once

### Issue 4: "Upload not found"

**Solutions**:
1. Verify uploadId is correct
2. Ensure upload belongs to authenticated user
3. Check upload status is 'uploaded'

## API Rate Limiting

Monitor your API usage:

```sql
-- Check usage by provider
SELECT
  api_provider,
  COUNT(*) as request_count,
  SUM(tokens_used) as total_tokens,
  SUM(cost_estimate) as total_cost
FROM api_usage_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY api_provider;

-- Check usage by user
SELECT
  user_id,
  COUNT(*) as request_count,
  SUM(cost_estimate) as total_cost
FROM api_usage_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
ORDER BY total_cost DESC;
```

## Next Steps

After testing:
1. Review function logs for any errors
2. Check database for correct data insertion
3. Verify API usage logs are accurate
4. Test error cases thoroughly
5. Document any issues found
6. Set up monitoring and alerts

## Support

For issues during testing:
- Check Supabase Edge Function logs
- Review database tables for incomplete data
- Verify JWT token is valid and not expired
- Ensure all environment variables are set
- Check CORS errors in browser console
