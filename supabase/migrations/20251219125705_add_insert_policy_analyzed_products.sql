/*
  # Add INSERT policy for analyzed_products

  1. Changes
    - Add INSERT policy for analyzed_products table
    - Allows authenticated users to insert products for their own shop analyses
  
  2. Security
    - Policy checks that the user owns the shop_analysis before allowing insert
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'analyzed_products' 
    AND policyname = 'Users can insert own analyzed products'
  ) THEN
    CREATE POLICY "Users can insert own analyzed products"
      ON analyzed_products
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM shop_analyses
          WHERE shop_analyses.id = analyzed_products.shop_analysis_id
          AND shop_analyses.user_id = auth.uid()
        )
      );
  END IF;
END $$;