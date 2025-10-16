# External Data Integration - Dokumentation

## 🎯 Formål

Ekstern Data Integration gør det muligt for eksterne applikationer at sende struktureret data til mcp-bridge's real-time capture system via REST API uden at skulle bruge WebSocket forbindelser.

**Nøgle Features:**
- ✅ REST API integration (ingen WebSocket påkrævet)
- ✅ Batch data upload
- ✅ Session management
- ✅ Genbrugelig arkitektur
- ✅ Samme data processing som real-time capture
- ✅ Event handler system for extensibility

## 🏗️ Arkitektur

### Modulær Design (3 lag)

```
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL APPLICATION                        │
│  (Web app, mobile app, server, script, etc.)               │
├─────────────────────────────────────────────────────────────┤
│  - Genererer struktureret data                              │
│  - Sender via HTTP POST requests                            │
│  - Modtager session ID og bekræftelse                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                     HTTP POST/GET
              (http://localhost:3000/external/data/...)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  INTEGRATION LAYER                           │
│  external-data-adapter.ts (NYT)                             │
├─────────────────────────────────────────────────────────────┤
│  - REST API endpoints                                        │
│  - Session creation & management                             │
│  - Data validation & transformation                          │
│  - Batch upload support                                      │
│  - Konverterer eksterne data til CaptureEvents              │
└─────────────────────────────────────────────────────────────┘
                            ↓
              Interagerer med (uses)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  REAL-TIME CAPTURE LAYER                     │
│  realtime-capture.ts (EXISTING)                             │
├─────────────────────────────────────────────────────────────┤
│  - Event buffering & storage                                 │
│  - Session lifecycle management                              │
│  - Event handler system                                      │
│  - File-based persistence                                    │
│  - Multi-client support                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
              Event Handler System
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              PROCESSING & STORAGE LAYER                      │
│  teams-transcript-handler.ts (kan udvides)                  │
├─────────────────────────────────────────────────────────────┤
│  - Data processing & formatting                              │
│  - Markdown generation                                       │
│  - Storage integration                                       │
│  - Custom output formats                                     │
└─────────────────────────────────────────────────────────────┘
```

## 📡 API Endpoints

### 1. Create Session

**POST** `/external/data/sessions/create`

Opret en ny data capture session for ekstern applikation.

**Request Body:**
```json
{
  "title": "Data Collection Session Title",
  "platform": "my-application",
  "metadata": {
    "source": "web-app",
    "userId": "user123",
    "environment": "production"
  }
}
```

**Response:**
```json
{
  "session": {
    "id": "ext-1234567890-abcdef",
    "title": "Data Collection Session Title",
    "platform": "external-my-application",
    "startedAt": "2025-10-16T12:00:00.000Z",
    "status": "active",
    "eventCount": 0,
    "metadata": {
      "source": "web-app",
      "userId": "user123",
      "environment": "production",
      "createdVia": "REST"
    }
  },
  "message": "External session created successfully"
}
```

### 2. Upload Data

**POST** `/external/data/upload`

Upload data til en eksisterende session.

**Request Body:**
```json
{
  "sessionId": "ext-1234567890-abcdef",
  "platform": "my-application",
  "data": [
    {
      "timestamp": "2025-10-16T12:00:01.000Z",
      "eventType": "user_action",
      "userId": "user123",
      "action": "click",
      "target": "submit-button",
      "metadata": {
        "page": "/checkout",
        "duration": 150
      }
    },
    {
      "timestamp": "2025-10-16T12:00:02.000Z",
      "eventType": "api_call",
      "endpoint": "/api/orders",
      "method": "POST",
      "statusCode": 200,
      "responseTime": 245
    }
  ],
  "metadata": {
    "batchId": "batch-001",
    "uploadTime": "2025-10-16T12:00:03.000Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "eventCount": 2,
  "message": "Successfully uploaded 2 events"
}
```

### 3. Create and Upload (Combined)

**POST** `/external/data/sessions/create-and-upload`

Opret session og upload data i én operation.

**Request Body:**
```json
{
  "title": "Quick Data Upload",
  "platform": "analytics-tool",
  "metadata": {
    "source": "batch-processor"
  },
  "data": [
    { "metric": "page_views", "value": 1523, "timestamp": "2025-10-16T12:00:00.000Z" },
    { "metric": "unique_visitors", "value": 834, "timestamp": "2025-10-16T12:00:00.000Z" }
  ]
}
```

**Response:**
```json
{
  "session": {
    "id": "ext-1234567890-xyz789",
    "title": "Quick Data Upload",
    "platform": "external-analytics-tool",
    "startedAt": "2025-10-16T12:00:00.000Z",
    "status": "active",
    "eventCount": 2
  },
  "uploadResult": {
    "success": true,
    "eventCount": 2,
    "message": "Successfully uploaded 2 events"
  },
  "message": "Session created and data uploaded successfully"
}
```

### 4. End Session

**POST** `/external/data/sessions/:id/end`

Afslut en session og trigger processing.

**Response:**
```json
{
  "session": {
    "id": "ext-1234567890-abcdef",
    "title": "Data Collection Session Title",
    "platform": "external-my-application",
    "startedAt": "2025-10-16T12:00:00.000Z",
    "endedAt": "2025-10-16T12:15:00.000Z",
    "status": "completed",
    "eventCount": 150
  },
  "message": "Session ended successfully"
}
```

### 5. List Sessions

**GET** `/external/data/sessions`

Hent liste over alle eksterne sessions.

**Response:**
```json
{
  "sessions": [
    {
      "id": "ext-1234567890-abcdef",
      "title": "Data Collection Session Title",
      "platform": "external-my-application",
      "status": "completed",
      "eventCount": 150,
      "startedAt": "2025-10-16T12:00:00.000Z",
      "endedAt": "2025-10-16T12:15:00.000Z"
    }
  ],
  "count": 1
}
```

### 6. Get Session with Events

**GET** `/external/data/sessions/:id`

Hent session med alle events.

**Response:**
```json
{
  "session": {
    "id": "ext-1234567890-abcdef",
    "title": "Data Collection Session Title",
    "platform": "external-my-application",
    "status": "completed",
    "eventCount": 2
  },
  "events": [
    {
      "timestamp": "2025-10-16T12:00:01.000Z",
      "sessionId": "ext-1234567890-abcdef",
      "platform": "my-application",
      "data": {
        "eventType": "user_action",
        "action": "click"
      },
      "metadata": {
        "uploadedVia": "REST"
      }
    }
  ]
}
```

### 7. Get Session Statistics

**GET** `/external/data/sessions/:id/stats`

Hent statistik for en session.

**Response:**
```json
{
  "sessionId": "ext-1234567890-abcdef",
  "title": "Data Collection Session Title",
  "platform": "external-my-application",
  "status": "completed",
  "duration": 900000,
  "eventCount": 150,
  "startedAt": "2025-10-16T12:00:00.000Z",
  "endedAt": "2025-10-16T12:15:00.000Z"
}
```

### 8. Batch Upload

**POST** `/external/data/batch-upload`

Upload data til flere sessions samtidig.

**Request Body:**
```json
{
  "uploads": [
    {
      "sessionId": "ext-session-1",
      "payload": {
        "platform": "app-1",
        "data": [{"event": "data1"}]
      }
    },
    {
      "sessionId": "ext-session-2",
      "payload": {
        "platform": "app-2",
        "data": [{"event": "data2"}]
      }
    }
  ]
}
```

**Response:**
```json
{
  "successful": 2,
  "failed": 0,
  "results": [
    { "sessionId": "ext-session-1", "success": true },
    { "sessionId": "ext-session-2", "success": true }
  ]
}
```

## 💻 Integration Eksempler

### JavaScript/Node.js

```javascript
const fetch = require('node-fetch');

class ExternalDataClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async createSession(title, platform, metadata = {}) {
    const response = await fetch(`${this.baseUrl}/external/data/sessions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, platform, metadata })
    });

    const result = await response.json();
    return result.session.id;
  }

  async uploadData(sessionId, platform, data, metadata = {}) {
    const response = await fetch(`${this.baseUrl}/external/data/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, platform, data, metadata })
    });

    return await response.json();
  }

  async endSession(sessionId) {
    const response = await fetch(`${this.baseUrl}/external/data/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    return await response.json();
  }

  async getSessions() {
    const response = await fetch(`${this.baseUrl}/external/data/sessions`);
    return await response.json();
  }
}

// Brug eksempel
async function main() {
  const client = new ExternalDataClient();

  // Opret session
  const sessionId = await client.createSession(
    'User Activity Log',
    'my-web-app',
    { userId: 'user123', environment: 'production' }
  );

  console.log('Session created:', sessionId);

  // Upload data
  const data = [
    { timestamp: new Date().toISOString(), action: 'login', userId: 'user123' },
    { timestamp: new Date().toISOString(), action: 'view_page', page: '/dashboard' }
  ];

  const result = await client.uploadData(sessionId, 'my-web-app', data);
  console.log('Data uploaded:', result);

  // Afslut session
  await client.endSession(sessionId);
  console.log('Session ended');
}

main();
```

### Python

```python
import requests
from datetime import datetime
from typing import List, Dict, Any

class ExternalDataClient:
    def __init__(self, base_url: str = 'http://localhost:3000'):
        self.base_url = base_url

    def create_session(self, title: str, platform: str, metadata: Dict = None) -> str:
        response = requests.post(
            f'{self.base_url}/external/data/sessions/create',
            json={
                'title': title,
                'platform': platform,
                'metadata': metadata or {}
            }
        )
        response.raise_for_status()
        return response.json()['session']['id']

    def upload_data(self, session_id: str, platform: str, data: List[Dict], metadata: Dict = None):
        response = requests.post(
            f'{self.base_url}/external/data/upload',
            json={
                'sessionId': session_id,
                'platform': platform,
                'data': data,
                'metadata': metadata or {}
            }
        )
        response.raise_for_status()
        return response.json()

    def end_session(self, session_id: str):
        response = requests.post(
            f'{self.base_url}/external/data/sessions/{session_id}/end'
        )
        response.raise_for_status()
        return response.json()

    def get_sessions(self):
        response = requests.get(f'{self.base_url}/external/data/sessions')
        response.raise_for_status()
        return response.json()

# Brug eksempel
if __name__ == '__main__':
    client = ExternalDataClient()

    # Opret session
    session_id = client.create_session(
        title='Analytics Data Collection',
        platform='analytics-service',
        metadata={'source': 'batch-processor'}
    )

    print(f'Session created: {session_id}')

    # Upload data
    data = [
        {'metric': 'page_views', 'value': 1523, 'timestamp': datetime.now().isoformat()},
        {'metric': 'unique_visitors', 'value': 834, 'timestamp': datetime.now().isoformat()}
    ]

    result = client.upload_data(session_id, 'analytics-service', data)
    print(f'Data uploaded: {result}')

    # Afslut session
    client.end_session(session_id)
    print('Session ended')
```

### cURL

```bash
# 1. Opret session
SESSION_ID=$(curl -X POST http://localhost:3000/external/data/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Session",
    "platform": "curl-test",
    "metadata": {"source": "terminal"}
  }' | jq -r '.session.id')

echo "Session ID: $SESSION_ID"

# 2. Upload data
curl -X POST http://localhost:3000/external/data/upload \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"platform\": \"curl-test\",
    \"data\": [
      {\"event\": \"test1\", \"timestamp\": \"$(date -Iseconds)\"},
      {\"event\": \"test2\", \"timestamp\": \"$(date -Iseconds)\"}
    ]
  }"

# 3. Afslut session
curl -X POST http://localhost:3000/external/data/sessions/$SESSION_ID/end

# 4. Hent session data
curl http://localhost:3000/external/data/sessions/$SESSION_ID
```

## 🔄 Use Cases

### 1. Web Application Analytics
```javascript
// Track user interactions
const sessionId = await client.createSession('User Session Analytics', 'web-app');

// Batch upload user events
await client.uploadData(sessionId, 'web-app', [
  { event: 'page_view', page: '/home', timestamp: new Date().toISOString() },
  { event: 'button_click', button: 'signup', timestamp: new Date().toISOString() },
  { event: 'form_submit', form: 'registration', timestamp: new Date().toISOString() }
]);

await client.endSession(sessionId);
```

### 2. API Monitoring
```javascript
// Monitor API performance
const sessionId = await client.createSession('API Performance Log', 'api-monitor');

await client.uploadData(sessionId, 'api-monitor', [
  { endpoint: '/api/users', method: 'GET', responseTime: 45, statusCode: 200 },
  { endpoint: '/api/orders', method: 'POST', responseTime: 123, statusCode: 201 }
]);

await client.endSession(sessionId);
```

### 3. IoT Data Collection
```javascript
// Collect sensor data
const sessionId = await client.createSession('Temperature Monitoring', 'iot-sensors');

setInterval(async () => {
  await client.uploadData(sessionId, 'iot-sensors', [
    { sensor: 'temp-1', temperature: 22.5, humidity: 65, timestamp: new Date().toISOString() },
    { sensor: 'temp-2', temperature: 23.1, humidity: 62, timestamp: new Date().toISOString() }
  ]);
}, 60000); // Every minute
```

### 4. Log Aggregation
```javascript
// Aggregate logs from multiple services
const sessionId = await client.createSession('Service Logs', 'log-aggregator');

// Batch upload logs
await client.uploadData(sessionId, 'log-aggregator', logEntries);

await client.endSession(sessionId);
```

## 🎨 Custom Processing

### Tilføj Custom Event Handler

```typescript
// custom-processor.ts
import { realtimeCaptureManager } from './utils/realtime-capture.js';

// Lyt til events fra eksterne sessions
realtimeCaptureManager.registerEventHandler('event:received', (event) => {
  // Kun process events fra eksterne sessions
  if (event.platform.startsWith('external-')) {
    console.log('Processing external event:', event);

    // Custom processing logic
    if (event.data.eventType === 'user_action') {
      // Process user actions
      processUserAction(event);
    } else if (event.data.eventType === 'api_call') {
      // Process API calls
      processAPICall(event);
    }
  }
});

// Lyt til session afslutning
realtimeCaptureManager.registerEventHandler('session:ended', (session) => {
  if (session.platform.startsWith('external-')) {
    console.log('External session ended:', session.id);

    // Generate custom report
    generateSessionReport(session);
  }
});
```

## 📊 Data Format Guidelines

### Recommended Data Structure

```json
{
  "timestamp": "ISO 8601 timestamp",
  "eventType": "category of event",
  "userId": "optional user identifier",
  "data": {
    // Event-specific data
  },
  "metadata": {
    "source": "data source identifier",
    "version": "data format version"
  }
}
```

### Best Practices

1. **Always include timestamps**: Either in each data item or use server timestamp
2. **Use consistent event types**: Define a schema for your application
3. **Include metadata**: Source, version, environment info
4. **Batch uploads**: Send multiple events together for efficiency
5. **Error handling**: Always check response status and handle errors
6. **Session management**: Always end sessions when done
7. **Data validation**: Validate data before sending

## 🔧 Configuration

### Environment Variables

```bash
# Backend server
MCP_BRIDGE_PORT=3000
MCP_BRIDGE_HOST=localhost

# CORS configuration
ALLOWED_ORIGINS=http://localhost:8080,https://your-app.com
```

### Custom Storage Directory

```typescript
// Modify in src/utils/realtime-capture.ts
export const realtimeCaptureManager = new RealtimeCaptureManager('./custom-storage-dir');
```

## 🚀 Hosting Anbefalinger

Se [HOSTING_RECOMMENDATIONS.md](./HOSTING_RECOMMENDATIONS.md) for detaljerede hosting guidelines.

### Quick Summary

**For Development:**
- ✅ Local (localhost:3000)
- ✅ Embedded i eksisterende Node.js app

**For Production:**
- ✅ Cloud hosting (AWS, GCP, Azure, DigitalOcean)
- ✅ Containerized (Docker/Kubernetes)
- ✅ Reverse proxy (nginx/Caddy)
- ✅ SSL/TLS encryption

## 🐛 Troubleshooting

### Common Issues

**Problem**: Connection refused
- Check server is running: `npm run dev`
- Verify port 3000 is available
- Check firewall settings

**Problem**: Session not found
- Ensure session was created successfully
- Check session ID is correct
- Verify session hasn't expired

**Problem**: Data not uploaded
- Check data format matches API requirements
- Verify session is in 'active' status
- Check server logs for errors

**Problem**: Events not processing
- Check event handlers are registered
- Verify processing logic has no errors
- Check event buffer is being flushed

## 📚 Related Documentation

- [TEAMS_CAPTURE_IMPLEMENTATION.md](./TEAMS_CAPTURE_IMPLEMENTATION.md) - Real-time capture system
- [MCP_ORCHESTRATOR_AGENT.md](./MCP_ORCHESTRATOR_AGENT.md) - Intelligent agent system
- [extension/README.md](./extension/README.md) - Chrome Extension documentation

## ✅ Success Criteria

- ✅ External applications can create sessions via REST API
- ✅ Data can be uploaded in batches
- ✅ Sessions can be managed (create, upload, end)
- ✅ Data is persisted and processable
- ✅ Same event handler system as real-time capture
- ✅ Custom processing can be added
- ✅ API is well-documented and easy to integrate

## 🎉 Summary

External Data Integration giver en fleksibel og kraftfuld måde at integrere eksterne applikationer med mcp-bridge's real-time capture system. Det genbruger den modulære arkitektur og giver:

- **REST API integration** - Ingen WebSocket påkrævet
- **Genbrugelig** - Samme processing som Teams capture
- **Fleksibel** - Custom event handlers
- **Skalerbar** - Batch uploads og multi-session support
- **Dokumenteret** - Comprehensive guides og eksempler

**Status**: ✅ Fully Implemented and Ready to Use
