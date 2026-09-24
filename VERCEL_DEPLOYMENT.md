# 🚀 Vercel Deployment Guide

This repository is configured to support deployment on **[Vercel](https://vercel.com)**.

---

## 🏗️ Architecture Overview

The system supports two deployment patterns on Vercel:

### Option 1: Full-Stack on Vercel (Monorepo — Default)
- **Frontend**: React + Vite built to `web/dist`, served globally via Vercel Edge CDN with client-side SPA routing.
- **Backend**: Express API deployed as a Vercel Serverless Function via [`api/index.js`](file:///c:/Users/DELL/Documents/GitHub/School_system/api/index.js) handling all `/api/*` endpoints.
- **Cron Jobs**: Vercel Cron triggers daily maintenance jobs at `0 3 * * *` (6:00 AM Kampala time) via `/api/cron/daily`.
- **Zero CORS issues**: Frontend and API share the same domain.

### Option 2: Frontend on Vercel + Backend on Render / Railway / VPS
- **Frontend**: Vite SPA deployed on Vercel.
- **Backend**: Dedicated Node/Express server on Render, Railway, or VPS (recommended for large persistent file uploads).
- **Connection**: Set `VITE_API_URL=https://your-backend.onrender.com/api` in Vercel environment variables.

---

## ⚙️ Configuration Files Included

1. **[`vercel.json`](file:///c:/Users/DELL/Documents/GitHub/School_system/vercel.json)** (Root):
   - Sets `installCommand: "npm install && npm install --prefix web"`
   - Sets `buildCommand: "npm run build --prefix web"`
   - Sets `outputDirectory: "web/dist"`
   - Rewrites `/api/(.*)` to `/api/index.js`
   - Rewrites `/(.*)` to `/index.html` (SPA fallback for React Router)
   - Configures daily maintenance cron trigger.

2. **[`api/index.js`](file:///c:/Users/DELL/Documents/GitHub/School_system/api/index.js)**:
   - Serverless entry point for Vercel.

3. **[`web/vercel.json`](file:///c:/Users/DELL/Documents/GitHub/School_system/web/vercel.json)**:
   - Pre-configured in case you choose the `web/` subfolder as your Vercel Project Root Directory.

---

## 📋 Prerequisites: MongoDB Atlas Network Access

> [!IMPORTANT]
> Because Vercel serverless functions run on dynamic IP addresses, you **must** allow connections from anywhere in MongoDB Atlas:
> 1. Log in to [MongoDB Atlas](https://cloud.mongodb.com).
> 2. Go to **Network Access** > **Add IP Address**.
> 3. Select **Allow Access From Anywhere** (`0.0.0.0/0`).
> 4. Ensure your database user credentials in `MONGODB_URI` are correct and URL-encoded.

---

## 🔑 Environment Variables to Configure on Vercel

In the Vercel Dashboard, go to your project **Settings** > **Environment Variables** and add:

| Variable | Required | Example / Description |
|---|---|---|
| `MONGODB_URI` | **Yes** | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/ndugu_academy?retryWrites=true&w=majority` |
| `JWT_SECRET` | **Yes** | Strong random string (e.g. `openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | **Yes** | Strong random string |
| `ALLOWED_ORIGINS` | No | Automatically includes `*.vercel.app` and localhost |
| `VITE_API_URL` | No | Defaults to `/api` (or specify external backend URL) |
| `SMTP_HOST` | Optional | E.g. `smtp.gmail.com` (for email notifications) |
| `SMTP_USER` | Optional | E.g. `alerts@ndugu.academy` |
| `SMTP_PASS` | Optional | App password |
| `AT_API_KEY` | Optional | Africa's Talking API key (for SMS notifications) |
| `AT_USERNAME` | Optional | Africa's Talking username |

---

## 🚀 Deployment Steps

### Method 1: Deploy with Git (Recommended)

1. Push your latest code to GitHub:
   ```bash
   git add .
   git commit -m "Configure project for Vercel deployment"
   git push origin main
   ```
2. Open the [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** > **"Project"**.
3. Import your GitHub repository (`School_system`).
4. In the configuration screen:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave default)
   - The Build and Output settings are automatically loaded from `vercel.json`:
     - **Build Command**: `npm run build --prefix web`
     - **Output Directory**: `web/dist`
     - **Install Command**: `npm install && npm install --prefix web`
5. Expand **Environment Variables** and paste your `MONGODB_URI`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`.
6. Click **Deploy**.

---

### Method 2: Deploy with Vercel CLI

If you have Node.js installed locally, you can deploy in one command:

```bash
# 1. Install Vercel CLI (if not already installed)
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to preview
vercel

# 4. Deploy to production
vercel --prod
```

When prompted by the CLI:
- Set up and deploy: **Yes**
- Link to existing project: **No** (or link to your project)
- Project name: `school-system` (or your choice)
- Directory: `./` (current directory)

---

## 🩺 Verifying Your Deployment

Once deployed:

1. **Check API Health**:
   Visit `https://<your-project>.vercel.app/api/health`
   You should see:
   ```json
   {
     "status": "OK",
     "message": "Ndugu Academy API is healthy",
     "environment": "vercel-serverless",
     "dbConnected": true,
     "timestamp": "..."
   }
   ```
2. **Check Web Console**:
   Visit `https://<your-project>.vercel.app/`
   Test navigation to `/login`, `/admissions`, and `/admin/portal`.
