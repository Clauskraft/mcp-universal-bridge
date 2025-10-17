#!/bin/bash

# Railway deployment health check script
URL="https://web-production-d9b2.up.railway.app/health"

echo "🔄 Checking Railway deployment status..."
echo "URL: $URL"
echo ""

while true; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)
  TIMESTAMP=$(date +"%H:%M:%S")

  if [ "$RESPONSE" = "200" ]; then
    echo "✅ [$TIMESTAMP] Deployment successful! Server is responding."
    echo ""
    echo "Full health check:"
    curl -s $URL | jq '.' || curl -s $URL
    break
  else
    echo "⏳ [$TIMESTAMP] Still deploying... (HTTP $RESPONSE)"
  fi

  sleep 10
done

echo ""
echo "🎉 Deployment complete! Your app is live at:"
echo "   https://web-production-d9b2.up.railway.app"