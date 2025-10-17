# 🚂 Railway.app Deployment - Super Nem Guide

## ✅ Fordele ved Railway
- ✅ Login med GitHub (2 klik)
- ✅ Ingen kreditkort påkrævet først
- ✅ One-click deploy fra repository
- ✅ Auto SSL + custom domain
- ✅ Klar på 5 minutter!

---

## 🚀 STEP 1: Sign Up på Railway

### 1.1 Åbn Railway
**URL:** https://railway.app

### 1.2 Click "Start a New Project"
- Find knappen i midten af siden
- Eller "Login" hvis du ser den først

### 1.3 Login med GitHub
1. Klik på **"Login with GitHub"** knappen
2. Du sendes til GitHub
3. **Godkend Railway access:**
   - Railway vil bede om adgang til dine repositories
   - Klik **"Authorize Railway"**
4. Du sendes tilbage til Railway dashboard

**Success!** Du er nu logget ind på Railway! 🎉

---

## 🚀 STEP 2: Deploy fra GitHub

### 2.1 Create New Project
Du skal nu se Railway dashboard med:
- "New Project" knap
- Eller "Deploy from GitHub repo"

**Klik på "New Project"**

### 2.2 Deploy from GitHub Repo
Railway viser options:
- "Deploy from GitHub repo"
- "Empty Project"
- "Template"

**Klik: "Deploy from GitHub repo"**

### 2.3 Select Repository
Railway viser liste af dine GitHub repositories:

**Find og vælg:**
- **Repository:** `Clauskraft/mcp-universal-bridge`
- Klik på repository navnet

### 2.4 Deploy Now
Railway spørger:
- "Deploy mcp-universal-bridge?"
- Viser repository info

**Klik: "Deploy Now"** (eller "Add variables" hvis du vil sætte environment variables først)

### 2.5 Auto-Deploy Starter
Railway starter automatisk deployment:
- **Detecting buildpack:** Node.js detected ✅
- **Installing dependencies:** `npm install` ✅
- **Building application:** `npm run build` (hvis configured)
- **Starting application:** `npm run start` ✅

**Progress:**
- Du ser live logs i højre side
- Status: "Building..." → "Deploying..." → "Active"

**Estimated time: 2-5 minutter** ⏱️

---

## 🚀 STEP 3: Configure Environment Variables (VIGTIGT!)

### 3.1 Go to Variables Tab
Mens det deployer (eller efter):
1. Klik på dit project navn
2. Find **"Variables"** tab
3. Klik på Variables

### 3.2 Add Variables
**Click "+ New Variable"** for hver:

**Required Variables:**
```env
NODE_ENV=production
PORT=3000
```

**Recommended Variables:**
```env
ALLOWED_ORIGINS=https://your-railway-app.up.railway.app
SESSION_SECRET=<random-32-char-string>
```

**Generate SESSION_SECRET:**
- Åbn en terminal
- Kør: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Kopier output og brug som SESSION_SECRET

### 3.3 Save Variables
- Efter alle variables er tilføjet
- Klik **"Save"** eller det gemmes automatisk
- Railway redeploys automatisk med nye variables

---

## 🚀 STEP 4: Get Your Production URL

### 4.1 Find Settings Tab
1. Klik på dit project
2. Find **"Settings"** tab
3. Klik på Settings

### 4.2 Generate Domain
Scroll til **"Domains"** section:

**Options:**
1. **Railway Generated Domain (NEMMEST):**
   - Klik **"Generate Domain"**
   - Railway giver dig automatisk:
     - `your-project-name.up.railway.app`
   - **FREE SSL inkluderet! 🔒**

2. **Custom Domain (OPTIONAL):**
   - Hvis du har et domain navn
   - Klik **"Custom Domain"**
   - Indtast: `api.yourdomain.com`
   - Railway giver dig CNAME record
   - Tilføj CNAME hos din DNS provider

### 4.3 Copy Production URL
Din production URL:
```
https://mcp-universal-bridge-production.up.railway.app
```
(Eller dit custom domain)

**Kopier denne URL!** Du skal bruge den til integration.

---

## ✅ STEP 5: Verify Deployment

### 5.1 Check Deployment Status
Railway dashboard viser:
- **Status:** Green dot = Active ✅
- **Last Deployment:** Just now
- **Logs:** Recent activity

### 5.2 Test API Endpoints

**Test 1: Health Check**
```bash
curl https://your-app.up.railway.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-17T..."
}
```

**Test 2: External Data API**
```bash
curl -X POST https://your-app.up.railway.app/external/data/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Production Test",
    "platform": "railway-test"
  }'
```

**Expected Response:**
```json
{
  "session": {
    "id": "ext-...",
    "title": "Production Test",
    "platform": "external-railway-test",
    ...
  }
}
```

### 5.3 View Logs
På Railway dashboard:
- Klik på **"Deployments"** tab
- Vælg latest deployment
- Se **"Logs"** - live server logs
- Check for errors

**Hvis ingen errors:** ✅ **SUCCESS!**

---

## 🔄 STEP 6: Auto-Deploy Setup

### 6.1 Automatic Deployments
Railway er allerede configured til auto-deploy:

**Hver gang du:**
1. Push til GitHub: `git push origin master`
2. Railway detekterer automatisk
3. Rebuilds og redeploys
4. Live på under 2 minutter

**Disable auto-deploy (optional):**
- Settings → **"Deployments"**
- Toggle **"Auto-deploy"** off

### 6.2 Manual Deploy
Hvis du deaktiverer auto-deploy:
1. Gå til **"Deployments"** tab
2. Klik **"Deploy"**
3. Vælg branch (master/main)
4. Deployment starter

---

## 📊 STEP 7: Monitoring & Management

### 7.1 View Metrics
Railway dashboard viser automatisk:
- **CPU Usage:** Real-time graph
- **Memory Usage:** Current RAM
- **Network:** Bandwidth usage
- **Request Count:** HTTP requests

### 7.2 View Logs
**Real-time logs:**
- Klik **"Deployments"** tab
- Vælg active deployment
- Se live logs stream

**Filter logs:**
- Search bar øverst
- Filter by error/warn/info

### 7.3 Restart Application
Hvis nødvendigt:
1. **Settings** → **"Deployments"**
2. Klik **"Restart"**
3. Application restarter uden rebuild

### 7.4 Rollback
Hvis deployment fejler:
1. **Deployments** tab
2. Find previous successful deployment
3. Klik **"..."** (three dots)
4. Select **"Redeploy"**

---

## 💰 Cost & Billing

### Free Tier (Trial)
**Railway Starter (FREE for testing):**
- $5 FREE credits per month
- Enough for ~500 hours
- No credit card required initially

**Limits:**
- 512 MB RAM
- Shared CPU
- 1 GB Storage

### Paid Plans
**Hobby Plan: $5/month**
- 8 GB RAM
- Dedicated CPU
- 100 GB Storage
- Priority support

**Pro Plan: $20/month**
- 32 GB RAM
- More CPU
- 500 GB Storage

**For MCP Bridge:**
- **Anbefaling:** Hobby Plan ($5/month) er nok
- **Dansk pris:** ~37 DKK/måned

### Billing Setup
Når free credits løber ud:
1. Railway sender email
2. **Settings** → **"Billing"**
3. Add credit card
4. Vælg plan (Hobby anbefalet)

---

## 🔐 Production Best Practices

### 1. Environment Variables
✅ **Always set:**
- `NODE_ENV=production`
- `SESSION_SECRET=<random-string>`
- `ALLOWED_ORIGINS=https://your-railway-app.up.railway.app`

### 2. Health Checks
Railway bruger automatisk `/health` endpoint:
```javascript
app.get('/health', (c) => c.json({
  status: 'ok',
  timestamp: new Date()
}));
```

### 3. Logging
Railway gemmer logs automatisk:
- Last 7 days gratis
- Longer retention på paid plans

**Best practice:**
```javascript
console.log('[INFO] Server started');
console.error('[ERROR] Failed to connect');
```

### 4. Error Handling
Railway auto-restarter ved crashes:
```javascript
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1); // Railway restarts automatically
});
```

### 5. CORS Configuration
For frontend integration:
```javascript
// Update ALLOWED_ORIGINS environment variable
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-railway-app.up.railway.app
```

---

## 🔗 Integration med Frontend

### Frontend on Vercel
Din frontend kan nu integrere:

```javascript
// .env.production (Vercel)
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app

// Code
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/external/data/sessions/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Frontend Data',
    platform: 'vercel-app',
    data: yourData
  })
});
```

---

## 🆘 Troubleshooting

### Problem: "Build failed"
**Solution:**
1. Check build logs i Deployments tab
2. Verify package.json has correct scripts:
   ```json
   "start": "node --loader tsx src/server.ts"
   ```
3. Check all dependencies i package.json
4. Redeploy

### Problem: "Application crashed"
**Solution:**
1. View logs i Deployments
2. Look for error messages
3. Common issues:
   - Missing environment variables
   - Port configuration (use `process.env.PORT`)
   - Missing dependencies
4. Fix code, push to GitHub, auto-redeploys

### Problem: "Cannot access application"
**Solution:**
1. Verify deployment status is "Active"
2. Check domain is correct (generated domain)
3. Test with curl
4. Check CORS configuration if from browser

### Problem: "Out of memory"
**Solution:**
1. Check metrics on dashboard
2. Upgrade to Hobby plan (8 GB RAM)
3. Optimize application code
4. Review memory leaks

---

## ✅ Deployment Checklist

- [ ] Railway account oprettet (GitHub login)
- [ ] Repository deployed from GitHub
- [ ] Environment variables configured
- [ ] Production domain generated
- [ ] Health check endpoint tested
- [ ] External Data API tested
- [ ] CORS configured for frontend
- [ ] Monitoring setup reviewed
- [ ] Auto-deploy verified
- [ ] Frontend integration configured

---

## 🎉 SUCCESS! Du har nu:

✅ **MCP Bridge deployed:** Live på Railway
✅ **Production URL:** `https://your-app.up.railway.app`
✅ **SSL Certificate:** Auto-configured og gratis
✅ **Auto-deploy:** Push til GitHub = auto-deployment
✅ **Monitoring:** Built-in metrics og logs
✅ **Ready for integration:** Frontend kan conecte nu

---

## 📚 Next Steps

### 1. Deploy Frontend til Vercel
```bash
cd your-frontend-app
vercel
```

### 2. Configure Integration
Update frontend environment variables:
```env
API_URL=https://your-railway-app.up.railway.app
```

### 3. Test Integration
Fra frontend:
```javascript
const response = await fetch(`${API_URL}/external/data/sessions/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test',
    platform: 'vercel'
  })
});
```

### 4. Monitor
- Railway dashboard: Metrics og logs
- Setup alerts (optional)
- Review performance

---

## 📞 Support

**Railway Documentation:**
- Docs: https://docs.railway.app
- Community: https://discord.gg/railway

**For MCP Bridge Issues:**
- Check logs i Railway dashboard
- Review environment variables
- Test endpoints med curl
- Verify GitHub repository er opdateret

**HELD OG LYKKE! 🚀**
