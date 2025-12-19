# Complete Setup Guide - Going Live Checklist

## Authentication Setup ✅

Authentication has been implemented and is now working! Here's what was added:

### New Components
- **Login Page** (`src/pages/Login.tsx`) - Sign in and sign up functionality
- **Protected Routes** (`src/components/ProtectedRoute.tsx`) - Prevents unauthorized access
- **Sign Out Button** - Added to user menu in header

### How Authentication Works
1. Users must sign up or sign in to access the app
2. All routes except `/login` are protected
3. Sign out button logs users out and redirects to login

---

## Required API Keys & Secrets

### 1. Frontend Environment Variables (.env)

Create a `.env` file in the root directory with:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**How to Get These:**
1. Go to your Supabase project dashboard
2. Click on Settings → API
3. Copy the "Project URL" → Use as `VITE_SUPABASE_URL`
4. Copy the "anon public" key → Use as `VITE_SUPABASE_ANON_KEY`

---

### 2. Supabase Edge Function Secrets

These must be configured in your Supabase dashboard under Settings → Edge Functions → Secrets:

#### Required Secrets:

| Secret Name | Purpose | Where to Get It |
|------------|---------|-----------------|
| `GEMINI_API_KEY` | Google Gemini AI for text generation, image analysis, video scripts | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `KIE_API_KEY` | Kie.ai API for Sora 2 video generation and image hosting | [Kie.ai Dashboard](https://kieai.redpandaai.co) |

**How to Add Secrets in Supabase:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → Edge Functions
3. Scroll to "Function Secrets" section
4. Click "Add secret"
5. Enter name and value
6. Click "Save"

---

## Step-by-Step Setup Instructions

### Step 1: Create Supabase Project
```bash
# If you haven't already:
1. Go to https://supabase.com
2. Click "New Project"
3. Name your project
4. Set a database password (save this!)
5. Wait for project to be created (~2 minutes)
```

### Step 2: Configure Environment Variables

**Frontend (.env file):**
```bash
# Create .env file in project root
cat > .env << EOF
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EOF
```

### Step 3: Get Google Gemini API Key

```bash
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Select "Create API key in new project" or use existing project
4. Copy the API key
5. Save it for Step 5
```

**Features Requiring Gemini API:**
- Product content generation (titles, descriptions, tags)
- Shop analysis and scoring
- Image generation prompts
- Video script generation
- Human detection in images
- Image editing (removing humans)

**Cost Estimate:**
- Text generation: ~$0.05 per product
- Image analysis: ~$0.02 per image
- Very low cost for typical usage

### Step 4: Get Kie.ai API Key

```bash
1. Go to https://kieai.redpandaai.co
2. Sign up for an account
3. Navigate to API settings or dashboard
4. Generate API key
5. Copy the API key
6. Save it for Step 5
```

**Features Requiring Kie.ai:**
- Video generation with Sora 2
- Image hosting and CDN delivery
- Video status polling

**Cost Estimate:**
- Video generation: ~$0.20 per video
- Image hosting: Free (included)

### Step 5: Add Secrets to Supabase

```bash
1. Open Supabase dashboard → Your Project
2. Go to Settings → Edge Functions
3. Scroll to "Function Secrets"
4. Add these two secrets:

   Name: GEMINI_API_KEY
   Value: [paste your Google Gemini API key]

   Name: KIE_API_KEY
   Value: [paste your Kie.ai API key]

5. Click "Save" for each secret
```

### Step 6: Enable Supabase Auth

The authentication is already configured in code, but you need to ensure email auth is enabled:

```bash
1. Go to Supabase dashboard → Authentication → Providers
2. Ensure "Email" provider is enabled
3. Configure email templates (optional but recommended):
   - Go to Authentication → Email Templates
   - Customize confirmation email (optional)
   - Customize password reset email (optional)
```

**Email Confirmation Settings:**
- By default, email confirmation is DISABLED in the code
- Users can sign up and log in immediately
- To enable email confirmation:
  1. Go to Authentication → Settings
  2. Enable "Enable email confirmations"
  3. Users will need to confirm email before login

### Step 7: Deploy to Production

**Option A: Deploy to Netlify**
```bash
# Build the app
npm run build

# Deploy to Netlify
# 1. Go to https://netlify.com
# 2. Drag and drop the 'dist' folder
# 3. Add environment variables in Site Settings → Environment
```

**Option B: Deploy to Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Redeploy with env vars
vercel --prod
```

**Option C: Deploy to custom hosting**
```bash
# Build
npm run build

# Upload 'dist' folder to your hosting
# Add environment variables in hosting dashboard
```

---

## Verification Checklist

### Before Going Live

- [ ] Supabase project created
- [ ] `.env` file configured with Supabase URL and anon key
- [ ] `GEMINI_API_KEY` added to Supabase secrets
- [ ] `KIE_API_KEY` added to Supabase secrets
- [ ] Database migrations applied (should already be done)
- [ ] Edge functions deployed (should already be done)
- [ ] Email auth enabled in Supabase
- [ ] App builds successfully (`npm run build`)
- [ ] Test user account created

### After Deployment

- [ ] Open app URL
- [ ] Sign up with test account
- [ ] Verify email (if enabled)
- [ ] Log in successfully
- [ ] Test shop analyzer (should work now!)
- [ ] Test product cloner
- [ ] Test video generator
- [ ] Test sign out

---

## Testing the Setup

### 1. Test Authentication

```bash
# Start dev server
npm run dev

# Open http://localhost:5173
# You should be redirected to /login

# Sign up with test account:
Email: test@example.com
Password: testpassword123

# You should be logged in and see the dashboard
```

### 2. Test Shop Analyzer

```bash
# Go to Shop Analyzer page
# Enter an Etsy shop URL: https://www.etsy.com/shop/[shopname]
# Enter number of products: 10
# Click "Start Analysis"

# You should see:
# - Status changes to "Processing"
# - Progress updates
# - CSV export when complete
```

### 3. Test Product Cloner

```bash
# Go to Product Selection
# Select products from your analysis
# Go to Product Cloner
# Click "Start Cloning"

# You should see:
# - Products being generated
# - Real-time status updates
# - Completed products with images
```

### 4. Test Video Generator

```bash
# Go to Video Generator
# Select cloned products
# Click "Generate Videos"

# You should see:
# - Status: Analyzing image
# - Status: Generating script
# - Status: Creating video
# - Status: Completed
# - Video ready for download
```

---

## Common Issues & Solutions

### Issue 1: "Not authenticated" Error

**Cause:** User is not logged in or session expired

**Solution:**
1. Make sure you created a user account (sign up)
2. Log in with your credentials
3. Check that `.env` has correct Supabase URL and anon key

### Issue 2: "Missing Supabase environment variables"

**Cause:** `.env` file missing or incorrect

**Solution:**
```bash
# Check if .env exists
ls -la .env

# If not, create it:
cat > .env << EOF
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EOF

# Restart dev server
npm run dev
```

### Issue 3: Shop Analyzer fails immediately

**Cause:** Missing `GEMINI_API_KEY` in Supabase secrets

**Solution:**
1. Go to Supabase dashboard → Settings → Edge Functions
2. Check if `GEMINI_API_KEY` exists
3. If not, add it with your Google Gemini API key
4. Wait 1-2 minutes for edge functions to reload
5. Try again

### Issue 4: Video generation fails

**Cause:** Missing `KIE_API_KEY` in Supabase secrets

**Solution:**
1. Go to Supabase dashboard → Settings → Edge Functions
2. Check if `KIE_API_KEY` exists
3. If not, add it with your Kie.ai API key
4. Wait 1-2 minutes for edge functions to reload
5. Try again

### Issue 5: Edge function timeout

**Cause:** API keys might be invalid or quota exceeded

**Solution:**
1. Check Supabase dashboard → Functions → Logs
2. Look for specific error messages
3. Verify API keys are correct
4. Check API quotas:
   - Google Gemini: https://aistudio.google.com/app/apikey
   - Kie.ai: Check your dashboard

---

## Cost Breakdown

### Monthly Estimates (for 100 products)

**Supabase (Free Tier):**
- Database: Free (up to 500 MB)
- Auth: Free (up to 50,000 MAU)
- Edge Functions: Free (up to 500,000 invocations)
- Storage: Free (up to 1 GB)

**Google Gemini API:**
- Text generation: ~$5 (100 products × $0.05)
- Image analysis: ~$2 (100 images × $0.02)
- Total: ~$7/month

**Kie.ai API:**
- Video generation: ~$20 (100 videos × $0.20)
- Image hosting: Free
- Total: ~$20/month

**Grand Total: ~$27/month for 100 products**

---

## Production Checklist

### Security

- [ ] Never commit `.env` file to git (already in .gitignore)
- [ ] Use environment variables for all secrets
- [ ] Enable Supabase RLS policies (already done)
- [ ] Use HTTPS only in production
- [ ] Set up proper CORS in edge functions (already done)

### Performance

- [ ] Enable caching in hosting platform
- [ ] Use CDN for static assets
- [ ] Monitor database query performance
- [ ] Set up error tracking (Sentry, etc.)

### Monitoring

- [ ] Check Supabase dashboard daily
- [ ] Monitor API costs weekly
- [ ] Review edge function logs
- [ ] Track user signups and activity

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Create .env file
# (Add your Supabase URL and anon key)

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Support Resources

### Documentation
- Main README: `/README.md`
- Video Generation Guide: `/VIDEO_GENERATION_GUIDE.md`
- Implementation Summary: `/FINAL_IMPLEMENTATION_SUMMARY.md`

### External Docs
- [Supabase Documentation](https://supabase.com/docs)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Kie.ai API Docs](https://docs.kie.ai)

### Getting Help
1. Check edge function logs in Supabase dashboard
2. Check browser console for frontend errors
3. Review this setup guide
4. Check the troubleshooting section in README.md

---

## You're All Set! 🎉

Once you've completed all the steps above:

1. **Authentication works** - Users can sign up and log in
2. **Shop Analyzer works** - Can analyze Etsy shops
3. **Product Cloner works** - Can generate AI content
4. **Video Generator works** - Can create marketing videos

Your app is ready to go live and help Etsy sellers scale their business!

---

**Last Updated:** December 19, 2024
**Version:** 1.0.0
**Status:** Production Ready ✅
