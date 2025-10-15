# FULL API TEST - STEVE BALLMER STYLE!
$BASE = "http://localhost:3000"

Write-Host "🔥 TESTING MCP UNIVERSAL AI BRIDGE! LET'S GO!" -ForegroundColor Yellow

# 1. Register Device
Write-Host "`n1️⃣ REGISTERING DEVICE..." -ForegroundColor Cyan
$device = curl -s -X POST "$BASE/devices/register" -H "Content-Type: application/json" -d '{"name":"Test Device","type":"web"}' | ConvertFrom-Json
$deviceId = $device.device.id
Write-Host "✅ Device ID: $deviceId" -ForegroundColor Green

# 2. Create Claude Session
Write-Host "`n2️⃣ CREATING CLAUDE SESSION..." -ForegroundColor Cyan
$session = curl -s -X POST "$BASE/sessions" -H "Content-Type: application/json" -d "{`"deviceId`":`"$deviceId`",`"config`":{`"provider`":`"claude`",`"model`":`"claude-sonnet-4-5-20250929`",`"temperature`":0.7}}" | ConvertFrom-Json
$sessionId = $session.session.id
Write-Host "✅ Session ID: $sessionId" -ForegroundColor Green

# 3. Test Regular Chat
Write-Host "`n3️⃣ TESTING REGULAR CHAT..." -ForegroundColor Cyan
$chat = curl -s -X POST "$BASE/chat" -H "Content-Type: application/json" -d "{`"sessionId`":`"$sessionId`",`"message`":`"Say 'HELLO WORLD' in uppercase`"}" | ConvertFrom-Json
Write-Host "📝 Response: $($chat.response)" -ForegroundColor White
Write-Host "💰 Cost: `$$($chat.usage.cost)" -ForegroundColor Yellow
Write-Host "⚡ Tokens: $($chat.usage.totalTokens)" -ForegroundColor Yellow

# 4. Create ChatGPT Session
Write-Host "`n4️⃣ CREATING CHATGPT SESSION..." -ForegroundColor Cyan
$gptSession = curl -s -X POST "$BASE/sessions" -H "Content-Type: application/json" -d "{`"deviceId`":`"$deviceId`",`"config`":{`"provider`":`"chatgpt`",`"model`":`"gpt-4o`",`"temperature`":0.7}}" | ConvertFrom-Json
$gptSessionId = $gptSession.session.id
Write-Host "✅ GPT Session ID: $gptSessionId" -ForegroundColor Green

# 5. Test ChatGPT
Write-Host "`n5️⃣ TESTING CHATGPT..." -ForegroundColor Cyan
$gptChat = curl -s -X POST "$BASE/chat" -H "Content-Type: application/json" -d "{`"sessionId`":`"$gptSessionId`",`"message`":`"Reply with exactly: CHATGPT WORKS`"}" | ConvertFrom-Json
Write-Host "📝 Response: $($gptChat.response)" -ForegroundColor White
Write-Host "💰 Cost: `$$($gptChat.usage.cost)" -ForegroundColor Yellow

# 6. Get Stats
Write-Host "`n6️⃣ GETTING STATISTICS..." -ForegroundColor Cyan
$stats = curl -s "$BASE/stats" | ConvertFrom-Json
Write-Host "📊 Total Devices: $($stats.totalDevices)" -ForegroundColor White
Write-Host "📊 Total Sessions: $($stats.totalSessions)" -ForegroundColor White
Write-Host "📊 Messages Sent: $($stats.messagesSent)" -ForegroundColor White
Write-Host "📊 Tokens Used: $($stats.tokensUsed)" -ForegroundColor White

Write-Host "`n🎉 ALL TESTS COMPLETED!" -ForegroundColor Green
