# Deployment Guide — ServX Microservices

## Prerequisites

- 3 Render accounts (or 1 account with 3 services)
- GitHub organization: `Servx-lab`
- Supabase project with service role key
- MongoDB Atlas cluster
- Redis instance (for Main-UI)

## Service URLs

| Service | Example URL | Render Account |
|---------|-------------|----------------|
| Main-UI API | `https://servx-ofak.onrender.com` | Existing |
| AutoMedic | `https://servx-automedic.onrender.com` | #1 |
| Exposure | `https://servx-exposure.onrender.com` | #2 |
| Frontend | `https://servx.vercel.app` | Vercel |

---

## 1. Deploy AutoMedic (Render Account #1)

### Create Service
1. Go to Render → **New +** → **Web Service**
2. Connect repo: `Servx-lab/Automedic-Pipeline`
3. Settings:
   - **Name:** `servx-automedic`
   - **Runtime:** Node.js
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - **Plan:** Free (512 MB)

### Environment Variables
```
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://bxmnuzqujamyuvsomfdj.supabase.co
SUPABASE_KEY=<supabase-service-role-key>
FRONTEND_URL=https://servx.vercel.app
EXPOSURE_SERVICE_URL=https://servx-exposure.onrender.com
SERVICE_AUTH_TOKEN=<your-shared-secret>
POLL_INTERVAL_MS=30000
MAX_CONCURRENT_POLLS=50
```

### Deploy
1. Add all env vars
2. Click **Create Web Service**
3. Wait for build to complete
4. Test: `curl https://servx-automedic.onrender.com/health`
5. Expected: `{"status":"nominal","service":"automedic-pipeline"}`

---

## 2. Deploy Exposure Analysis (Render Account #2)

### Create Service
1. Go to Render → **New +** → **Web Service**
2. Connect repo: `Servx-lab/Exposure-Analysis`
3. Settings:
   - **Name:** `servx-exposure`
   - **Runtime:** Node.js
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - **Plan:** Free (512 MB)

### Environment Variables
```
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://bxmnuzqujamyuvsomfdj.supabase.co
SUPABASE_KEY=<supabase-service-role-key>
FRONTEND_URL=https://servx.vercel.app
MAIN_API_URL=https://servx-ofak.onrender.com
SERVICE_AUTH_TOKEN=<your-shared-secret>
AUTOMEDIC_SERVICE_URL=https://servx-automedic.onrender.com
```

> **Important:** `SERVICE_AUTH_TOKEN` must be identical on AutoMedic, Exposure, AND Main-UI.

### Deploy
1. Add all env vars
2. Click **Create Web Service**
3. Wait for build to complete
4. Test: `curl https://servx-exposure.onrender.com/health`
5. Expected: `{"status":"nominal","service":"exposure-analysis"}`

---

## 3. Update Main-UI API (Existing Render)

### Add New Environment Variables
Go to your existing Main-UI Render service → Environment → Add:

```
SERVICE_AUTH_TOKEN=<your-shared-secret>
AUTOMEDIC_SERVICE_URL=https://servx-automedic.onrender.com
EXPOSURE_SERVICE_URL=https://servx-exposure.onrender.com
```

> Do NOT remove any existing env vars. Only add these 3 new ones.

### Redeploy
1. Save env vars
2. Trigger a manual deploy (or push a commit to trigger auto-deploy)
3. The new internal endpoint `/api/internal/github-token` will become active

---

## 4. Verify the Full Chain

### Test 1: AutoMedic health
```bash
curl https://servx-automedic.onrender.com/health
# → {"status":"nominal","service":"automedic-pipeline"}
```

### Test 2: Exposure health
```bash
curl https://servx-exposure.onrender.com/health
# → {"status":"nominal","service":"exposure-analysis"}
```

### Test 3: Main-UI internal endpoint
```bash
curl -H "X-Service-Token: <your-shared-secret>" \
     "https://servx-ofak.onrender.com/api/internal/github-token?userId=test-user-id"
# → 404 (expected — test user has no GitHub connected)
# → If 503: SERVICE_AUTH_TOKEN not set on Main-UI
# → If 401: token mismatch between Exposure and Main-UI
```

### Test 4: Frontend loads
```bash
curl https://servx.vercel.app
# → HTML page loads
```

---

## Troubleshooting

### AutoMedic won't start
- Check `SUPABASE_URL` and `SUPABASE_KEY` are set
- Check `PORT` matches what Render expects
- View logs in Render dashboard

### Exposure can't fetch GitHub tokens
- Check `MAIN_API_URL` is correct (no trailing slash)
- Check `SERVICE_AUTH_TOKEN` matches on both Exposure and Main-UI
- Check Main-UI has `SERVICE_AUTH_TOKEN` env var set
- Check Main-UI has been redeployed after adding the env var

### AutoMedic can't escalate to Exposure
- Check `EXPOSURE_SERVICE_URL` is correct
- Check `SERVICE_AUTH_TOKEN` matches on both AutoMedic and Exposure
- Check Exposure's `/api/escalate-incident` endpoint is accessible

### CORS errors in frontend
- Check `FRONTEND_URL` is set correctly on all services
- Check the frontend URL matches exactly (including https://)

---

## Post-Deployment: Frontend Integration

After all 3 services are deployed and verified, the Main-UI frontend needs to be updated to call AutoMedic and Exposure endpoints. See [Frontend Integration Guide](./frontend-integration.md) (pending).

The frontend will use:
- `AUTOMEDIC_SERVICE_URL` → for incident streaming, log viewing
- `EXPOSURE_SERVICE_URL` → for codebase scans, findings display
- Supabase JWT → for authentication to both services
