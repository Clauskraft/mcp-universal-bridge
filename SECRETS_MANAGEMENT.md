# 🔐 Secure Secrets Management System

Comprehensive API key and secret management for the MCP Universal AI Bridge with encryption, validation, and external secret manager integration.

## 🎯 Features

- **🔒 AES-256-GCM Encryption** - Military-grade encryption for all secrets
- **✅ API Key Validation** - Verify keys before storing (Anthropic, OpenAI, Google, GitHub)
- **🔄 Auto-initialization** - Import secrets from environment variables
- **⏰ Expiration Support** - Set expiration dates for secrets
- **🌐 External Integration** - Support for Google Secret Manager, Azure Key Vault, AWS Secrets Manager, HashiCorp Vault
- **📊 Statistics & Monitoring** - Track secret usage and status
- **🤖 AI Integration** - Tool definitions for AI assistants

## 🏗️ Architecture

### Local Encrypted Storage

```
.secrets/
├── key              # 32-byte encryption key (AES-256)
├── store.json       # Encrypted secrets storage
└── external.json    # External secret manager config (optional)
```

### Security Features

- **Encryption**: AES-256-GCM with authentication tags
- **Key Storage**: Separate encryption key file with 0o600 permissions
- **Gitignore**: Automatic .gitignore updates to prevent accidental commits
- **No Plain Text**: Secrets never stored or logged in plain text
- **Validation**: Pre-storage validation ensures keys work before storing

## 📡 API Endpoints

### Set a Secret

**POST** `/secrets/set`

Store an encrypted secret.

```bash
curl -X POST http://localhost:3000/secrets/set \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MY_API_KEY",
    "value": "sk-abc123...",
    "type": "api_key",
    "provider": "anthropic",
    "expiresAt": "2025-12-31T23:59:59Z",
    "metadata": {
      "description": "Production API key",
      "environment": "production"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Secret \"MY_API_KEY\" set successfully"
}
```

### Validate an API Key

**POST** `/secrets/validate`

Validate an API key without storing it.

```bash
curl -X POST http://localhost:3000/secrets/validate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "anthropic",
    "api_key": "sk-ant-api03-..."
  }'
```

**Response:**
```json
{
  "valid": true
}
```

Or if invalid:
```json
{
  "valid": false,
  "error": "Invalid API key"
}
```

### Set and Validate API Key

**POST** `/secrets/set-and-validate`

Validate then store an API key in one operation.

```bash
curl -X POST http://localhost:3000/secrets/set-and-validate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ANTHROPIC_API_KEY",
    "value": "sk-ant-api03-...",
    "provider": "anthropic"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Secret \"ANTHROPIC_API_KEY\" set successfully",
  "valid": true
}
```

### List Secrets

**GET** `/secrets/list`

List all secrets without revealing values.

```bash
curl http://localhost:3000/secrets/list
```

**Response:**
```json
{
  "secrets": [
    {
      "name": "ANTHROPIC_API_KEY",
      "type": "api_key",
      "provider": "anthropic",
      "createdAt": "2025-10-16T06:59:37.931Z",
      "updatedAt": "2025-10-16T06:59:37.931Z",
      "expired": false
    },
    {
      "name": "OPENAI_API_KEY",
      "type": "api_key",
      "provider": "openai",
      "createdAt": "2025-10-16T06:59:37.932Z",
      "updatedAt": "2025-10-16T06:59:37.932Z",
      "expired": false
    }
  ]
}
```

### Delete a Secret

**DELETE** `/secrets/:name`

Remove a secret from storage.

```bash
curl -X DELETE http://localhost:3000/secrets/ANTHROPIC_API_KEY
```

**Response:**
```json
{
  "success": true,
  "message": "Secret \"ANTHROPIC_API_KEY\" deleted successfully"
}
```

### Get Statistics

**GET** `/secrets/stats`

Get statistics about stored secrets.

```bash
curl http://localhost:3000/secrets/stats
```

**Response:**
```json
{
  "totalSecrets": 3,
  "byType": {
    "api_key": 3
  },
  "byProvider": {
    "anthropic": 1,
    "openai": 1,
    "google": 1
  },
  "expired": 0,
  "externalManagerConfigured": false,
  "lastUpdated": "2025-10-16T06:59:37.932Z"
}
```

### Configure External Secret Manager

**POST** `/secrets/external/configure`

Configure integration with external secret managers.

```bash
curl -X POST http://localhost:3000/secrets/external/configure \
  -H "Content-Type: application/json" \
  -d '{
    "type": "google",
    "enabled": true,
    "config": {
      "projectId": "my-project",
      "keyFilename": "/path/to/keyfile.json"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "External secret manager \"google\" configured successfully"
}
```

### Sync with External Manager

**POST** `/secrets/external/sync`

Synchronize secrets with external secret manager.

```bash
curl -X POST http://localhost:3000/secrets/external/sync
```

**Response:**
```json
{
  "success": true,
  "message": "Sync with external manager completed",
  "synced": 3
}
```

### Get AI Tool Definitions

**GET** `/secrets/tools`

Get tool definitions for AI assistants.

```bash
curl http://localhost:3000/secrets/tools
```

## 🔧 Programmatic Usage

### TypeScript/JavaScript

```typescript
import { secretsManager } from './tools/secrets-manager.js';

// Set and validate an API key
const result = await secretsManager.setAndValidateAPIKey(
  'ANTHROPIC_API_KEY',
  'sk-ant-api03-...',
  'anthropic'
);

if (result.valid) {
  console.log('✅ API key is valid and stored');
} else {
  console.error('❌ Invalid API key:', result.message);
}

// Get a secret
const apiKey = secretsManager.getSecret('ANTHROPIC_API_KEY');
if (apiKey) {
  // Use the API key
  console.log('Got API key');
} else {
  console.error('API key not found or expired');
}

// List all secrets
const secrets = secretsManager.listSecrets();
console.log(`Found ${secrets.length} secrets`);

// Get statistics
const stats = secretsManager.getStatistics();
console.log('Statistics:', stats);

// Delete a secret
const deleted = secretsManager.deleteSecret('OLD_KEY');
if (deleted.success) {
  console.log('Secret deleted');
}
```

## 🔑 Supported Providers

### Anthropic (Claude)

**Validation Endpoint:** `POST https://api.anthropic.com/v1/messages`

```bash
curl -X POST http://localhost:3000/secrets/set-and-validate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ANTHROPIC_API_KEY",
    "value": "sk-ant-api03-...",
    "provider": "anthropic"
  }'
```

### OpenAI (ChatGPT)

**Validation Endpoint:** `GET https://api.openai.com/v1/models`

```bash
curl -X POST http://localhost:3000/secrets/set-and-validate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OPENAI_API_KEY",
    "value": "sk-...",
    "provider": "openai"
  }'
```

### Google (Gemini)

**Validation Endpoint:** `GET https://generativelanguage.googleapis.com/v1beta/models`

```bash
curl -X POST http://localhost:3000/secrets/set-and-validate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GOOGLE_API_KEY",
    "value": "AIza...",
    "provider": "google"
  }'
```

### GitHub

**Validation Endpoint:** `GET https://api.github.com/user`

```bash
curl -X POST http://localhost:3000/secrets/set-and-validate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GITHUB_TOKEN",
    "value": "ghp_...",
    "provider": "github"
  }'
```

## 🌐 External Secret Managers

### Google Secret Manager

```typescript
secretsManager.configureExternalManager({
  type: 'google',
  enabled: true,
  config: {
    projectId: 'my-project',
    keyFilename: '/path/to/service-account.json'
  }
});

// Sync secrets
await secretsManager.syncWithExternal();
```

### Azure Key Vault

```typescript
secretsManager.configureExternalManager({
  type: 'azure',
  enabled: true,
  config: {
    vaultName: 'my-vault',
    clientId: '...',
    clientSecret: '...',
    tenantId: '...'
  }
});
```

### AWS Secrets Manager

```typescript
secretsManager.configureExternalManager({
  type: 'aws',
  enabled: true,
  config: {
    region: 'us-east-1',
    accessKeyId: '...',
    secretAccessKey: '...'
  }
});
```

### HashiCorp Vault

```typescript
secretsManager.configureExternalManager({
  type: 'hashicorp',
  enabled: true,
  config: {
    endpoint: 'https://vault.example.com',
    token: '...',
    namespace: 'my-namespace'
  }
});
```

## 🤖 AI Assistant Integration

The Secrets Management System provides tool definitions that can be used by AI assistants like Claude, ChatGPT, and Gemini.

### Available AI Tools

1. **set_api_key** - Securely set and validate an API key
2. **validate_api_key** - Validate an API key without storing it
3. **list_secrets** - List all stored secrets (without values)

### Example AI Usage

```typescript
// Get tool definitions
const response = await fetch('http://localhost:3000/secrets/tools');
const { tools } = await response.json();

// Pass tools to AI provider
const aiResponse = await provider.chat({
  message: "Please set my Anthropic API key",
  tools: tools,
  // AI will call set_api_key tool
});
```

## 🔒 Security Best Practices

### 1. File Permissions

The secrets manager automatically sets secure file permissions:
- Encryption key: `0o600` (read/write owner only)
- Secrets store: `0o600` (read/write owner only)
- External config: `0o600` (read/write owner only)

### 2. Gitignore Protection

The `.secrets/` directory is automatically added to `.gitignore` to prevent accidental commits.

### 3. Environment Variable Migration

Existing environment variables are automatically imported on first startup:

```bash
# Set environment variables
export ANTHROPIC_API_KEY="sk-ant-api03-..."
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="AIza..."

# Start server - secrets automatically imported and encrypted
npm run dev
```

### 4. Secret Expiration

Set expiration dates for temporary keys:

```typescript
secretsManager.setSecret({
  name: 'TEMP_KEY',
  value: 'sk-...',
  type: 'api_key',
  provider: 'anthropic',
  expiresAt: new Date('2025-12-31'),
  metadata: {
    purpose: 'Demo environment'
  }
});
```

### 5. Regular Rotation

Implement key rotation policies:

```typescript
// Check for expired secrets
const secrets = secretsManager.listSecrets();
const expired = secrets.filter(s => s.expired);

if (expired.length > 0) {
  console.warn(`⚠️ ${expired.length} expired secrets need rotation`);
}
```

## 📊 Monitoring & Maintenance

### Check Secret Health

```bash
# Get statistics
curl http://localhost:3000/secrets/stats

# List all secrets with expiration status
curl http://localhost:3000/secrets/list
```

### Export for Backup

```typescript
// Export secrets to .env format (use carefully!)
const envBackup = secretsManager.exportToEnv();
// Save to secure backup location
```

### Cleanup

```bash
# Delete expired or unused secrets
curl -X DELETE http://localhost:3000/secrets/OLD_KEY
```

## 🚨 Error Handling

### Invalid API Key

```json
{
  "success": false,
  "message": "Invalid API key: authentication failed",
  "valid": false
}
```

### Secret Not Found

```json
{
  "success": false,
  "message": "Secret \"MISSING_KEY\" not found"
}
```

### Expired Secret

When attempting to retrieve an expired secret:

```typescript
const key = secretsManager.getSecret('EXPIRED_KEY');
// Returns null
// Console logs: "⚠️ Secret \"EXPIRED_KEY\" has expired"
```

## 🔧 Implementation Details

### Encryption Algorithm

- **Algorithm**: AES-256-GCM (Advanced Encryption Standard, 256-bit, Galois/Counter Mode)
- **Key Size**: 32 bytes (256 bits)
- **IV Size**: 16 bytes (128 bits)
- **Authentication**: Built-in authentication tag for integrity verification

### Storage Format

```json
{
  "secrets": {
    "ANTHROPIC_API_KEY": {
      "encryptedValue": "a1b2c3...:<auth-tag>",
      "iv": "d4e5f6...",
      "type": "api_key",
      "provider": "anthropic",
      "createdAt": "2025-10-16T06:59:37.931Z",
      "updatedAt": "2025-10-16T06:59:37.931Z"
    }
  },
  "version": 1,
  "updatedAt": "2025-10-16T06:59:37.932Z"
}
```

## 📚 Related Documentation

- [GitHub Integration](./GITHUB_INTEGRATION.md)
- [AI Collaboration](./AI_COLLABORATION.md)
- [API Reference](./API_REFERENCE.md)
- [Security Best Practices](./SECURITY.md)

## 🤝 Contributing

When adding new secret providers:

1. Add provider to `validateAPIKey()` switch statement
2. Implement provider-specific validation method
3. Add provider to AI tool definitions
4. Update documentation
5. Add tests for new provider

## 📝 License

Part of the MCP Universal AI Bridge project.

---

**🔐 Keep your secrets safe!**
