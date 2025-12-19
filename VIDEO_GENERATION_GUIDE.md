# Video Generation Feature - Complete Guide

## Overview

The Video Generation feature automatically creates professional UGC-style (User Generated Content) marketing videos for your Etsy products. These videos are optimized for platforms like Etsy, Pinterest, Instagram, and TikTok.

## Features

### Intelligent Image Processing
- **Human Detection**: Automatically detects if product images contain people
- **Smart Editing**: Removes humans from images to create clean product hero shots
- **Image Optimization**: Compresses and optimizes images for faster processing

### AI-Powered Script Generation
- **UGC-Style Scripts**: Creates authentic, viral-worthy video scripts
- **Person Integration**: Scripts include a realistic person showcasing your product
- **Platform-Optimized**: Scripts designed for social media engagement

### Video Generation with Sora 2
- **High-Quality Videos**: 10-15 second videos in landscape format
- **Automatic Retries**: Handles copyright violations by sanitizing prompts
- **Trademark Protection**: Automatically removes copyrighted content

## How It Works

### Step-by-Step Process

1. **Select Products**
   - Choose from your cloned products
   - Each product must have at least one image
   - Select multiple products for batch processing

2. **Image Processing**
   ```
   Download Image → Detect Human → Edit if Needed → Upload Processed Image
   ```
   - **Human Detection**: Uses Google Gemini to detect realistic humans
   - **Image Editing**: Removes humans while preserving product quality
   - **Optimization**: Resizes and compresses images

3. **Script Generation**
   - Analyzes product title, description, and tags
   - Creates engaging UGC-style video prompt
   - Includes person description, camera angles, and voiceover dialogue
   - **Trademark Protection**: Replaces brand names with generic terms

4. **Video Creation**
   - Sends request to Sora 2 API via Kie.ai
   - Polls for completion (max 5 minutes)
   - Handles guardrail violations automatically
   - Downloads final video

5. **Completion**
   - Video URL saved to database
   - Thumbnail generated automatically
   - Ready for download and use

## Usage Guide

### Generating Videos

1. **Navigate to Video Generator**
   - Click "Video Generator" in the sidebar
   - View your completed cloned products

2. **Select Products**
   - Check the boxes next to products
   - Or click "Select All" for batch processing
   - View estimated cost before proceeding

3. **Start Generation**
   - Click "Generate Videos"
   - Monitor progress in real-time
   - Status updates show current stage

4. **View Results**
   - Completed videos appear in the jobs list
   - Click play button to preview
   - Download videos for use

### Status Indicators

| Status | Meaning |
|--------|---------|
| **Queued** | Waiting to start |
| **Analyzing Image** | Detecting humans in image |
| **Editing Image** | Removing humans from image |
| **Writing Script** | Generating video script |
| **Creating Video** | Generating video with Sora 2 |
| **Completed** | Video ready for download |
| **Failed** | Generation failed (see error message) |

### Video Specifications

- **Duration**: 10-15 seconds
- **Format**: Landscape (16:9)
- **Resolution**: High quality (Sora 2 default)
- **Watermark**: Automatically removed
- **File Type**: MP4

## Advanced Features

### Automatic Retry Logic

If video generation fails due to copyright violations:

1. **Detection**: System detects guardrail violation
2. **Sanitization**: AI rewrites prompt to remove copyrighted content
3. **Regeneration**: Creates new video with clean prompt
4. **No User Action**: Happens automatically

### Trademark Protection Examples

| Original | Sanitized |
|----------|-----------|
| Spider-Man | web-slinging hero in red and blue suit |
| Harry Potter | young wizard with round glasses and wand |
| Star Wars | space-themed warrior |
| Disney Princess | fairy tale character |
| Pokemon | colorful creature with special powers |

### Image Processing Intelligence

**Scenario 1: Product with Human**
```
Original Image (person holding product)
  ↓
Human Detection: YES
  ↓
Image Editing: Remove person, center product
  ↓
Result: Clean product hero shot
```

**Scenario 2: Product Without Human**
```
Original Image (product only)
  ↓
Human Detection: NO
  ↓
Image Optimization: Resize and compress
  ↓
Result: Optimized product image
```

## API Integration

### Database Schema

```sql
video_generation_jobs
- id: uuid
- user_id: uuid
- cloned_product_id: uuid
- listing_id: text
- product_title: text
- hero_image_url: text
- edited_image_url: text (nullable)
- video_script: text (nullable)
- video_url: text (nullable)
- thumbnail_url: text (nullable)
- status: enum
- human_detected: boolean
- image_edited: boolean
- sora_task_id: text (nullable)
- error_message: text (nullable)
- created_at: timestamp
- completed_at: timestamp (nullable)
```

### Edge Function

**Endpoint**: `generate-product-video`

**Request**:
```json
{
  "jobId": "uuid",
  "listingId": "string",
  "productTitle": "string",
  "productDescription": "string",
  "productTags": ["tag1", "tag2"],
  "heroImageUrl": "https://..."
}
```

**Response**:
```json
{
  "success": true,
  "videoUrl": "https://...",
  "jobId": "uuid"
}
```

### Client-Side API

```typescript
// Generate video for a single product
const result = await generateProductVideo({
  clonedProductId: 'uuid',
  listingId: '123456',
  productTitle: 'My Product',
  productDescription: 'Description...',
  productTags: ['tag1', 'tag2'],
  heroImageUrl: 'https://...'
})

// Generate videos for multiple products
const results = await generateVideosFromProducts(products)

// Subscribe to job updates
const channel = await subscribeToVideoJob(jobId, (payload) => {
  console.log('Job updated:', payload.new)
})
```

## Best Practices

### Product Selection

✅ **DO**:
- Choose products with clear, high-quality images
- Use hero images that showcase the product well
- Select products with descriptive titles and tags
- Generate videos for multiple products at once

❌ **DON'T**:
- Use low-resolution images
- Select products without images
- Generate videos for copyrighted character products without sanitization

### Script Optimization

✅ **DO**:
- Write detailed product descriptions
- Include relevant tags
- Use emotional language in descriptions
- Highlight unique selling points

❌ **DON'T**:
- Use trademarked names directly
- Include celebrity references
- Use copyrighted character names

### Video Usage

**Best Platforms**:
- Etsy listings (as product video)
- Pinterest Pins (for traffic)
- Instagram Reels (for engagement)
- TikTok (for virality)
- Facebook/Instagram ads

**Video Placement**:
- Etsy: Upload as first product video
- Pinterest: Create Pin with video
- Instagram: Post as Reel with product link
- TikTok: Post with link in bio

## Troubleshooting

### Common Issues

**Problem**: Video generation fails immediately
- **Check**: Product has valid hero image URL
- **Solution**: Ensure cloned product has generated images

**Problem**: Stuck at "Creating Video" for too long
- **Expected**: Can take 3-5 minutes
- **Action**: Wait up to 5 minutes before considering it failed

**Problem**: Copyright violation error
- **Automatic**: System will retry with sanitized prompt
- **Manual**: Edit product title/description to remove brand names

**Problem**: No products available
- **Solution**: Clone products first using Product Cloner
- **Requirement**: Products must have status "completed"

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "No hero image found" | Product missing images | Regenerate product images |
| "Guardrail violation" | Copyright content detected | System auto-retries (no action needed) |
| "Video generation timeout" | Took longer than 5 minutes | Retry generation |
| "Image download failed" | Invalid image URL | Check product image URLs |

## Performance & Costs

### Processing Time

- **Single Video**: 3-5 minutes
- **Batch (10 videos)**: 30-50 minutes (parallel)
- **Image Processing**: 30-60 seconds
- **Script Generation**: 10-20 seconds
- **Video Creation**: 2-4 minutes

### Estimated Costs

- **Per Video**: ~$0.25 USD
- **Breakdown**:
  - Image processing: $0.02
  - Script generation: $0.03
  - Video generation: $0.20

### API Usage

**Google Gemini API**:
- Human detection: 1 call per video
- Image editing: 1 call per video (if human detected)
- Image optimization: 1 call per video (if no human)
- Script generation: 1 call per video
- Prompt sanitization: 1 call per retry

**Kie.ai Sora 2 API**:
- Video creation: 1 call per video
- Status polling: ~15-30 calls per video

## Future Enhancements

### Planned Features

- [ ] Multiple aspect ratios (9:16 vertical, 1:1 square)
- [ ] Custom video duration (5s, 10s, 15s, 30s)
- [ ] Voiceover generation (text-to-speech)
- [ ] Background music selection
- [ ] Caption/subtitle overlay
- [ ] Batch download (ZIP export)
- [ ] Direct upload to Etsy
- [ ] A/B testing different scripts
- [ ] Analytics integration

### Experimental Features

- [ ] AI person selection (gender, age, ethnicity)
- [ ] Multiple video variations per product
- [ ] Custom camera angles
- [ ] Brand logo overlay
- [ ] Trending sound integration

## Technical Details

### Dependencies

**Frontend**:
- React 18
- TypeScript
- Lucide React (icons)
- React Router (navigation)

**Backend**:
- Supabase (database, auth, functions)
- Google Gemini 2.0 Flash (AI processing)
- Kie.ai Sora 2 API (video generation)

**Edge Function**:
- Deno runtime
- Supabase client
- Fetch API for external calls

### Security

- **Authentication**: All requests require valid JWT
- **RLS Policies**: Users can only access their own videos
- **API Keys**: Stored as environment variables
- **Data Privacy**: No user data shared with third parties

### Monitoring

**Database Indexes**:
- `user_id` for fast user queries
- `status` for filtering jobs
- `created_at` for sorting

**Real-Time Updates**:
- Postgres changes subscriptions
- Automatic UI updates
- No polling needed

## Support

### Getting Help

1. Check this documentation
2. Review error messages in UI
3. Check browser console for details
4. Contact support with job ID

### Debugging

**Enable Debug Mode**:
```javascript
localStorage.setItem('debug', 'true')
```

**View Job Details**:
```javascript
// In browser console
const job = await supabase
  .from('video_generation_jobs')
  .select('*')
  .eq('id', 'YOUR_JOB_ID')
  .single()
console.log(job)
```

## Conclusion

The Video Generation feature provides a complete, automated solution for creating professional marketing videos for your Etsy products. With intelligent image processing, AI-powered script generation, and automatic retry logic, it handles the complexity so you can focus on growing your business.

For questions or support, refer to the main application documentation or contact the development team.
