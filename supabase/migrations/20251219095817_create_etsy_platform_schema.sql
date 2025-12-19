/*
  # Etsy Product Management Platform Database Schema

  1. Tables Created:
    - shop_analyses: Stores shop analysis results
    - analyzed_products: Individual product scores from analyses
    - product_uploads: Tracks CSV uploads
    - product_details: Detailed product information
    - cloned_products: AI-generated product clones
    - cloned_product_images: AI-generated product images
    - api_usage_logs: Track external API usage

  2. Security:
    - RLS enabled on all tables
    - Policies for authenticated users to access own data
*/

-- Shop Analyses Table
CREATE TABLE IF NOT EXISTS shop_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  shop_url text NOT NULL,
  shop_name text NOT NULL,
  total_products integer DEFAULT 0,
  average_score numeric(5,2),
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  export_file_url text,
  email_sent boolean DEFAULT false,
  error_message text
);

ALTER TABLE shop_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shop analyses"
  ON shop_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own shop analyses"
  ON shop_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shop analyses"
  ON shop_analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Analyzed Products Table
CREATE TABLE IF NOT EXISTS analyzed_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_analysis_id uuid REFERENCES shop_analyses(id) ON DELETE CASCADE NOT NULL,
  product_id text NOT NULL,
  product_title text NOT NULL,
  product_url text NOT NULL,
  price numeric(10,2),
  original_price numeric(10,2),
  discount_percentage integer,
  image_url text,
  rating numeric(3,2),
  reviews_count integer DEFAULT 0,
  sales_count integer DEFAULT 0,
  score numeric(5,2) NOT NULL,
  score_breakdown jsonb,
  tier text,
  marked_for_cloning boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analyzed_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyzed products"
  ON analyzed_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shop_analyses
      WHERE shop_analyses.id = analyzed_products.shop_analysis_id
      AND shop_analyses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own analyzed products"
  ON analyzed_products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shop_analyses
      WHERE shop_analyses.id = analyzed_products.shop_analysis_id
      AND shop_analyses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shop_analyses
      WHERE shop_analyses.id = analyzed_products.shop_analysis_id
      AND shop_analyses.user_id = auth.uid()
    )
  );

-- Product Uploads Table
CREATE TABLE IF NOT EXISTS product_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  products_count integer DEFAULT 0,
  products_processed integer DEFAULT 0,
  status text CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')) DEFAULT 'uploaded',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  error_message text
);

ALTER TABLE product_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own product uploads"
  ON product_uploads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own product uploads"
  ON product_uploads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own product uploads"
  ON product_uploads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Product Details Table
CREATE TABLE IF NOT EXISTS product_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid REFERENCES product_uploads(id) ON DELETE CASCADE,
  original_product_id text NOT NULL,
  product_title text NOT NULL,
  description text,
  price numeric(10,2),
  images jsonb,
  variations jsonb,
  tags text[],
  category text,
  shop_info jsonb,
  marked_for_cloning boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own product details"
  ON product_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_uploads
      WHERE product_uploads.id = product_details.upload_id
      AND product_uploads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own product details"
  ON product_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_uploads
      WHERE product_uploads.id = product_details.upload_id
      AND product_uploads.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_uploads
      WHERE product_uploads.id = product_details.upload_id
      AND product_uploads.user_id = auth.uid()
    )
  );

-- Cloned Products Table
CREATE TABLE IF NOT EXISTS cloned_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  original_product_id uuid REFERENCES product_details(id) ON DELETE SET NULL,
  generated_title text,
  generated_description text,
  generated_tags text[],
  ai_model_used text DEFAULT 'google-gemini-1.5-pro',
  status text CHECK (status IN ('generating', 'completed', 'failed')) DEFAULT 'generating',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

ALTER TABLE cloned_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cloned products"
  ON cloned_products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cloned products"
  ON cloned_products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cloned products"
  ON cloned_products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cloned Product Images Table
CREATE TABLE IF NOT EXISTS cloned_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cloned_product_id uuid REFERENCES cloned_products(id) ON DELETE CASCADE NOT NULL,
  variation_name text,
  prompt_used text,
  image_url text NOT NULL,
  generation_provider text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cloned_product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cloned product images"
  ON cloned_product_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cloned_products
      WHERE cloned_products.id = cloned_product_images.cloned_product_id
      AND cloned_products.user_id = auth.uid()
    )
  );

-- API Usage Logs Table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  api_provider text NOT NULL,
  endpoint text,
  tokens_used integer,
  cost_estimate numeric(10,4),
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API usage logs"
  ON api_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shop_analyses_user_id ON shop_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_analyses_status ON shop_analyses(status);
CREATE INDEX IF NOT EXISTS idx_shop_analyses_created_at ON shop_analyses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analyzed_products_shop_analysis_id ON analyzed_products(shop_analysis_id);
CREATE INDEX IF NOT EXISTS idx_analyzed_products_score ON analyzed_products(score DESC);
CREATE INDEX IF NOT EXISTS idx_analyzed_products_marked_for_cloning ON analyzed_products(marked_for_cloning);

CREATE INDEX IF NOT EXISTS idx_product_uploads_user_id ON product_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_product_uploads_status ON product_uploads(status);

CREATE INDEX IF NOT EXISTS idx_product_details_upload_id ON product_details(upload_id);
CREATE INDEX IF NOT EXISTS idx_product_details_marked_for_cloning ON product_details(marked_for_cloning);

CREATE INDEX IF NOT EXISTS idx_cloned_products_user_id ON cloned_products(user_id);
CREATE INDEX IF NOT EXISTS idx_cloned_products_status ON cloned_products(status);
CREATE INDEX IF NOT EXISTS idx_cloned_products_original_product_id ON cloned_products(original_product_id);

CREATE INDEX IF NOT EXISTS idx_cloned_product_images_cloned_product_id ON cloned_product_images(cloned_product_id);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at DESC);
