# Etsy Product Management & Marketing Platform

A comprehensive platform for analyzing, cloning, and marketing Etsy products with AI-powered content generation and video creation.

## Features

### 1. Shop Analyzer
Analyze competitor Etsy shops to identify winning products based on multiple scoring factors.

**Key Features**:
- Scrape and analyze any Etsy shop
- Score products based on sales, reviews, pricing, and engagement
- Export analysis results to CSV
- Email delivery of completed analyses
- Real-time progress tracking

**Metrics Analyzed**:
- Sales velocity
- Review count and ratings
- Price optimization
- Engagement indicators
- Market positioning

### 2. Product Selection
Browse and select high-performing products for cloning from your analyses or CSV uploads.

**Key Features**:
- Filter and sort products by score
- View detailed product information
- Mark products for cloning
- Batch selection tools
- Product tier classification (Gold, Silver, Bronze)

### 3. Product Cloner
Generate AI-powered product listings with unique titles, descriptions, tags, and images.

**Key Features**:
- AI-generated unique content
- Multiple image generation per product
- SEO-optimized titles and descriptions
- Etsy-compliant tag generation
- Real-time generation tracking
- Export to JSON for bulk upload

**AI Models Supported**:
- Google Gemini 1.5 Pro
- Multiple image generation providers
- Configurable creativity levels

### 4. Video Generator (NEW!)
Automatically create professional UGC-style marketing videos for your products.

**Key Features**:
- Intelligent human detection and removal
- AI-powered script generation
- Sora 2 video generation
- Automatic copyright protection
- Batch video processing
- Multiple platform support (Etsy, Pinterest, Instagram, TikTok)

**Video Specifications**:
- Duration: 10-15 seconds
- Format: Landscape (16:9)
- Style: UGC (User Generated Content)
- Quality: High-resolution, watermark-free

**Process**:
1. Detects humans in product images
2. Removes humans for clean product shots
3. Generates engaging video scripts
4. Creates professional videos with Sora 2
5. Handles copyright violations automatically

### 5. History & Tracking
View all your past activities and track generation progress.

**Key Features**:
- Complete audit trail
- Filter by type and status
- Export capabilities
- Performance metrics

## Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Routing**: React Router v7
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Edge Functions**: Supabase Functions (Deno runtime)
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

### AI Services
- **Text Generation**: Google Gemini 2.0 Flash
- **Image Processing**: Google Gemini Image API
- **Image Generation**: SeeDream 4.5, Flux 1.1 Pro
- **Video Generation**: Kie.ai Sora 2 API

### External Services
- **Image Hosting**: Kie.ai CDN
- **Video Processing**: Sora 2 via Kie.ai
- **Web Scraping**: Custom edge functions

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google AI Studio account (for Gemini API)
- Kie.ai account (for video generation)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Edge Function Environment Variables (configured in Supabase)
GEMINI_API_KEY=your_gemini_api_key
KIE_API_KEY=your_kie_api_key
```

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd etsy-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**

The database migrations are already applied. Tables created:
- `shop_analyses` - Shop analysis results
- `analyzed_products` - Individual product scores
- `product_uploads` - CSV upload tracking
- `product_details` - Detailed product information
- `cloned_products` - AI-generated product clones
- `cloned_product_images` - AI-generated images
- `image_generation_jobs` - Image generation tracking
- `generated_images` - Generated image results
- `video_generation_jobs` - Video generation tracking
- `api_usage_logs` - API usage monitoring

4. **Deploy Edge Functions**

Edge functions are already deployed:
- `analyze-shop` - Shop analysis and scraping
- `clone-products` - Product cloning with AI
- `process-product-csv` - CSV processing
- `generate-product-images` - Image generation
- `generate-product-video` - Video generation

5. **Start the development server**
```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

### Build for Production

```bash
npm run build
npm run preview
```

## Application Structure

```
src/
├── components/
│   ├── layout/
│   │   └── Layout.tsx          # Main layout with sidebar
│   └── shared/
│       ├── Badge.tsx            # Status badge component
│       ├── Button.tsx           # Button component
│       ├── Card.tsx             # Card container
│       ├── Input.tsx            # Form input
│       ├── LoadingSpinner.tsx   # Loading indicator
│       └── Modal.tsx            # Modal dialog
├── pages/
│   ├── Dashboard.tsx            # Overview and stats
│   ├── ShopAnalyzer.tsx         # Shop analysis page
│   ├── ProductSelection.tsx     # Product selection page
│   ├── ProductCloner.tsx        # Product cloning page
│   ├── VideoGenerator.tsx       # Video generation page
│   └── History.tsx              # Activity history
├── lib/
│   ├── api.ts                   # API functions
│   └── supabase.ts              # Supabase client
├── App.tsx                      # Main app component
└── main.tsx                     # Entry point

supabase/
├── migrations/
│   ├── 20251219095817_create_etsy_platform_schema.sql
│   ├── 20251219110000_create_image_generation_schema.sql
│   └── 20251219120000_create_video_generation_schema.sql
└── functions/
    ├── analyze-shop/
    ├── clone-products/
    ├── process-product-csv/
    ├── generate-product-images/
    └── generate-product-video/
```

## User Flow

### Complete Workflow

1. **Analyze Competitor Shops**
   - Enter shop URL and number of products
   - System scrapes and analyzes products
   - Receive CSV export via email

2. **Select Products to Clone**
   - Upload CSV or view analyzed products
   - Filter by score and metrics
   - Mark products for cloning

3. **Generate AI Content**
   - Configure AI settings
   - Generate unique titles, descriptions, and tags
   - Generate product images
   - Preview and export results

4. **Create Marketing Videos**
   - Select cloned products
   - Generate UGC-style videos automatically
   - Download videos for marketing

5. **Use Content**
   - Upload to Etsy listings
   - Share on social media
   - Use in advertising campaigns

## API Reference

### Shop Analysis

```typescript
// Start shop analysis
const analysis = await analyzeShop(
  'https://www.etsy.com/shop/shopname',
  'Shop Name',
  50 // number of products
)

// Get analysis results
const products = await getAnalyzedProducts(analysis.id)

// Subscribe to updates
const channel = await subscribeToAnalysis(analysis.id, (payload) => {
  console.log('Analysis updated:', payload.new)
})
```

### Product Cloning

```typescript
// Clone selected products
const results = await cloneProducts(['product-id-1', 'product-id-2'])

// Get cloned products
const clonedProducts = await getClonedProducts()

// Subscribe to new clones
const channel = await subscribeToClonedProducts(userId, (payload) => {
  console.log('New product cloned:', payload.new)
})
```

### Image Generation

```typescript
// Generate images for a product
const job = await generateProductImages({
  productId: 'uuid',
  listingId: '123456',
  productTitle: 'My Product',
  productUrl: 'https://...',
  images: [
    { index: 1, url: 'https://...' },
    { index: 2, url: 'https://...' }
  ]
})

// Get generation job
const jobDetails = await getImageGenerationJob(job.jobId)

// Subscribe to job updates
const channel = await subscribeToImageJob(job.jobId, (payload) => {
  console.log('Job updated:', payload.new)
})
```

### Video Generation

```typescript
// Generate video for a product
const video = await generateProductVideo({
  clonedProductId: 'uuid',
  listingId: '123456',
  productTitle: 'My Product',
  productDescription: 'Description...',
  productTags: ['tag1', 'tag2'],
  heroImageUrl: 'https://...'
})

// Get video jobs
const jobs = await getVideoGenerationJobs()

// Subscribe to job updates
const channel = await subscribeToVideoJob(video.jobId, (payload) => {
  console.log('Video job updated:', payload.new)
})
```

## Database Schema

### Key Tables

**shop_analyses**
- Stores shop analysis results and metadata
- Tracks analysis status and completion

**analyzed_products**
- Individual product scores from analyses
- Includes all metrics and tier classification

**cloned_products**
- AI-generated product clones
- Stores generated titles, descriptions, tags

**cloned_product_images**
- AI-generated product images
- Links to cloned products

**image_generation_jobs**
- Tracks image generation requests
- Monitors progress and results

**generated_images**
- Individual generated image results
- Status tracking per image

**video_generation_jobs**
- Tracks video generation requests
- Stores scripts, URLs, and metadata

### Security

All tables use Row Level Security (RLS):
- Users can only access their own data
- Policies enforce user_id matching
- Authenticated access required

## Performance Optimization

### Image Generation
- Batch processing: 5 images per request
- Retry logic: 3 attempts per image
- Status tracking: Real-time updates
- Caching: Generated images stored permanently

### Video Generation
- Smart image processing: Only edit if human detected
- Parallel processing: Multiple videos at once
- Automatic retries: Handles copyright violations
- Efficient polling: 10-second intervals

### Database
- Indexed columns: user_id, status, created_at
- Optimized queries: Selective field retrieval
- Real-time subscriptions: Postgres changes
- Connection pooling: Supabase managed

## Cost Estimation

### Per Product Clone
- AI text generation: $0.05
- Image generation (10 images): $0.50
- Total: ~$0.55

### Per Video
- Image processing: $0.02
- Script generation: $0.03
- Video generation: $0.20
- Total: ~$0.25

### Monthly Estimates (100 products)
- Product cloning: $55
- Video generation: $25
- Database/storage: $10
- Total: ~$90/month

## Troubleshooting

### Common Issues

**Issue**: Database migration errors
**Solution**: Check Supabase connection and RLS policies

**Issue**: Image generation fails
**Solution**: Verify API keys in environment variables

**Issue**: Video generation timeout
**Solution**: Normal for first video, wait 5 minutes max

**Issue**: Real-time updates not working
**Solution**: Check browser console for WebSocket errors

### Debug Mode

Enable detailed logging:
```javascript
localStorage.setItem('debug', 'true')
```

View edge function logs in Supabase dashboard.

## Contributing

### Development Guidelines

1. Follow TypeScript best practices
2. Use functional components with hooks
3. Keep components small and focused
4. Write descriptive commit messages
5. Test edge functions thoroughly

### Code Style

- Use Prettier for formatting
- Follow ESLint rules
- Use meaningful variable names
- Add comments for complex logic

## Documentation

- **VIDEO_GENERATION_GUIDE.md** - Complete video generation documentation
- **INTEGRATION_GUIDE.md** - API integration guide
- **COMPONENTS_SUMMARY.md** - UI component documentation
- **EDGE_FUNCTIONS_DOCUMENTATION.md** - Edge function details

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
1. Check documentation
2. Review error messages
3. Check browser console
4. Contact development team

## Roadmap

### Version 2.0 (Q1 2025)
- [ ] Direct Etsy API integration
- [ ] Automated listing creation
- [ ] Pinterest auto-posting
- [ ] Instagram integration
- [ ] TikTok auto-posting

### Version 2.1 (Q2 2025)
- [ ] A/B testing tools
- [ ] Analytics dashboard
- [ ] Performance tracking
- [ ] Revenue attribution
- [ ] Competitor monitoring

### Version 3.0 (Q3 2025)
- [ ] Multi-platform marketplace support
- [ ] Advanced AI customization
- [ ] Team collaboration features
- [ ] White-label options
- [ ] API for third-party integrations

## Acknowledgments

- Supabase for backend infrastructure
- Google for Gemini AI API
- Kie.ai for Sora 2 video generation
- React and Vite communities
- Tailwind CSS team

---

**Built with ❤️ for Etsy sellers**

For the latest updates and releases, visit the repository.
