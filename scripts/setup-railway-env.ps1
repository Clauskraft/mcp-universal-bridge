# Railway Environment Variables Setup Script (PowerShell)
# Automatically configures Railway with your local environment variables

Write-Host "🚂 Railway Environment Variables Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
$railwayExists = Get-Command railway -ErrorAction SilentlyContinue

if (-not $railwayExists) {
    Write-Host "❌ Railway CLI not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "📦 Install Railway CLI:" -ForegroundColor Yellow
    Write-Host "  npm install -g @railway/cli"
    Write-Host ""
    Write-Host "Or use Railway dashboard: https://railway.app/project/[your-project]/variables"
    exit 1
}

Write-Host "✅ Railway CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in
$loginCheck = railway whoami 2>$null
if (-not $?) {
    Write-Host "🔐 Please login to Railway first:" -ForegroundColor Yellow
    railway login
}

Write-Host "📋 Reading local environment variables..." -ForegroundColor Cyan
Write-Host ""

# Read from .env file
$envFile = ".env"
$envVars = @{}

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            $envVars[$key] = $value
        }
    }
    Write-Host "✅ Loaded .env file" -ForegroundColor Green
} else {
    Write-Host "⚠️  No .env file found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔑 Setting API Keys on Railway..." -ForegroundColor Cyan
Write-Host "=================================="
Write-Host ""

# Set Anthropic API Key
if ($envVars.ContainsKey("ANTHROPIC_API_KEY") -and $envVars["ANTHROPIC_API_KEY"]) {
    Write-Host "Setting ANTHROPIC_API_KEY..." -ForegroundColor Yellow
    railway variables set "ANTHROPIC_API_KEY=$($envVars['ANTHROPIC_API_KEY'])"
    Write-Host "✅ Anthropic key set" -ForegroundColor Green
} else {
    Write-Host "⚠️  ANTHROPIC_API_KEY not found" -ForegroundColor Yellow
}

# Set OpenAI API Key
if ($envVars.ContainsKey("OPENAI_API_KEY") -and $envVars["OPENAI_API_KEY"]) {
    Write-Host "Setting OPENAI_API_KEY..." -ForegroundColor Yellow
    railway variables set "OPENAI_API_KEY=$($envVars['OPENAI_API_KEY'])"
    Write-Host "✅ OpenAI key set" -ForegroundColor Green
} else {
    Write-Host "⚠️  OPENAI_API_KEY not found" -ForegroundColor Yellow
}

# Set Google API Key
if ($envVars.ContainsKey("GOOGLE_API_KEY") -and $envVars["GOOGLE_API_KEY"] -and $envVars["GOOGLE_API_KEY"] -ne "<din_nøgle>") {
    Write-Host "Setting GOOGLE_API_KEY..." -ForegroundColor Yellow
    railway variables set "GOOGLE_API_KEY=$($envVars['GOOGLE_API_KEY'])"
    Write-Host "✅ Google key set" -ForegroundColor Green
} else {
    Write-Host "⚠️  GOOGLE_API_KEY not found or placeholder" -ForegroundColor Yellow
}

# Set XAI API Key (if available)
if ($envVars.ContainsKey("XAI_API_KEY") -and $envVars["XAI_API_KEY"]) {
    Write-Host "Setting XAI_API_KEY..." -ForegroundColor Yellow
    railway variables set "XAI_API_KEY=$($envVars['XAI_API_KEY'])"
    Write-Host "✅ xAI Grok key set" -ForegroundColor Green
}

Write-Host ""
Write-Host "⚙️  Setting Configuration Variables..." -ForegroundColor Cyan
Write-Host "======================================"
Write-Host ""

# Model configurations
$claudeModel = if ($envVars["CLAUDE_MODEL"]) { $envVars["CLAUDE_MODEL"] } else { "claude-sonnet-4-5-20250929" }
$geminiModel = if ($envVars["GEMINI_MODEL"]) { $envVars["GEMINI_MODEL"] } else { "gemini-2.0-flash-exp" }
$openaiModel = if ($envVars["OPENAI_MODEL"]) { $envVars["OPENAI_MODEL"] } else { "gpt-4o" }

railway variables set "CLAUDE_MODEL=$claudeModel"
railway variables set "GEMINI_MODEL=$geminiModel"
railway variables set "OPENAI_MODEL=$openaiModel"

# Ollama configurations
$ollamaLocalModel = if ($envVars["OLLAMA_LOCAL_MODEL"]) { $envVars["OLLAMA_LOCAL_MODEL"] } else { "llama3.3:latest" }
railway variables set "OLLAMA_LOCAL_MODEL=$ollamaLocalModel"

# Chat Optimizer
$optimizerEnabled = if ($envVars["CHAT_OPTIMIZER_ENABLED"]) { $envVars["CHAT_OPTIMIZER_ENABLED"] } else { "true" }
$optimizerCacheMB = if ($envVars["OPTIMIZER_MAX_CACHE_MB"]) { $envVars["OPTIMIZER_MAX_CACHE_MB"] } else { "100" }
$optimizerExpiration = if ($envVars["OPTIMIZER_CACHE_EXPIRATION_HOURS"]) { $envVars["OPTIMIZER_CACHE_EXPIRATION_HOURS"] } else { "1" }
$optimizerMaxMessages = if ($envVars["OPTIMIZER_MAX_CONTEXT_MESSAGES"]) { $envVars["OPTIMIZER_MAX_CONTEXT_MESSAGES"] } else { "10" }

railway variables set "CHAT_OPTIMIZER_ENABLED=$optimizerEnabled"
railway variables set "OPTIMIZER_MAX_CACHE_MB=$optimizerCacheMB"
railway variables set "OPTIMIZER_CACHE_EXPIRATION_HOURS=$optimizerExpiration"
railway variables set "OPTIMIZER_MAX_CONTEXT_MESSAGES=$optimizerMaxMessages"

# API Configuration
$apiTimeout = if ($envVars["API_TIMEOUT"]) { $envVars["API_TIMEOUT"] } else { "60000" }
railway variables set "API_TIMEOUT=$apiTimeout"

Write-Host "✅ All configuration variables set" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Cyan
Write-Host "=================="
Write-Host ""
Write-Host "📍 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Railway will automatically redeploy with new variables"
Write-Host "  2. Check deployment: railway status"
Write-Host "  3. View logs: railway logs"
Write-Host "  4. Test: https://web-production-d9b2.up.railway.app/health"
Write-Host ""
Write-Host "🔍 View all variables:" -ForegroundColor Cyan
Write-Host "  railway variables"
Write-Host ""
