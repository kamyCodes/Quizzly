# Deployment Guide for Quizzly

This guide will help you deploy both the frontend and backend of your Quizzly app.

---

## 🚀 Quick Deploy (Recommended)

### **Frontend: Vercel** (Free)
### **Backend: Render** (Free)

---

## Part 1: Deploy Backend to Render

1. **Create a Render account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

3. **Create a new Web Service on Render**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: quizzly-backend
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
     - **Plan**: Free

4. **Add Environment Variables**
   - In Render dashboard, go to "Environment"
   - Add: `GROQ_API_KEY` = your_groq_api_key

5. **Deploy!**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Copy your backend URL (e.g., `https://quizzly-backend.onrender.com`)

---

## Part 2: Deploy Frontend to Vercel

1. **Update API URL in App.js**
   - Open `App.js`
   - Change line 33:
   ```javascript
   const API_URL = 'https://your-backend-url.onrender.com';
   ```

2. **Build the web version**
   ```bash
   npm run web
   ```

3. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

4. **Deploy to Vercel**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Select "yes" for all defaults
   - Your app will be live at a Vercel URL!

---

## Alternative: Deploy as Mobile App

### Android (Google Play Store)
1. Build APK:
   ```bash
   npm run android
   eas build --platform android
   ```

### iOS (Apple App Store)
1. Build IPA:
   ```bash
   npm run ios
   eas build --platform ios
   ```

---

## Environment Variables Needed

### Backend (.env):
```
GROQ_API_KEY=your_groq_api_key_here
```

### Frontend:
- Update `API_URL` in `App.js` to point to your deployed backend

---

## Post-Deployment Checklist

- [ ] Backend is running and accessible
- [ ] Frontend can connect to backend
- [ ] Groq API key is set correctly
- [ ] File uploads work (test with .txt file)
- [ ] Quiz generation works
- [ ] Quiz saving/loading works
- [ ] Delete function works

---

## Troubleshooting

**Backend not responding:**
- Check Render logs
- Verify GROQ_API_KEY is set
- Ensure server.js is running

**Frontend can't connect:**
- Check API_URL in App.js
- Verify CORS is enabled in server.js
- Check browser console for errors

**File upload fails:**
- Render free tier has 512MB RAM limit
- Large files might timeout
- Consider upgrading to paid tier

---

## Free Tier Limits

**Render (Backend):**
- 512MB RAM
- Spins down after 15 min inactivity
- 750 hours/month free

**Vercel (Frontend):**
- 100GB bandwidth/month
- Unlimited sites
- Automatic SSL

---

## Need Help?

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Expo Docs: https://docs.expo.dev
