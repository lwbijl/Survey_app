# Deployment Checklist - Vercel + Railway

Follow these steps to deploy your survey application.

## Prerequisites
- [x] Code pushed to GitHub
- [ ] Railway account created
- [ ] Vercel account created
- [ ] OpenAI API key ready

---

## Part 1: Deploy Backend to Railway (10 minutes)

### 1. Create Railway Project
1. Go to https://railway.app
2. Click "Login" → Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose `Survey_app` repository
6. Railway will auto-detect Node.js

### 2. Configure Environment Variables
Click on your project → Variables tab → Add these:

```
OPENAI_API_KEY=your-actual-openai-api-key-here
FRONTEND_URL=https://your-app.vercel.app
```

**Note**: Leave `FRONTEND_URL` as placeholder for now. We'll update it after deploying to Vercel.

### 3. Get Railway URL
1. Go to Settings tab
2. Copy the "Public Domain" (e.g., `https://survey-app-production-abc123.up.railway.app`)
3. **Save this URL** - you'll need it for Vercel!

### 4. Deploy
Railway will automatically deploy. Wait for:
- ✅ Build completed
- ✅ Deployment successful

---

## Part 2: Deploy Frontend to Vercel (10 minutes)

### 1. Create Vercel Project
1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import `Survey_app` from GitHub
4. Vercel auto-detects React

### 2. Configure Build Settings
**Framework Preset**: Create React App (auto-detected)

**Build Command**: `npm run build` (default)

**Output Directory**: `build` (default)

**Install Command**: `npm install` (default)

### 3. Add Environment Variable
Before deploying, add this environment variable:

**Key**: `REACT_APP_API_URL`

**Value**: Your Railway URL from Part 1 (e.g., `https://survey-app-production-abc123.up.railway.app`)

### 4. Deploy
Click "Deploy" and wait for:
- ✅ Build completed
- ✅ Deployment successful

### 5. Get Vercel URL
Copy your Vercel URL (e.g., `https://survey-app.vercel.app`)

---

## Part 3: Update Railway CORS (5 minutes)

Now that you have your Vercel URL, update Railway:

1. Go back to Railway
2. Click your project → Variables
3. Update `FRONTEND_URL` with your actual Vercel URL:
   ```
   FRONTEND_URL=https://your-actual-app.vercel.app
   ```
4. Railway will automatically redeploy

---

## Part 4: Test Your Deployment

### 1. Test Backend
Visit your Railway URL in browser:
```
https://your-app.railway.app/health
```

You should see: `{"status":"ok"}`

### 2. Test Frontend
Visit your Vercel URL:
```
https://your-app.vercel.app
```

You should see the survey application!

### 3. Test Full Flow
1. Click "Admin" tab
2. Configure Supabase credentials
3. Create a survey
4. Activate the survey → AI image should generate!
5. Switch to "Survey" tab
6. Fill out and submit

---

## Part 5: Custom Domain (Optional)

### Add Custom Domain to Vercel
1. Vercel Dashboard → Settings → Domains
2. Add your domain (e.g., `survey.yourdomain.com`)
3. Update DNS records as instructed
4. SSL certificate auto-configured!

### Update Railway
After adding custom domain, update Railway's `FRONTEND_URL`:
```
FRONTEND_URL=https://survey.yourdomain.com
```

---

## Troubleshooting

### CORS Errors
- Check `FRONTEND_URL` in Railway matches your Vercel URL exactly
- Make sure there's no trailing slash
- Check Railway logs for CORS errors

### Image Generation Not Working
- Verify `OPENAI_API_KEY` is set in Railway
- Check Railway logs for OpenAI API errors
- Verify backend URL is correct in Vercel

### Database Connection Issues
- Verify Supabase credentials in the app
- Check Supabase project is active
- Run database migrations

---

## Costs Summary

**Free Tier**:
- Railway: $5/month credit (covers small usage)
- Vercel: Unlimited for personal projects
- Supabase: 500MB database, 2GB bandwidth

**If You Exceed Free Tier**:
- Railway: ~$5-10/month for backend
- Vercel: Still free for frontend
- OpenAI: $0.04 per image generated

**Total**: ~$5-10/month + image generation costs

---

## Next Steps After Deployment

1. Share your Vercel URL with workshop participants
2. Monitor Railway usage dashboard
3. Set up monitoring/alerts (optional)
4. Consider adding custom domain
5. Back up your Supabase database regularly

---

## Support

If you run into issues:
1. Check Railway logs: Dashboard → Deployments → View Logs
2. Check Vercel logs: Deployments → Function Logs
3. Check browser console for frontend errors (F12)
4. Review the DEPLOYMENT_GUIDE.md for more details

Good luck with your deployment! 🚀
