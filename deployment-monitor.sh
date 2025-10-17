#!/bin/bash

# Deployment Monitor Script
# Checks Railway deployment status for MCP features

echo "🚂 Railway Deployment Monitor"
echo "=============================="
echo ""

# Production URL
PROD_URL="https://web-production-d9b2.up.railway.app"

# Check health endpoint
echo "📍 Checking health endpoint..."
curl -s "${PROD_URL}/" | jq . || echo "❌ Health check failed"
echo ""

# Check MCP endpoints
echo "🤖 Checking MCP Orchestrator endpoints..."
echo -n "  /api/mcp/servers: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/api/mcp/servers")
if [ "$STATUS" = "200" ]; then
    echo "✅ $STATUS"
else
    echo "❌ $STATUS"
fi

echo -n "  /api/mcp/stats: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/api/mcp/stats")
if [ "$STATUS" = "200" ]; then
    echo "✅ $STATUS"
else
    echo "❌ $STATUS"
fi

echo ""

# Check External Data endpoints
echo "📊 Checking External Data endpoints..."
echo -n "  /api/external/sessions: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/api/external/sessions")
if [ "$STATUS" = "200" ]; then
    echo "✅ $STATUS"
else
    echo "❌ $STATUS"
fi

echo ""

# Check if deployment is complete
echo "📈 Deployment Status:"
if curl -s "${PROD_URL}/api/mcp/servers" | grep -q "servers"; then
    echo "✅ MCP features are DEPLOYED!"
else
    echo "⏳ Waiting for deployment to complete..."
    echo "   Check Railway dashboard for build progress"
fi

echo ""
echo "=============================="
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"