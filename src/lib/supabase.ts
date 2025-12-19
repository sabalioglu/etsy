import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      shop_analyses: {
        Row: {
          id: string
          user_id: string
          shop_url: string
          shop_name: string
          total_products: number
          average_score: number | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
          completed_at: string | null
          export_file_url: string | null
          email_sent: boolean
          error_message: string | null
        }
        Insert: Omit<Database['public']['Tables']['shop_analyses']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['shop_analyses']['Insert']>
      }
      analyzed_products: {
        Row: {
          id: string
          shop_analysis_id: string
          product_id: string
          product_title: string
          product_url: string
          price: number | null
          original_price: number | null
          discount_percentage: number | null
          image_url: string | null
          rating: number | null
          reviews_count: number
          sales_count: number
          score: number
          score_breakdown: Record<string, any> | null
          tier: string | null
          marked_for_cloning: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['analyzed_products']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['analyzed_products']['Insert']>
      }
      product_uploads: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_url: string
          products_count: number
          products_processed: number
          status: 'uploaded' | 'processing' | 'completed' | 'failed'
          created_at: string
          processed_at: string | null
          error_message: string | null
        }
        Insert: Omit<Database['public']['Tables']['product_uploads']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['product_uploads']['Insert']>
      }
      product_details: {
        Row: {
          id: string
          upload_id: string | null
          original_product_id: string
          product_title: string
          description: string | null
          price: number | null
          images: Record<string, any> | null
          variations: Record<string, any> | null
          tags: string[] | null
          category: string | null
          shop_info: Record<string, any> | null
          marked_for_cloning: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['product_details']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['product_details']['Insert']>
      }
      cloned_products: {
        Row: {
          id: string
          user_id: string
          original_product_id: string | null
          generated_title: string | null
          generated_description: string | null
          generated_tags: string[] | null
          ai_model_used: string
          status: 'generating' | 'completed' | 'failed'
          created_at: string
          completed_at: string | null
          error_message: string | null
        }
        Insert: Omit<Database['public']['Tables']['cloned_products']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['cloned_products']['Insert']>
      }
      cloned_product_images: {
        Row: {
          id: string
          cloned_product_id: string
          variation_name: string | null
          prompt_used: string | null
          image_url: string
          generation_provider: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['cloned_product_images']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['cloned_product_images']['Insert']>
      }
      api_usage_logs: {
        Row: {
          id: string
          user_id: string | null
          api_provider: string
          endpoint: string | null
          tokens_used: number | null
          cost_estimate: number | null
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['api_usage_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['api_usage_logs']['Insert']>
      }
    }
  }
}
