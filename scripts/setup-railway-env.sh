#!/bin/bash

# Railway Environment Variables Setup Script
# Automatically configures Railway with your local environment variables

echo "🚂 Railway Environment Variables Setup"
echo "======================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found"
    echo ""
    echo "📦 Install Railway CLI:"
    echo "  npm install -g @railway/cli"
    echo ""
    echo "Or use Railway dashboard: https://railway.app/project/[your-project]/variables"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway first:"
    railway login
fi

echo "📋 Checking current environment variables..."
echo ""

# Load from local .env
if [ -f .env ]; then
    source .env
    echo "✅ Loaded .env file"
else
    echo "⚠️  No .env file found"
fi

echo ""
echo "🔑 Setting API Keys on Railway..."
echo "=================================="
echo ""

# Set Anthropic API Key
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "Setting ANTHROPIC_API_KEY..."
    railway variables set ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
    echo "✅ Anthropic key set"
else
    echo "⚠️  ANTHROPIC_API_KEY not found in environment"
fi

# Set OpenAI API Key
if [ -n "$OPENAI_API_KEY" ]; then
    echo "Setting OPENAI_API_KEY..."
    railway variables set OPENAI_API_KEY="$OPENAI_API_KEY"
    echo "✅ OpenAI key set"
else
    echo "⚠️  OPENAI_API_KEY not found in environment"
fi

# Set Google API Key
if [ -n "$GOOGLE_API_KEY" ] && [ "$GOOGLE_API_KEY" != "<din_nøgle>" ]; then
    echo "Setting GOOGLE_API_KEY..."
    railway variables set GOOGLE_API_KEY="$GOOGLE_API_KEY"
    echo "✅ Google key set"
else
    echo "⚠️  GOOGLE_API_KEY not found or placeholder value"
fi

# Set XAI API Key (if available)
if [ -n "$XAI_API_KEY" ]; then
    echo "Setting XAI_API_KEY..."
    railway variables set XAI_API_KEY="$XAI_API_KEY"
    echo "✅ xAI Grok key set"
fi

echo ""
echo "⚙️  Setting Configuration Variables..."
echo "======================================"
echo ""

# Model configurations
railway variables set CLAUDE_MODEL="${CLAUDE_MODEL:-claude-sonnet-4-5-20250929}"
railway variables set GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.0-flash-exp}"
railway variables set OPENAI_MODEL="${OPENAI_MODEL:-gpt-4o}"

# Ollama configurations
railway variables set OLLAMA_LOCAL_MODEL="${OLLAMA_LOCAL_MODEL:-llama3.3:latest}"

# Chat Optimizer
railway variables set CHAT_OPTIMIZER_ENABLED="${CHAT_OPTIMIZER_ENABLED:-true}"
railway variables set OPTIMIZER_MAX_CACHE_MB="${OPTIMIZER_MAX_CACHE_MB:-100}"
railway variables set OPTIMIZER_CACHE_EXPIRATION_HOURS="${OPTIMIZER_CACHE_EXPIRATION_HOURS:-1}"
railway variables set OPTIMIZER_MAX_CONTEXT_MESSAGES="${OPTIMIZER_MAX_CONTEXT_MESSAGES:-10}"

# API Configuration
railway variables set API_TIMEOUT="${API_TIMEOUT:-60000}"

echo "✅ All configuration variables set"
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📍 Next steps:"
echo "  1. Railway will automatically redeploy with new variables"
echo "  2. Check deployment status: railway status"
echo "  3. View logs: railway logs"
echo "  4. Test your deployment: https://web-production-d9b2.up.railway.app/health"
echo ""
echo "🔍 View all variables:"
echo "  railway variables"
echo ""
