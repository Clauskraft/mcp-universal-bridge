# Railway Manual Setup - Step by Step

## Problem: Kan ikke vælge repository

### Solution 1: Fix GitHub Permissions

1. **Gå til GitHub Settings:**
   - URL: https://github.com/settings/installations

2. **Find Railway:**
   - Scroll til "Installed GitHub Apps"
   - Find "Railway" i listen

3. **Configure Railway:**
   - Klik "Configure" knappen

4. **Grant Repository Access:**
   - Find "Repository access" section
   - Vælg **"All repositories"**
   - Eller under "Select repositories" → Add → `mcp-universal-bridge`

5. **Save Changes:**
   - Scroll ned
   - Klik "Save"

6. **Return to Railway:**
   - Gå tilbage til railway.app
   - Refresh siden (F5)
   - Prøv at deploye igen

### Solution 2: Alternative Deployment Method

**Use Railway CLI:**

```bash
# 1. Open PowerShell
cd C:\Users\claus\mcp-bridge

# 2. Login to Railway (opens browser)
railway login

# 3. Initialize project
railway init

# 4. Link to GitHub repo
railway link

# 5. Deploy
railway up
```

### Solution 3: Deploy via Railway Template

**Direct Link:**
```
https://railway.app/template/github.com/Clauskraft/mcp-universal-bridge
```

This bypasses the repository selection screen.

### Solution 4: Make Repository Public (if private)

If repository is private:
1. Go to: https://github.com/Clauskraft/mcp-universal-bridge/settings
2. Scroll to bottom: "Danger Zone"
3. Click "Change repository visibility"
4. Make it Public
5. Try Railway deploy again

## Verification Steps

After fixing permissions:
1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. You should now see `mcp-universal-bridge` in the list
4. Click on it
5. Click "Deploy Now"

## Contact Me

Send screenshot if still having issues:
- What screen are you on?
- What error message do you see?
- Can you see any repositories in the list?
