# 🦙 Ollama Cloud Hosting - Setup Guide

**Problem:** Railway kan ikke køre Ollama direkte (mangler GPU support og storage for modeller)

**Løsning:** Host Ollama på en dedikeret server eller cloud service

---

## 🚀 Option 1: Replicate (Anbefalet - Nemmest)

**Fordele:**
- ✅ Pay-per-use pricing
- ✅ Ingen server management
- ✅ GPU acceleration inkluderet
- ✅ API compatible med Ollama

**Setup:**
1. Gå til https://replicate.com
2. Opret konto og få API key
3. Brug Replicate API til at køre Llama modeller
4. Opdater din kode til at bruge Replicate endpoint

**Pricing:**
- ~$0.0005 per sekund GPU tid
- Meget billigere end Claude/ChatGPT for simple tasks

---

## 🌐 Option 2: Modal Labs (Serverless GPU)

**Fordele:**
- ✅ Serverless GPU functions
- ✅ Kan deploye din egen Ollama instance
- ✅ Auto-scaling
- ✅ Gratis tier available

**Setup:**
```python
# modal_ollama.py
from modal import Image, Stub, web_endpoint

stub = Stub("ollama-server")

ollama_image = Image.debian_slim().run_commands(
    "curl -fsSL https://ollama.com/install.sh | sh",
    "ollama pull llama3.3"
)

@stub.function(image=ollama_image, gpu="T4")
@web_endpoint(method="POST")
def chat(request):
    # Proxy requests to local Ollama
    import subprocess
    result = subprocess.run(
        ["ollama", "run", request["model"]],
        input=request["prompt"],
        capture_output=True,
        text=True
    )
    return {"response": result.stdout}
```

Deploy:
```bash
modal deploy modal_ollama.py
# Får URL: https://username--ollama-server-chat.modal.run
```

---

## 🖥️ Option 3: Separat VPS Server (Mest kontrol)

**Providers:**
- **Hetzner Cloud** - €4.50/måned (2 vCPU, 4GB RAM)
- **DigitalOcean** - $6/måned (1GB RAM, basic tier)
- **Vultr** - $6/måned (1GB RAM, SSD)

**Setup på VPS:**

```bash
# 1. SSH ind på din server
ssh root@your-server-ip

# 2. Installer Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 3. Pull modeller
ollama pull llama3.3
ollama pull mistral

# 4. Start Ollama med external access
OLLAMA_HOST=0.0.0.0:11434 ollama serve &

# 5. Tillad port 11434 i firewall
ufw allow 11434

# 6. Test fra din computer
curl http://your-server-ip:11434/api/tags
```

**Railway Environment Variable:**
```bash
OLLAMA_BASE_URL=http://your-server-ip:11434
```

---

## 🐳 Option 4: Ollama i Separate Railway Service

Railway understøtter Docker containers med persistent storage:

**Create nixpacks.toml:**
```toml
[phases.setup]
nixPkgs = ["curl", "ca-certificates"]

[phases.install]
cmds = ["curl -fsSL https://ollama.com/install.sh | sh"]

[phases.build]
cmds = ["ollama pull llama3.3:latest"]

[start]
cmd = "OLLAMA_HOST=0.0.0.0:11434 ollama serve"
```

**Railway Setup:**
1. Opret ny Railway service fra repo
2. Link service til din MCP Bridge
3. Brug internal Railway URL
4. Set environment variable: `OLLAMA_BASE_URL=https://ollama-service.railway.internal:11434`

⚠️ **Bemærk:** Railway's free tier har storage limits - modeller kan blive slettet ved restart

---

## 🎯 Anbefaling for Produktion

### For Udvikling & Testing:
- ✅ **Kør Ollama lokalt** på din PC (gratis, ingen setup)

### For Lav Trafik (<100 requests/dag):
- ✅ **Replicate** - Pay per use, ingen fixed costs

### For Mellem Trafik (100-1000 requests/dag):
- ✅ **Hetzner VPS** - €4.50/måned, ubegrænset brug

### For Høj Trafik (>1000 requests/dag):
- ✅ **Modal Labs** - Auto-scaling serverless
- ✅ Eller brug kun cloud providers (Claude/ChatGPT/Gemini)

---

## 🔧 Implementation: Replicate Integration

Det nemmeste er at bruge Replicate's API:

**Opdater `src/providers/ollama.ts`:**

```typescript
async chat(request: ChatRequest, session: Session): Promise<ChatResponse> {
  // Check if using cloud Ollama provider
  const useReplicate = this.baseURL.includes('replicate.com');

  if (useReplicate) {
    // Use Replicate API
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: 'meta/llama-3.3-70b-instruct',
        input: {
          prompt: request.message
        }
      })
    });
    // Process response...
  } else {
    // Use local Ollama
    // ... existing code
  }
}
```

**Environment Variables på Railway:**
```bash
REPLICATE_API_TOKEN=r8_your_token_here
OLLAMA_BASE_URL=https://api.replicate.com
```

---

## ✅ Hurtig Start Guide

**For at få Ollama til at virke på Railway NU:**

1. **Vælg løsning:**
   - **Nemmest:** Replicate (betal per brug)
   - **Billigst long-term:** Hetzner VPS €4.50/måned
   - **Dev/test:** Kør lokalt på din PC

2. **Configure Railway:**
   ```bash
   # Tilføj environment variable på Railway dashboard:
   OLLAMA_BASE_URL=https://your-chosen-service-url
   ```

3. **Test:**
   ```bash
   curl https://web-production-d9b2.up.railway.app/providers/ollama/models
   ```

---

**Hvad vil du gøre?**
- A) Setup Replicate integration (nemmest, pay-per-use)
- B) Deploy Ollama til Hetzner VPS (billigst for produktion)
- C) Brug separate Railway service (medium kompleksitet)
- D) Hold Ollama kun til lokal udvikling
