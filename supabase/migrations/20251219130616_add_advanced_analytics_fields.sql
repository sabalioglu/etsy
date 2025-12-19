/*
  # Add Advanced Analytics Fields

  1. Changes
    - Add fields from n8n XrayDataProcess (engagement, shop metadata)
    - Add fields from n8n Shop Analytics (scoring, tiers)
  
  2. New Fields
    - Engagement metrics: in_cart_count, num_favorers, review counts
    - Product quality: variation_count, has_video, image_count, is_top_rated
    - Shop metrics: shop_average_rating, is_star_seller, shop_sales
    - Scoring: advanced_sales_score, score_breakdown, product_tier, tier_description
*/

DO $$
BEGIN
  -- Engagement Metrics
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'in_cart_count') THEN
    ALTER TABLE analyzed_products ADD COLUMN in_cart_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'num_favorers') THEN
    ALTER TABLE analyzed_products ADD COLUMN num_favorers integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'num_favorers_source') THEN
    ALTER TABLE analyzed_products ADD COLUMN num_favorers_source text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'num_favorers_confidence') THEN
    ALTER TABLE analyzed_products ADD COLUMN num_favorers_confidence text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'listing_review_photo_count') THEN
    ALTER TABLE analyzed_products ADD COLUMN listing_review_photo_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'listing_review_video_count') THEN
    ALTER TABLE analyzed_products ADD COLUMN listing_review_video_count integer DEFAULT 0;
  END IF;
  
  -- Product Quality Metrics
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'variation_count') THEN
    ALTER TABLE analyzed_products ADD COLUMN variation_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'has_video') THEN
    ALTER TABLE analyzed_products ADD COLUMN has_video boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'image_count') THEN
    ALTER TABLE analyzed_products ADD COLUMN image_count integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'is_top_rated') THEN
    ALTER TABLE analyzed_products ADD COLUMN is_top_rated boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'has_free_shipping') THEN
    ALTER TABLE analyzed_products ADD COLUMN has_free_shipping boolean DEFAULT false;
  END IF;
  
  -- Shop Metrics
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'shop_average_rating') THEN
    ALTER TABLE analyzed_products ADD COLUMN shop_average_rating numeric(3,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'shop_total_rating_count') THEN
    ALTER TABLE analyzed_products ADD COLUMN shop_total_rating_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'is_star_seller') THEN
    ALTER TABLE analyzed_products ADD COLUMN is_star_seller boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'shop_sales') THEN
    ALTER TABLE analyzed_products ADD COLUMN shop_sales integer DEFAULT 0;
  END IF;
  
  -- Advanced Scoring
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'advanced_sales_score') THEN
    ALTER TABLE analyzed_products ADD COLUMN advanced_sales_score integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'score_breakdown') THEN
    ALTER TABLE analyzed_products ADD COLUMN score_breakdown text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'product_tier') THEN
    ALTER TABLE analyzed_products ADD COLUMN product_tier text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'tier_description') THEN
    ALTER TABLE analyzed_products ADD COLUMN tier_description text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'scoring_version') THEN
    ALTER TABLE analyzed_products ADD COLUMN scoring_version text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'is_2025_compliant') THEN
    ALTER TABLE analyzed_products ADD COLUMN is_2025_compliant boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analyzed_products' AND column_name = 'needs_urgent_action') THEN
    ALTER TABLE analyzed_products ADD COLUMN needs_urgent_action boolean DEFAULT false;
  END IF;
END $$;