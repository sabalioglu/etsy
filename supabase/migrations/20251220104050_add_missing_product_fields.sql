/*
  # Add Missing Product Fields
  
  1. New Columns
    - `last_sale_hours_ago` (integer) - Hours since last sale
    - `listing_age_days` (integer) - Age of the listing in days
    - `is_bestseller` (boolean) - Whether product is marked as bestseller
    - `is_personalizable` (boolean) - Whether product can be personalized
    - `stock_quantity` (integer) - Available stock quantity
    - `processing_time_days` (text) - Processing time description
    - `variations_text` (text) - Variation description (e.g., "2 variations")
  
  2. Changes
    - Add default values for new boolean and integer fields
    - Make fields nullable where appropriate
*/

-- Add missing fields to analyzed_products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyzed_products' AND column_name = 'last_sale_hours_ago'
  ) THEN
    ALTER TABLE analyzed_products ADD COLUMN last_sale_hours_ago integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyzed_products' AND column_name = 'listing_age_days'
  ) THEN
    ALTER TABLE analyzed_products ADD COLUMN listing_age_days integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyzed_products' AND column_name = 'is_bestseller'
  ) THEN
    ALTER TABLE analyzed_products ADD COLUMN is_bestseller boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyzed_products' AND column_name = 'is_personalizable'
  ) THEN
    ALTER TABLE analyzed_products ADD COLUMN is_personalizable boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyzed_products' AND column_name = 'stock_quantity'
  ) THEN
    ALTER TABLE analyzed_products ADD COLUMN stock_quantity integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyzed_products' AND column_name = 'processing_time_days'
  ) THEN
    ALTER TABLE analyzed_products ADD COLUMN processing_time_days text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analyzed_products' AND column_name = 'variations_text'
  ) THEN
    ALTER TABLE analyzed_products ADD COLUMN variations_text text;
  END IF;
END $$;