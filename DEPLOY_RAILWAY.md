# 🚂 Railway.app Deployment Guide - MCP Bridge

## ✅ Fordele ved Railway

- ✅ **One-click deploy** direkte fra GitHub
- ✅ **Auto-scaling** og resource management
- ✅ **Free SSL** med custom domains
- ✅ **Automatic HTTPS**
- ✅ **Built-in monitoring**
- ✅ **Zero DevOps** - alt er automatisk
- 💰 **Pris:** ~50-70 DKK/måned ($7-10/month)

## 🚀 Deployment Steps

### Step 1: Push til GitHub

```bash
cd mcp-bridge

# Initialize git hvis ikke allerede gjort
git init
git add .
git commit -m "Initial commit - MCP Bridge production ready"

# Opret repository på GitHub (hvis ikke eksisterer)
gh repo create mcp-bridge --public --source=. --remote=origin --push

# Eller push til eksisterende
git remote add origin https://github.com/YOUR_USERNAME/mcp-bridge.git
git branch -M main
git push -u origin main
```

### Step 2: Opret Railway Project

1. **Gå til** https://railway.app
2. **Sign in** med GitHub
3. **Klik** "New Project"
4. **Vælg** "Deploy from GitHub repo"
5. **Vælg** `mcp-bridge` repository
6. Railway detekterer automatisk Node.js og kører `npm install` + `npm run start`

### Step 3: Configure Environment Variables

I Railway dashboard:

1. Klik på dit project
2. Gå til **"Variables"** tab
3. Tilføj følgende environment variables:

```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com
SESSION_SECRET=<generate-random-32-char-string>
```

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Add Custom Domain (Optional)

1. I Railway project, gå til **"Settings"**
2. Under **"Domains"**, klik **"Generate Domain"**
   - Du får automatisk: `your-project.up.railway.app`
3. Eller tilføj **Custom Domain**:
   - Klik **"Add Domain"**
   - Indtast: `api.yourdomain.com`
   - Tilføj CNAME record hos din DNS provider:
     ```
     CNAME api yourdomain.com.cdn.cloudflare.net
     ```
   - Railway auto-konfigurerer SSL ✅

### Step 5: Deploy!

Railway deployer automatisk ved hver `git push`:

```bash
git add .
git commit -m "Update config"
git push origin main
```

**Deploy URL:** `https://your-project.up.railway.app`

### Step 6: Verify Deployment

```bash
# Test API
curl https://your-project.up.railway.app/health

# Test External Data API
curl -X POST https://your-project.up.railway.app/external/data/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Production Test",
    "platform": "test",
    "metadata": {"source": "railway"}
  }'
```

## 📊 Monitoring

Railway dashboard viser automatisk:
- ✅ CPU & Memory usage
- ✅ Request logs
- ✅ Build logs
- ✅ Metrics & analytics

## 🔄 Continuous Deployment

**Auto-deploy ved git push:**
```bash
# Make changes
git add .
git commit -m "Add new feature"
git push origin main
# Railway deployer automatisk 🚀
```

**Rollback hvis nødvendigt:**
1. Gå til Railway dashboard
2. Klik "Deployments"
3. Vælg tidligere deployment
4. Klik "Redeploy"

## 💰 Cost Estimation

**Railway Pricing:**
- **Starter Plan:** $5/month
  - 512 MB RAM
  - Shared CPU
  - 100 GB bandwidth

- **Pro Plan:** $20/month
  - 8 GB RAM
  - Dedicated CPU
  - 500 GB bandwidth

**Anbefaling for MCP Bridge:** Starter Plan er nok (~50 DKK/måned)

## 🔐 Production Best Practices

### 1. Environment Variables
✅ Aldrig commit `.env` filer til Git
✅ Brug Railway dashboard til secrets
✅ Generate nye secrets til production

### 2. Logging
```javascript
// Add to src/server.ts
console.log('🚀 Server starting on port:', process.env.PORT);
console.log('📊 Environment:', process.env.NODE_ENV);
```

### 3. Error Handling
Railway auto-restarter ved crashes, men:
```javascript
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1); // Railway will restart
});
```

### 4. Health Checks
Railway bruger automatisk `/health` endpoint hvis den findes:
```javascript
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date() }));
```

## 🎯 Integration med Frontend

Din GitHub Codespace app kan nu integrere:

```javascript
// I din frontend app (Vercel deployment)
const MCP_BRIDGE_URL = 'https://your-project.up.railway.app';

async function sendData(data) {
  const response = await fetch(`${MCP_BRIDGE_URL}/external/data/sessions/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Frontend Data',
      platform: 'vercel-app',
      data: data
    })
  });

  return response.json();
}
```

## 🆘 Troubleshooting

### Build Fails
```bash
# Check Railway build logs
# Ensure package.json has correct start script
"start": "node --loader tsx src/server.ts"
```

### Port Issues
Railway sætter automatisk `PORT` environment variable.
Sørg for din server bruger `process.env.PORT`:

```javascript
const port = process.env.PORT || 3000;
```

### WebSocket Issues
Railway supports WebSocket automatisk, men sørg for:
```javascript
// Use correct protocol
const wsUrl = 'wss://your-project.up.railway.app/realtime-capture';
```

## ✅ Deployment Checklist

- [ ] Push code til GitHub
- [ ] Opret Railway project fra GitHub repo
- [ ] Configure environment variables
- [ ] Verify deployment URL works
- [ ] Test API endpoints
- [ ] Setup custom domain (optional)
- [ ] Configure CORS for frontend domain
- [ ] Test WebSocket connection
- [ ] Enable monitoring alerts
- [ ] Document production URL

## 🎉 Done!

MCP Bridge kører nu i production på Railway! 🚂

**Din API er tilgængelig på:** `https://your-project.up.railway.app`

**Frontend kan nu integrere med External Data API:**
- POST `/external/data/sessions/create`
- POST `/external/data/upload`
- POST `/external/data/sessions/:id/end`

Se `EXTERNAL_DATA_INTEGRATION.md` for komplet API dokumentation.
