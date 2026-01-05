# Deployment Guide

This guide covers different hosting options for your survey application.

## Architecture Overview

Your application has two components:
1. **React Frontend** (port 3000) - The survey interface
2. **Express Backend** (port 3001) - Image generation API with OpenAI DALL-E

## Recommended Hosting Options

### Option 1: Vercel + Railway (Recommended - Easiest)

**Best for**: Quick deployment with minimal configuration

**Frontend (Vercel)**:
- Free tier available
- Automatic deployments from GitHub
- Great performance with CDN
- Custom domains supported

**Backend (Railway)**:
- Free $5/month credit (enough for development)
- Easy environment variable management
- Supports Node.js backend
- Automatic deployments from GitHub

**Pros**:
- Easiest to set up
- Free tier available
- Separate scaling for frontend/backend
- Automatic SSL certificates

**Cons**:
- Two separate services to manage
- Backend may sleep on free tier (Railway)

**Cost**: Free to start, ~$5-10/month for production

---

### Option 2: Netlify + Netlify Functions

**Best for**: All-in-one solution on single platform

**How it works**:
- Frontend hosted on Netlify
- Backend converted to Netlify serverless functions
- Single deployment platform

**Pros**:
- Single platform for everything
- Free tier available
- Automatic SSL
- Easy custom domains

**Cons**:
- Requires converting Express server to serverless functions
- Cold starts on serverless functions

**Cost**: Free tier available, ~$19/month for Pro features

---

### Option 3: Render (All-in-One)

**Best for**: Simple full-stack deployment

**How it works**:
- Deploy both frontend and backend on Render
- Use Render's web service for backend
- Use Render's static site for frontend

**Pros**:
- Single platform
- Free tier available
- Easy environment variables
- PostgreSQL database hosting available

**Cons**:
- Free tier has limitations (spins down after inactivity)
- Slower than Vercel/Netlify for static content

**Cost**: Free tier available, ~$7/month per service for always-on

---

### Option 4: DigitalOcean App Platform

**Best for**: More control, production-ready

**How it works**:
- Deploy full application to DigitalOcean
- Automatic scaling
- Built-in monitoring

**Pros**:
- Professional-grade hosting
- Good documentation
- Scalable
- Can host Postgres database too

**Cons**:
- No free tier
- More complex setup

**Cost**: ~$12/month minimum

---

## My Recommendation: Vercel + Railway

For your use case, I recommend **Vercel (frontend) + Railway (backend)**:

### Why?
1. **Easiest setup**: Both integrate directly with GitHub
2. **Free to start**: Test before committing to paid plans
3. **Best performance**: Vercel's CDN is excellent for React apps
4. **Separate scaling**: Backend can scale independently as usage grows
5. **Good developer experience**: Great dashboards and logs

### Setup Steps:

#### Part 1: Deploy Backend to Railway

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `Survey_app` repository
5. Railway auto-detects Node.js and `server.js`
6. Add environment variable:
   - Key: `OPENAI_API_KEY`
   - Value: `your-actual-openai-key`
7. Deploy!
8. Copy the generated URL (e.g., `https://your-app.railway.app`)

#### Part 2: Update Frontend to Use Railway Backend

Update `AdminView.jsx` to use the Railway URL instead of localhost:

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const generateSurveyImage = async (surveyTitle) => {
  const response = await fetch(`${API_URL}/api/generate-image`, {
    // ... rest of code
  });
};
```

Add to `.env.example`:
```
REACT_APP_API_URL=https://your-app.railway.app
```

#### Part 3: Deploy Frontend to Vercel

1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "New Project"
4. Import your `Survey_app` repository
5. Vercel auto-detects React
6. Add environment variable:
   - Key: `REACT_APP_API_URL`
   - Value: `https://your-app.railway.app` (from Railway)
7. Deploy!
8. Your app will be live at `https://your-app.vercel.app`

#### Part 4: Configure Railway CORS

Update `server.js` to allow Vercel domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-app.vercel.app'
  ]
}));
```

---

## Database (Supabase)

Your Supabase database doesn't need to change - it's already cloud-hosted!
Just make sure your Supabase credentials are configured in the app.

---

## Custom Domain (Optional)

Both Vercel and Railway support custom domains:

1. **Vercel**: Settings → Domains → Add your domain
2. **Railway**: Settings → Domains → Add custom domain
3. Update DNS records as instructed

---

## Monitoring & Costs

### Expected Monthly Costs (Production):
- **Supabase**: Free tier (up to 500MB database)
- **Railway**: ~$5-10/month (backend API)
- **Vercel**: Free (frontend hosting)
- **OpenAI DALL-E**: ~$0.04 per image generated

**Total**: ~$5-10/month + image generation costs

### Free Tier Limitations:
- **Railway**: $5 free credit/month (usually enough for small apps)
- **Vercel**: Unlimited for personal projects
- **Supabase**: 500MB database, 2GB bandwidth

---

## Alternative: Single Platform Options

If you prefer a single platform, consider:

1. **Render** - Host both on one platform (free tier available)
2. **Fly.io** - Modern platform with good free tier
3. **Heroku** - Classic option (no longer has free tier)

---

## Next Steps

Would you like me to:
1. Help you deploy to Vercel + Railway? (Recommended)
2. Set up a different hosting option?
3. Create deployment automation scripts?

Let me know which option you prefer!
