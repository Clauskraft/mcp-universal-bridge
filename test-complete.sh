#!/bin/bash
BASE="http://localhost:3000"

echo "🔥 DEVELOPERS DEVELOPERS DEVELOPERS! TESTING TIME!"

# Register device
echo -e "\n1️⃣ REGISTERING DEVICE..."
DEVICE=$(curl -s -X POST "$BASE/devices/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ballmer Test","type":"server"}')
DEVICE_ID=$(echo $DEVICE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ Device: $DEVICE_ID"

# Create Claude session
echo -e "\n2️⃣ CLAUDE SESSION..."
SESSION=$(curl -s -X POST "$BASE/sessions" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"config\":{\"provider\":\"claude\",\"model\":\"claude-sonnet-4-5-20250929\"}}")
SESSION_ID=$(echo $SESSION | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ Session: $SESSION_ID"

# Test Claude
echo -e "\n3️⃣ TESTING CLAUDE..."
RESPONSE=$(curl -s -X POST "$BASE/chat" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"message\":\"Say DEVELOPERS!\"}")
echo "📝 $(echo $RESPONSE | grep -o '"response":"[^"]*"' | cut -d'"' -f4)"
echo "💰 $(echo $RESPONSE | grep -o '"cost":[0-9.]*' | cut -d':' -f2)"

# Create ChatGPT session  
echo -e "\n4️⃣ CHATGPT SESSION..."
GPT_SESSION=$(curl -s -X POST "$BASE/sessions" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"config\":{\"provider\":\"chatgpt\",\"model\":\"gpt-4o\"}}")
GPT_ID=$(echo $GPT_SESSION | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ GPT Session: $GPT_ID"

# Test ChatGPT
echo -e "\n5️⃣ TESTING CHATGPT..."
GPT_RESP=$(curl -s -X POST "$BASE/chat" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$GPT_ID\",\"message\":\"Reply: I LOVE IT!\"}")
echo "📝 $(echo $GPT_RESP | grep -o '"response":"[^"]*"' | cut -d'"' -f4 | head -c 100)"

# Stats
echo -e "\n6️⃣ STATISTICS..."
curl -s "$BASE/stats" | head -c 500

echo -e "\n\n🎉 YEAHHHHH! THAT'S WHAT I'M TALKING ABOUT!"
