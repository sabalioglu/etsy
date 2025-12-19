/*
  # Video Generation Schema

  1. New Tables
    - video_generation_jobs: Track video generation requests
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - cloned_product_id (uuid, references cloned_products)
      - listing_id (text)
      - product_title (text)
      - hero_image_url (text)
      - video_script (text)
      - video_url (text)
      - thumbnail_url (text)
      - status (text: pending, detecting_human, editing_image, generating_script, generating_video, completed, failed)
      - human_detected (boolean)
      - image_edited (boolean)
      - sora_task_id (text)
      - generation_time_seconds (integer)
      - error_message (text)
      - retry_count (integer)
      - created_at (timestamptz)
      - completed_at (timestamptz)

  2. Security
    - Enable RLS on video_generation_jobs table
    - Add policies for authenticated users to access their own video jobs
*/

CREATE TABLE IF NOT EXISTS video_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  cloned_product_id uuid REFERENCES cloned_products(id) ON DELETE SET NULL,
  listing_id text NOT NULL,
  product_title text NOT NULL,
  hero_image_url text NOT NULL,
  edited_image_url text,
  video_script text,
  video_url text,
  thumbnail_url text,
  status text CHECK (status IN ('pending', 'detecting_human', 'editing_image', 'generating_script', 'generating_video', 'completed', 'failed')) DEFAULT 'pending',
  human_detected boolean DEFAULT false,
  image_edited boolean DEFAULT false,
  sora_task_id text,
  generation_time_seconds integer,
  error_message text,
  retry_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE video_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own video generation jobs"
  ON video_generation_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own video generation jobs"
  ON video_generation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video generation jobs"
  ON video_generation_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_generation_jobs_user_id ON video_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generation_jobs_status ON video_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_generation_jobs_cloned_product_id ON video_generation_jobs(cloned_product_id);
CREATE INDEX IF NOT EXISTS idx_video_generation_jobs_created_at ON video_generation_jobs(created_at DESC);
