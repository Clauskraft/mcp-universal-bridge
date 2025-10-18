# 🔐 TASK 2: API Key Management Strategy for Multi-Endpoint Work

**Project:** MCP Universal AI Bridge
**Analysis Date:** October 18, 2025
**Security Focus:** Multi-location, online/offline key management
**Use Case:** Solo developer working from PC (home), laptop (mobile), Railway (cloud)

---

## Table of Contents

1. [Requirements Analysis](#requirements-analysis)
2. [Recommended Solution](#recommended-solution)
3. [Alternative Solutions](#alternative-solutions)
4. [Implementation Guide](#implementation-guide)
5. [Migration Plan](#migration-plan)
6. [Security Considerations](#security-considerations)

---

## Requirements Analysis

### Core Requirements

**Multi-Endpoint Work:**
- ✅ PC hjemme (primary development)
- ✅ Laptop på farten (mobile development)
- ✅ Railway server (production deployment)

**Online/Offline Capability:**
- ✅ Work offline when no internet
- ✅ Sync keys when online
- ✅ Fallback to cached keys

**Security:**
- ✅ No keys in git repository
- ✅ Encrypted storage locally
- ✅ Secure cloud backup
- ✅ Key rotation without downtime

**Developer Experience:**
- ✅ Easy setup on new machine
- ✅ Automatic synchronization
- ✅ Simple key rotation
- ✅ No manual environment variable setup on each deployment

**Future-Proofing:**
- ✅ Support multiple developers (future)
- ✅ Environment separation (dev/staging/prod)
- ✅ Audit trail for key access
- ✅ Automated key rotation

---

## Recommended Solution

### **Hybrid Approach: 1Password CLI + Railway Env Vars + Local Encrypted Fallback**

**Why This Solution:**
- ✅ Works perfectly for solo developer with multiple machines
- ✅ Offline capability with local encrypted cache
- ✅ Online sync across devices when connected
- ✅ Railway integration for production
- ✅ Zero-cost solution (1Password likely already used)
- ✅ Battle-tested security
- ✅ Easy key rotation
- ✅ Scales to team if needed

---

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Developer Workflow                      │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   1Password      │
                    │   Vault          │
                    │  (Cloud Sync)    │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
   ┌────────────┐     ┌────────────┐    ┌────────────┐
   │ PC Hjemme  │     │   Laptop   │    │  Railway   │
   │            │     │            │    │ Production │
   └─────┬──────┘     └─────┬──────┘    └─────┬──────┘
         │                  │                  │
         ▼                  ▼                  ▼
   ┌────────────┐     ┌────────────┐    ┌────────────┐
   │ 1Password  │     │ 1Password  │    │ Railway    │
   │    CLI     │     │    CLI     │    │  Env Vars  │
   │     ↓      │     │     ↓      │    │ (Manual 1x)│
   │  .env.op   │     │  .env.op   │    └────────────┘
   └────────────┘     └────────────┘
         │                  │
         ▼                  ▼
   ┌────────────┐     ┌────────────┐
   │ Encrypted  │     │ Encrypted  │
   │   Cache    │     │   Cache    │
   │ (Offline)  │     │ (Offline)  │
   └────────────┘     └────────────┘

   ONLINE: Uses 1Password CLI → Syncs from vault
   OFFLINE: Uses encrypted local cache → No sync
   RAILWAY: Uses environment variables (set once via dashboard/CLI)
```

---

### Components

#### 1. **1Password (Cloud Key Vault)**

**Purpose:** Central source of truth for all API keys

**Setup:**
- Create vault named "MCP Bridge API Keys"
- Store all keys with metadata (provider, environment, created date)
- Enable CLI access

**Keys to Store:**
```
ANTHROPIC_API_KEY_DEV
ANTHROPIC_API_KEY_PROD
OPENAI_API_KEY_DEV
OPENAI_API_KEY_PROD
GOOGLE_API_KEY_DEV
GOOGLE_API_KEY_PROD
GITHUB_TOKEN_DEV
GITHUB_TOKEN_PROD
GROK_API_KEY_DEV
GROK_API_KEY_PROD
```

**Advantages:**
- ✅ You likely already use 1Password
- ✅ Free for personal use
- ✅ Excellent CLI tool
- ✅ Works offline (cached)
- ✅ Cross-platform (Windows, Mac, Linux)
- ✅ Built-in key rotation

**Cost:** $0 (assuming existing 1Password subscription)

---

#### 2. **1Password CLI Integration**

**Installation:**
```bash
# Windows
winget install 1Password.CLI

# Mac
brew install --cask 1password-cli

# Linux
curl -sS https://downloads.1password.com/linux/keys/1password.asc | \
  sudo gpg --dearmor --output /usr/share/keyrings/1password-archive-keyring.gpg
```

**Authentication:**
```bash
# One-time setup per machine
op account add

# Sign in (cached for 30 minutes)
eval $(op signin)
```

**Usage:**
```bash
# Load environment from 1Password
op run --env-file=".env.op" -- npm run dev

# Or use in scripts
export ANTHROPIC_API_KEY=$(op read "op://MCP Bridge API Keys/Anthropic API Key DEV/credential")
```

---

#### 3. **Local Encrypted Cache (Offline Fallback)**

**Purpose:** Work when 1Password cloud is unreachable

**Implementation:** Enhance existing `SecretsManager`

```typescript
// src/tools/secrets-manager.ts (enhanced)

export class SecretsManager {
  private onePasswordEnabled: boolean = false;
  private fallbackToLocal: boolean = true;

  /**
   * Get secret with 1Password fallback
   */
  async getSecretSmart(name: string): Promise<string | null> {
    // Try 1Password first (if online)
    if (this.onePasswordEnabled && await this.isOnline()) {
      try {
        const value = await this.getFrom1Password(name);
        if (value) {
          // Cache locally for offline use
          this.setSecret({ name, value, type: 'api_key' });
          return value;
        }
      } catch (error) {
        console.warn(`1Password unavailable, using local cache: ${error.message}`);
      }
    }

    // Fallback to encrypted local storage
    return this.getSecret(name);
  }

  /**
   * Fetch from 1Password CLI
   */
  private async getFrom1Password(name: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(
        `op read "op://MCP Bridge API Keys/${name}/credential"`
      );
      return stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Check if online
   */
  private async isOnline(): Promise<boolean> {
    try {
      await fetch('https://1password.com', { method: 'HEAD', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sync all keys from 1Password to local cache
   */
  async syncFrom1Password(): Promise<{ synced: number; failed: number }> {
    const keys = [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'GOOGLE_API_KEY',
      'GITHUB_TOKEN',
      'GROK_API_KEY',
    ];

    let synced = 0;
    let failed = 0;

    for (const key of keys) {
      try {
        const value = await this.getFrom1Password(key);
        if (value) {
          this.setSecret({ name: key, value, type: 'api_key' });
          synced++;
        }
      } catch {
        failed++;
      }
    }

    console.log(`✅ Synced ${synced} keys from 1Password`);
    if (failed > 0) {
      console.warn(`⚠️  Failed to sync ${failed} keys`);
    }

    return { synced, failed };
  }
}
```

---

#### 4. **Railway Environment Variables**

**Purpose:** Production deployment

**Setup (One-Time Per Environment):**

**Option 1: Railway Dashboard**
```
1. Go to: https://railway.app/project/your-project/variables
2. Click "New Variable"
3. Add each key:
   ANTHROPIC_API_KEY = sk-ant-prod-xxxxx
   OPENAI_API_KEY = sk-proj-prod-xxxxx
   GOOGLE_API_KEY = AIza-prod-xxxxx
4. Click "Deploy"
```

**Option 2: Railway CLI (Automated)**
```bash
# Login
railway login

# Link project
railway link

# Sync from 1Password to Railway
op run -- railway variables --set "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY"
op run -- railway variables --set "OPENAI_API_KEY=$OPENAI_API_KEY"
op run -- railway variables --set "GOOGLE_API_KEY=$GOOGLE_API_KEY"

# Or use sync script (see implementation below)
npm run sync:railway
```

---

### Workflow Examples

#### **Scenario 1: Fresh Machine Setup**

```bash
# 1. Clone repository
git clone https://github.com/your-username/mcp-bridge.git
cd mcp-bridge

# 2. Install dependencies
npm install

# 3. Sign in to 1Password
op signin

# 4. Run sync script
npm run sync:local

# 5. Start development (uses 1Password + local cache)
npm run dev

# That's it! No manual .env file creation
```

---

#### **Scenario 2: Working Offline (No Internet)**

```bash
# 1. Start server (automatically uses encrypted local cache)
npm run dev

# SecretsManager detects offline mode:
# ⚠️  1Password unavailable, using local cache
# ✅ Loaded 5 API keys from encrypted storage

# 2. Keys were pre-cached during last online session
# 3. Work continues seamlessly
```

---

#### **Scenario 3: Key Rotation**

```bash
# 1. Update key in 1Password (via app or CLI)
op item edit "Anthropic API Key PROD" credential="sk-ant-new-key"

# 2. Sync to local machines
npm run sync:local  # On PC
npm run sync:local  # On laptop

# 3. Update Railway
npm run sync:railway

# 4. Done! All environments updated in <2 minutes
```

---

#### **Scenario 4: New Team Member Onboarding (Future)**

```bash
# 1. Admin shares 1Password vault access
# (1Password supports vault sharing for teams)

# 2. New developer follows Scenario 1
op signin
npm install
npm run sync:local
npm run dev

# 3. They're productive immediately with correct keys
```

---

## Alternative Solutions

### Alternative 1: **Doppler (Secrets Management SaaS)**

**Pros:**
- ✅ Purpose-built for secrets management
- ✅ Excellent CLI and integrations
- ✅ Built-in sync across environments
- ✅ Railway integration available
- ✅ Team collaboration features
- ✅ Audit logs included

**Cons:**
- ❌ $10-20/month for personal use
- ❌ Another service to manage
- ❌ Requires internet for first fetch
- ❌ Overkill for solo developer

**When to Choose:**
- Team of 3+ developers
- Multiple projects needing secrets
- Need detailed audit logs
- Budget for $20/month

**Setup:**
```bash
# Install
npm install -g @doppler/cli

# Login
doppler login

# Setup project
doppler setup

# Run app
doppler run -- npm run dev

# Sync to Railway
doppler secrets download --no-file --format env | railway variables --set
```

**Cost:** $20/month (Team plan)

---

### Alternative 2: **AWS Secrets Manager + Railway**

**Pros:**
- ✅ Enterprise-grade security
- ✅ Fine-grained access control
- ✅ Automatic key rotation
- ✅ Pay-per-use pricing

**Cons:**
- ❌ Complex setup for solo developer
- ❌ AWS account required
- ❌ $0.40/secret/month + API costs
- ❌ No offline mode
- ❌ Steeper learning curve

**When to Choose:**
- Already using AWS infrastructure
- Need compliance (SOC2, HIPAA)
- Enterprise security requirements
- Budget for AWS costs

**Setup:**
```bash
# Install AWS CLI
winget install Amazon.AWSCLI

# Configure
aws configure

# Store secret
aws secretsmanager create-secret \
  --name ANTHROPIC_API_KEY_PROD \
  --secret-string "sk-ant-xxxxx"

# Retrieve in app
const secret = await secretsManagerClient.send(
  new GetSecretValueCommand({ SecretId: 'ANTHROPIC_API_KEY_PROD' })
);
```

**Cost:** ~$3-5/month for 5-10 secrets

---

### Alternative 3: **HashiCorp Vault (Self-Hosted)**

**Pros:**
- ✅ Open source
- ✅ Maximum control
- ✅ No recurring costs
- ✅ Industry standard

**Cons:**
- ❌ Complex setup and maintenance
- ❌ Server hosting costs ($5-10/month)
- ❌ Overkill for solo developer
- ❌ Significant learning curve

**When to Choose:**
- Need full control
- Already familiar with Vault
- Multiple services needing secrets
- Self-hosting preference

**Cost:** $5-10/month (server hosting)

---

### Alternative 4: **Git-Crypt (Encrypted .env in Git)**

**Pros:**
- ✅ Free
- ✅ Works offline
- ✅ Simple concept

**Cons:**
- ❌ Keys stored in git (even if encrypted)
- ❌ Risky if repository leaked
- ❌ No central key management
- ❌ Difficult key rotation
- ❌ Team collaboration challenges

**When to Choose:**
- Private repository only
- Solo developer forever
- Minimal security requirements

**NOT RECOMMENDED** for this project (too risky)

---

## Comparison Matrix

| Solution | Cost/Month | Offline | Team Ready | Setup Time | Security | Recommendation |
|----------|-----------|---------|------------|------------|----------|----------------|
| **1Password CLI** | $0* | ✅ Yes | ✅ Yes | 15 min | ⭐⭐⭐⭐⭐ | **BEST** |
| Doppler | $20 | ⚠️ Limited | ✅ Yes | 20 min | ⭐⭐⭐⭐⭐ | Good |
| AWS Secrets Mgr | $3-5 | ❌ No | ✅ Yes | 60 min | ⭐⭐⭐⭐⭐ | Overkill |
| HashiCorp Vault | $5-10 | ✅ Yes | ✅ Yes | 4+ hours | ⭐⭐⭐⭐⭐ | Too complex |
| Git-Crypt | $0 | ✅ Yes | ⚠️ Limited | 30 min | ⭐⭐ | Risky |
| Current (.env) | $0 | ✅ Yes | ❌ No | 5 min | ⭐⭐ | Not scalable |

*Assuming existing 1Password subscription

---

## Implementation Guide

### Phase 1: Set Up 1Password CLI (30 minutes)

**Step 1: Create 1Password Vault**

1. Open 1Password app
2. Create new vault: "MCP Bridge API Keys"
3. Add items for each key:

```
Item: Anthropic API Key DEV
- Username: development
- Password/Credential: sk-ant-api03-xxxxx
- Notes: Development key, created 2025-10-18

Item: Anthropic API Key PROD
- Username: production
- Password/Credential: sk-ant-api03-yyyyy
- Notes: Production key, created 2025-10-18

[Repeat for OpenAI, Google, GitHub, Grok...]
```

**Step 2: Install 1Password CLI**

```bash
# Windows
winget install 1Password.CLI

# Verify installation
op --version
```

**Step 3: Authenticate**

```bash
# Add account (one-time)
op account add

# Sign in
eval $(op signin)

# Test retrieval
op read "op://MCP Bridge API Keys/Anthropic API Key DEV/credential"
```

---

### Phase 2: Integrate with Existing Code (2 hours)

**File 1: Enhanced Secrets Manager** (`src/tools/secrets-manager.ts`)

Add the methods from the architecture section above:
- `getSecretSmart()` - Try 1Password first, fallback to local
- `getFrom1Password()` - Fetch from 1Password CLI
- `isOnline()` - Check connectivity
- `syncFrom1Password()` - Sync all keys to local cache

**File 2: Sync Script** (`scripts/sync-keys.ts`)

```typescript
import { secretsManager } from '../src/tools/secrets-manager.js';
import { execSync } from 'child_process';

async function syncKeys() {
  console.log('🔄 Syncing API keys from 1Password...\n');

  // Check 1Password CLI is available
  try {
    execSync('op --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ 1Password CLI not installed');
    console.error('   Install: winget install 1Password.CLI');
    process.exit(1);
  }

  // Check if signed in
  try {
    execSync('op whoami', { stdio: 'ignore' });
  } catch {
    console.error('❌ Not signed in to 1Password');
    console.error('   Run: eval $(op signin)');
    process.exit(1);
  }

  // Sync keys
  const result = await secretsManager.syncFrom1Password();

  console.log('\n📊 Sync Summary:');
  console.log(`   ✅ Synced: ${result.synced} keys`);
  console.log(`   ❌ Failed: ${result.failed} keys`);

  if (result.synced > 0) {
    console.log('\n✅ Keys cached locally for offline use');
  }

  if (result.failed > 0) {
    console.warn('\n⚠️  Some keys failed to sync - check 1Password vault');
  }
}

syncKeys();
```

**File 3: Railway Sync Script** (`scripts/sync-railway.ts`)

```typescript
import { execSync } from 'child_process';

function syncToRailway() {
  console.log('🚂 Syncing keys to Railway...\n');

  // Check Railway CLI
  try {
    execSync('railway --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ Railway CLI not installed');
    console.error('   Install: npm install -g @railway/cli');
    process.exit(1);
  }

  // Check if linked
  try {
    execSync('railway status', { stdio: 'ignore' });
  } catch {
    console.error('❌ Not linked to Railway project');
    console.error('   Run: railway link');
    process.exit(1);
  }

  const keys = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'GITHUB_TOKEN',
    'GROK_API_KEY',
  ];

  let synced = 0;

  for (const key of keys) {
    try {
      // Get from 1Password
      const value = execSync(
        `op read "op://MCP Bridge API Keys/${key} PROD/credential"`,
        { encoding: 'utf8' }
      ).trim();

      // Set in Railway
      execSync(`railway variables --set "${key}=${value}"`, { stdio: 'ignore' });

      console.log(`✅ ${key}`);
      synced++;
    } catch (error) {
      console.error(`❌ ${key}: ${error.message}`);
    }
  }

  console.log(`\n📊 Synced ${synced}/${keys.length} keys to Railway`);
}

syncToRailway();
```

**File 4: Update package.json**

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",

    "sync:local": "tsx scripts/sync-keys.ts",
    "sync:railway": "tsx scripts/sync-railway.ts",
    "sync:all": "npm run sync:local && npm run sync:railway",

    "keys:status": "tsx scripts/check-keys-status.ts",
    "keys:rotate": "tsx scripts/rotate-keys.ts"
  }
}
```

---

### Phase 3: Update Server Initialization (30 minutes)

**File: `src/server.ts`**

```typescript
import { secretsManager } from './tools/secrets-manager.js';

// Initialize secrets before starting server
async function initializeServer() {
  console.log('🔧 Initializing MCP Universal AI Bridge...\n');

  // Try to sync from 1Password (if online)
  try {
    await secretsManager.syncFrom1Password();
    console.log('✅ Keys synced from 1Password\n');
  } catch (error) {
    console.warn('⚠️  Using cached local keys:', error.message, '\n');
  }

  // Validate keys are available
  const requiredKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_API_KEY'];
  const missing: string[] = [];

  for (const key of requiredKeys) {
    const value = await secretsManager.getSecretSmart(key);
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required API keys:', missing.join(', '));
    console.error('   Run: npm run sync:local');
    process.exit(1);
  }

  console.log('✅ All required keys available\n');

  // Start server
  startServer();
}

initializeServer();
```

---

### Phase 4: Create Helper Scripts (1 hour)

**Script 1: Check Keys Status** (`scripts/check-keys-status.ts`)

```typescript
async function checkStatus() {
  const keys = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'GITHUB_TOKEN',
    'GROK_API_KEY',
  ];

  console.log('🔍 Checking API Key Status\n');
  console.log('Source Priority: 1Password → Local Cache → .env\n');

  for (const key of keys) {
    // Check 1Password
    let in1Password = false;
    try {
      execSync(`op read "op://MCP Bridge API Keys/${key} DEV/credential"`, { stdio: 'ignore' });
      in1Password = true;
    } catch {}

    // Check local cache
    const inCache = !!secretsManager.getSecret(key);

    // Check .env
    const inEnv = !!process.env[key];

    console.log(`${key}:`);
    console.log(`  1Password: ${in1Password ? '✅' : '❌'}`);
    console.log(`  Local Cache: ${inCache ? '✅' : '❌'}`);
    console.log(`  .env File: ${inEnv ? '✅' : '⚠️'}`);
    console.log();
  }
}
```

**Script 2: Rotate Keys** (`scripts/rotate-keys.ts`)

```typescript
import prompts from 'prompts';

async function rotateKeys() {
  console.log('🔄 API Key Rotation Tool\n');

  const { provider } = await prompts({
    type: 'select',
    name: 'provider',
    message: 'Which provider key to rotate?',
    choices: [
      { title: 'Anthropic (Claude)', value: 'anthropic' },
      { title: 'OpenAI (ChatGPT)', value: 'openai' },
      { title: 'Google (Gemini)', value: 'google' },
      { title: 'GitHub', value: 'github' },
      { title: 'xAI (Grok)', value: 'grok' },
    ],
  });

  const { newKey } = await prompts({
    type: 'password',
    name: 'newKey',
    message: 'Enter new API key:',
  });

  // 1. Update in 1Password
  console.log('\n1️⃣ Updating 1Password...');
  execSync(`op item edit "${provider} API Key PROD" credential="${newKey}"`);
  console.log('✅ Updated in 1Password');

  // 2. Sync to local cache
  console.log('\n2️⃣ Syncing to local cache...');
  await secretsManager.syncFrom1Password();
  console.log('✅ Local cache updated');

  // 3. Confirm Railway update
  const { updateRailway } = await prompts({
    type: 'confirm',
    name: 'updateRailway',
    message: 'Update Railway production?',
  });

  if (updateRailway) {
    console.log('\n3️⃣ Updating Railway...');
    execSync(`railway variables --set "${provider.toUpperCase()}_API_KEY=${newKey}"`);
    console.log('✅ Railway updated');
  }

  console.log('\n✅ Key rotation complete!');
}
```

---

## Migration Plan

### From Current Setup (.env files)

**Current State:**
- ✅ `.env` file locally (gitignored)
- ⚠️  Railway environment variables (manual setup)
- ❌ No sync between machines
- ❌ Manual copy/paste to new machines

**Migration Steps (1 hour total):**

**Step 1: Backup Current Keys (5 min)**
```bash
# Save current .env
cp .env .env.backup

# Export Railway keys
railway variables > railway-backup.txt
```

**Step 2: Populate 1Password (15 min)**
```bash
# For each key in .env, add to 1Password

# Manual method (via 1Password app):
# 1. Open 1Password
# 2. Create vault "MCP Bridge API Keys"
# 3. Add each key as a new item

# Automated method (via CLI):
source .env

op item create \
  --category=password \
  --title="Anthropic API Key DEV" \
  --vault="MCP Bridge API Keys" \
  credential="$ANTHROPIC_API_KEY"

op item create \
  --category=password \
  --title="OpenAI API Key DEV" \
  --vault="MCP Bridge API Keys" \
  credential="$OPENAI_API_KEY"

# Repeat for all keys...
```

**Step 3: Integrate Code Changes (30 min)**
```bash
# 1. Update secrets-manager.ts with new methods
# (Copy from implementation guide above)

# 2. Create sync scripts
mkdir -p scripts
# (Copy sync-keys.ts and sync-railway.ts from above)

# 3. Update package.json scripts
# (Add sync:local, sync:railway, etc.)

# 4. Update server.ts initialization
# (Add async initialization with key sync)
```

**Step 4: Test Locally (10 min)**
```bash
# 1. Remove .env (or rename for safety)
mv .env .env.old

# 2. Sync from 1Password
npm run sync:local

# 3. Start server
npm run dev

# 4. Verify all providers work
curl http://localhost:3000/health

# 5. If success, delete .env.old
rm .env.old
```

**Step 5: Setup Additional Machines (Laptop) (10 min)**
```bash
# On laptop:
git pull
npm install
op signin
npm run sync:local
npm run dev

# Done! Same keys, zero manual copying
```

**Step 6: Verify Railway (5 min)**
```bash
# Check Railway has keys
railway variables

# If needed, sync from 1Password
npm run sync:railway

# Deploy
git push origin main  # Railway auto-deploys
```

---

### Rollback Plan (If Issues)

```bash
# 1. Restore .env backup
cp .env.backup .env

# 2. Restart server
npm run dev

# 3. Railway keeps working (environment variables unchanged)

# 4. Debug 1Password integration at leisure
```

---

## Security Considerations

### Encryption at Rest

**1Password:**
- ✅ AES-256 encryption
- ✅ Secret Key + Master Password
- ✅ Zero-knowledge architecture
- ✅ Regular security audits

**Local Cache:**
- ✅ AES-256-GCM encryption
- ✅ Key derived from system entropy
- ✅ Stored in `.secrets/` (gitignored)
- ✅ Permissions: 0600 (owner read/write only)

**Railway:**
- ✅ Encrypted environment variables
- ✅ Not exposed in logs or API responses
- ✅ Isolated per deployment

---

### Access Control

**1Password:**
- ✅ Multi-factor authentication
- ✅ Vault sharing with granular permissions
- ✅ Activity logs (who accessed what, when)
- ✅ Device trust system

**Railway:**
- ✅ Team access control (future)
- ✅ Environment separation
- ✅ Deploy hooks for key rotation

---

### Key Rotation Best Practices

**Rotation Schedule:**
- Production keys: Every 90 days
- Development keys: Every 180 days
- Compromised keys: Immediately

**Rotation Process:**
```bash
# 1. Generate new key at provider
# (Anthropic dashboard, OpenAI dashboard, etc.)

# 2. Update in 1Password
op item edit "Anthropic API Key PROD" credential="new-key"

# 3. Sync to all environments
npm run sync:all

# 4. Verify new key works
npm run keys:status

# 5. Revoke old key at provider
# (After confirming new key works in production)

# Total time: <5 minutes
```

---

### Audit & Compliance

**1Password Audit Logs:**
- Who accessed which keys
- When keys were viewed
- Which devices were used

**Application Logging:**
```typescript
// Log key access (not values!)
logger.info({
  action: 'api_key_accessed',
  key_name: 'ANTHROPIC_API_KEY',
  source: '1password',
  user: process.env.USER,
  machine: os.hostname(),
  timestamp: new Date(),
});
```

**Never Log:**
- ❌ Actual key values
- ❌ Decrypted secrets
- ❌ Full error messages containing keys

---

### Secrets Scanning

**Pre-commit Hook** (`.husky/pre-commit`):
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Scan for secrets
npm run secrets:scan

# Block commit if secrets found
```

**Scan Script** (`scripts/scan-secrets.ts`):
```typescript
import { readFileSync } from 'fs';
import { globSync } from 'glob';

const patterns = [
  /sk-ant-[a-zA-Z0-9-]{48,}/,  // Anthropic
  /sk-proj-[a-zA-Z0-9-]{48,}/, // OpenAI
  /AIza[a-zA-Z0-9_-]{35}/,     // Google
  /ghp_[a-zA-Z0-9]{36}/,       // GitHub
];

const files = globSync('**/*', {
  ignore: ['node_modules/**', '.git/**', '.secrets/**'],
});

let foundSecrets = false;

for (const file of files) {
  const content = readFileSync(file, 'utf8');

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      console.error(`❌ SECRET DETECTED in ${file}`);
      foundSecrets = true;
    }
  }
}

if (foundSecrets) {
  console.error('\n🚨 Secrets detected! Commit blocked.');
  process.exit(1);
}

console.log('✅ No secrets detected');
```

---

## Cost Analysis

### Recommended Solution (1Password CLI)

**Setup Costs:**
- Time: 2-3 hours (one-time)
- Money: $0 (assuming existing 1Password)

**Ongoing Costs:**
- Monthly: $0 (covered by existing subscription)
- Maintenance: <1 hour/month
- Key rotation: 5 minutes per key

**Total First Year:**
- Money: $0
- Time: 15 hours (setup + maintenance)
- ROI: Immediate (eliminates manual key copying)

---

### Alternative Solutions Cost Comparison

**Doppler:**
- Setup: $0, 1 hour
- Monthly: $20
- First Year: $240

**AWS Secrets Manager:**
- Setup: $0, 2 hours
- Monthly: $3-5 (5-10 secrets)
- First Year: $36-60

**HashiCorp Vault:**
- Setup: $0, 8 hours
- Monthly: $5-10 (hosting)
- First Year: $60-120 + maintenance

**Current Approach (.env):**
- Setup: $0
- Monthly: $0
- Hidden costs: Manual work, sync errors, security risks
- First Year: Unmeasured (but frustrating)

---

## Conclusion & Recommendation

### Recommended: **1Password CLI + Railway + Local Cache**

**Why:**
1. ✅ **Zero additional cost** (uses existing 1Password)
2. ✅ **Works offline** (cached local encryption)
3. ✅ **Seamless sync** across all machines
4. ✅ **Production-ready security** (battle-tested)
5. ✅ **Simple key rotation** (5-minute process)
6. ✅ **Team-ready** (scales when needed)
7. ✅ **Native Railway integration** (CLI sync script)

**When to Migrate:**
- Immediately for development workflow
- After testing for Railway sync

**Migration Time:** 1-2 hours
**Learning Curve:** Minimal (if already using 1Password)
**Risk:** Low (easy rollback to .env)

---

### Implementation Priority

**Week 1: Core Setup**
- Day 1: Set up 1Password vault and CLI
- Day 2: Integrate enhanced SecretsManager
- Day 3: Create sync scripts
- Day 4: Test locally on PC
- Day 5: Set up laptop

**Week 2: Production & Polish**
- Day 1: Test Railway sync
- Day 2: Create helper scripts (status, rotate)
- Day 3: Add monitoring and logging
- Day 4: Document for team (future)
- Day 5: Buffer for issues

---

### Success Metrics

**After Implementation:**
- ✅ Setup time on new machine: <15 minutes (vs 30+ minutes manual)
- ✅ Key rotation time: <5 minutes (vs 20+ minutes manual)
- ✅ Offline capability: Full (vs none)
- ✅ Sync reliability: 100% (vs manual errors)
- ✅ Security posture: Excellent (vs good)
- ✅ Team scalability: Ready (vs difficult)

---

**Document Status:** ✅ Complete
**Confidence Level:** High (battle-tested approach for solo → team growth)
**Recommendation:** Start implementation immediately with Phase 1
