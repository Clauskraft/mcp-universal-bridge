# 🚂 Railway Environment Variables Setup

## Hurtig Guide til at Sætte API Keys Op på Railway

Du har 3 muligheder for at sætte environment variables op på Railway:

---

## ✅ Option 1: Railway Web Dashboard (Nemmest)

1. **Gå til Railway:**
   https://railway.app/project/[dit-project-id]/variables

2. **Klik "New Variable"**

3. **Tilføj disse variabler:**

```
ANTHROPIC_API_KEY = sk-ant-api03-your-key-here

OPENAI_API_KEY = sk-proj-your-key-here

GOOGLE_API_KEY = AIza-your-key-here

CLAUDE_MODEL = claude-sonnet-4-5-20250929

OPENAI_MODEL = gpt-4o

GEMINI_MODEL = gemini-2.0-flash-exp

OLLAMA_LOCAL_MODEL = llama3.3:latest

CHAT_OPTIMIZER_ENABLED = true

OPTIMIZER_MAX_CACHE_MB = 100

API_TIMEOUT = 60000
```

4. **Klik "Deploy"** - Railway auto-deployer med nye keys

---

## 🖥️ Option 2: Railway CLI

### Setup:
```bash
# 1. Install Railway CLI (hvis ikke allerede)
npm install -g @railway/cli

# 2. Login
railway login

# 3. Link til dit project
railway link

# 4. Set variables (kør i mcp-bridge directory)
# Brug dine egne keys fra .env filen
railway variables --set "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"

railway variables --set "OPENAI_API_KEY=$OPENAI_API_KEY"

railway variables --set "CLAUDE_MODEL=claude-sonnet-4-5-20250929"

railway variables --set "OPENAI_MODEL=gpt-4o"

railway variables --set "CHAT_OPTIMIZER_ENABLED=true"

# 5. Verify
railway variables
```

---

## 📋 Option 3: Automatisk Script (Efter Login)

```bash
# 1. Login først
railway login

# 2. Link project
railway link

# 3. Kør setup script
powershell -ExecutionPolicy Bypass -File scripts/setup-railway-env.ps1

# Eller bash version:
bash scripts/setup-railway-env.sh
```

---

## ✅ Verification

Efter at have sat variables:

### 1. Check Railway Dashboard
```
https://railway.app → Your Project → Variables
```

Du skal se alle dine API keys listet

### 2. Test Health Endpoint
```bash
curl https://web-production-d9b2.up.railway.app/health
```

Skal vise:
```json
{
  "status": "healthy",
  "providers": {
    "claude": { "healthy": true },
    "chatgpt": { "healthy": true },
    "gemini": { "healthy": true }
  }
}
```

### 3. Test Chat
Gå til: https://web-production-d9b2.up.railway.app/dashboard/chat.html

Vælg en provider og send en test besked.

---

## 🔐 Sikkerhed

### Hvad IKKE at gøre:
- ❌ Commit .env filer til git
- ❌ Hardcode API keys i kode
- ❌ Share Railway URLs med keys synlige

### Hvad du BØR gøre:
- ✅ Brug Railway's environment variables
- ✅ Roter keys regelmæssigt
- ✅ Brug forskellige keys til dev/prod
- ✅ Monitor usage på provider dashboards

---

## 🎯 Quick Commands

```bash
# View current variables
railway variables

# Add single variable
railway variables --set "KEY=value"

# Add multiple variables
railway variables \
  --set "KEY1=value1" \
  --set "KEY2=value2" \
  --set "KEY3=value3"

# View logs after deployment
railway logs

# Check deployment status
railway status
```

---

## 💡 Pro Tips

### 1. Environment-Specific Keys
Brug forskellige keys for development og production:

**Development (.env):**
```
ANTHROPIC_API_KEY=sk-ant-dev-...
```

**Production (Railway):**
```
ANTHROPIC_API_KEY=sk-ant-prod-...
```

### 2. Cost Control
Set lavere limits på production keys:
- OpenAI: Set spending limits
- Anthropic: Monitor usage alerts
- Google: Set quota limits

### 3. Rotation Strategy
Roter keys hver 3. måned:
1. Generate new key
2. Add to Railway
3. Test deployment
4. Remove old key

---

**Dine Keys er Klar Lokalt!** ✅

.env filen indeholder allerede:
- ✅ ANTHROPIC_API_KEY
- ✅ OPENAI_API_KEY
- ⚠️  GOOGLE_API_KEY (placeholder - indsæt rigtig key)

**Næste Step:** Sæt samme keys op på Railway via web dashboard eller CLI.
