# 🌊 DigitalOcean VPS Deployment Guide - MCP Bridge

## ✅ Fordele ved DigitalOcean

- ✅ **Full kontrol** over serveren
- ✅ **Billigere** end Railway for higher traffic
- ✅ **Root access** til alt
- ✅ **Skalerbar** - upgrade når nødvendigt
- ✅ **Forudsigelig pris** - fast månedligt beløb
- 💰 **Pris:** 90-180 DKK/måned ($12-24/month)

## 📋 Prerequisites

- DigitalOcean account (https://digitalocean.com)
- Domain navn (optional men anbefalet)
- SSH client (terminal/PowerShell)

## 🚀 Step-by-Step Deployment

### Step 1: Opret Droplet

1. Log ind på DigitalOcean
2. Klik **"Create"** → **"Droplets"**
3. Vælg konfiguration:

**Anbefalet setup:**
- **Image:** Ubuntu 22.04 LTS x64
- **Plan:** Basic ($12/month)
  - 1 vCPU
  - 2 GB RAM
  - 50 GB SSD
  - 2 TB transfer
- **Region:** Frankfurt eller Amsterdam (tættest på Danmark)
- **Authentication:** SSH Key (anbefalet) eller Password
- **Hostname:** mcp-bridge-prod

4. Klik **"Create Droplet"**

### Step 2: SSH til Serveren

```bash
# Get droplet IP from DigitalOcean dashboard
ssh root@YOUR_DROPLET_IP

# First login, update system
apt-get update && apt-get upgrade -y
```

### Step 3: Install Node.js 20

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Step 4: Install PM2 & Nginx

```bash
# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (reverse proxy)
apt-get install -y nginx

# Install Certbot (for SSL)
apt-get install -y certbot python3-certbot-nginx
```

### Step 5: Setup Application

```bash
# Create app directory
mkdir -p /var/www/mcp-bridge
cd /var/www/mcp-bridge

# Clone repository (replace with your GitHub URL)
git clone https://github.com/YOUR_USERNAME/mcp-bridge.git .

# Install dependencies
npm install

# Create environment file
nano .env
```

**Paste følgende i .env:**
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
ALLOWED_ORIGINS=https://yourdomain.com
SESSION_SECRET=<generate-random-string>
```

**Generate secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 6: Create PM2 Ecosystem File

```bash
nano ecosystem.config.cjs
```

**Paste:**
```javascript
module.exports = {
  apps: [{
    name: 'mcp-bridge',
    script: 'src/server.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.cjs

# Save PM2 config
pm2 save

# Setup PM2 auto-start on boot
pm2 startup
# Run the command that PM2 outputs

# Verify it's running
pm2 status
pm2 logs mcp-bridge
```

### Step 7: Configure Nginx

```bash
nano /etc/nginx/sites-available/mcp-bridge
```

**Paste (opdater YOURDOMAIN.COM):**
```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support for /realtime-capture
    location /realtime-capture {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Increase max upload size
    client_max_body_size 10M;
}
```

**Enable site:**
```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/mcp-bridge /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# If OK, restart Nginx
systemctl restart nginx
```

### Step 8: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### Step 9: Setup SSL with Let's Encrypt

```bash
# Get SSL certificate (opdater email og domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com --email your@email.com --agree-tos

# Test auto-renewal
certbot renew --dry-run

# Certificates auto-renew every 90 days
```

### Step 10: Configure DNS

På din domain provider (GoDaddy, Namecheap, Cloudflare, etc.):

**Add A Records:**
```
Type: A
Name: @
Value: YOUR_DROPLET_IP
TTL: 3600

Type: A
Name: www
Value: YOUR_DROPLET_IP
TTL: 3600
```

Vent 5-30 minutter for DNS propagation.

## ✅ Verify Deployment

```bash
# Test from local machine
curl https://yourdomain.com/health

# Test External Data API
curl -X POST https://yourdomain.com/external/data/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Production Test",
    "platform": "digitalocean-test"
  }'
```

## 🔄 Deployment Workflow

### Deploy Updates

```bash
# SSH to server
ssh root@YOUR_DROPLET_IP

# Navigate to app directory
cd /var/www/mcp-bridge

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install

# Restart application
pm2 restart mcp-bridge

# Check logs
pm2 logs mcp-bridge --lines 50
```

### Rollback if Needed

```bash
# Check git history
git log --oneline -10

# Rollback to previous commit
git reset --hard COMMIT_HASH

# Restart
pm2 restart mcp-bridge
```

## 📊 Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs mcp-bridge

# View metrics
pm2 describe mcp-bridge
```

### Setup Email Alerts (Optional)

```bash
# Install mailutils
apt-get install -y mailutils

# Create monitoring script
nano /root/check-mcp-bridge.sh
```

**Paste:**
```bash
#!/bin/bash
if ! pm2 describe mcp-bridge &>/dev/null; then
    echo "MCP Bridge is down!" | mail -s "MCP Bridge Alert" your@email.com
    pm2 restart mcp-bridge
fi
```

```bash
chmod +x /root/check-mcp-bridge.sh

# Add to crontab (check every 5 minutes)
crontab -e
# Add line:
# */5 * * * * /root/check-mcp-bridge.sh
```

### View Nginx Logs

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

## 📈 Performance Tuning

### Increase PM2 Instances (if needed)

```bash
# Edit ecosystem.config.cjs
nano ecosystem.config.cjs

# Change:
instances: 2,  # Use 2 CPU cores
exec_mode: 'cluster',  # Cluster mode for load balancing

# Restart
pm2 delete mcp-bridge
pm2 start ecosystem.config.cjs
pm2 save
```

### Nginx Performance

```bash
# Edit nginx config
nano /etc/nginx/nginx.conf

# Add to http block:
# worker_processes auto;
# worker_connections 1024;
# keepalive_timeout 65;

# Restart Nginx
systemctl restart nginx
```

## 🔐 Security Best Practices

### 1. Change SSH Port (Optional)

```bash
nano /etc/ssh/sshd_config
# Change: Port 22 → Port 2222
systemctl restart sshd
ufw allow 2222/tcp
```

### 2. Disable Root Login

```bash
# Create non-root user
adduser deploy
usermod -aG sudo deploy

# Disable root SSH
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
systemctl restart sshd
```

### 3. Setup Automated Backups

```bash
# Create backup script
nano /root/backup-mcp-bridge.sh
```

**Paste:**
```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application data
tar -czf $BACKUP_DIR/mcp-bridge-$DATE.tar.gz \
  /var/www/mcp-bridge/capture-sessions \
  /var/www/mcp-bridge/transcripts \
  /var/www/mcp-bridge/.env

# Keep only last 7 days of backups
find $BACKUP_DIR -name "mcp-bridge-*.tar.gz" -mtime +7 -delete

echo "Backup completed: mcp-bridge-$DATE.tar.gz"
```

```bash
chmod +x /root/backup-mcp-bridge.sh

# Run daily at 2 AM
crontab -e
# Add: 0 2 * * * /root/backup-mcp-bridge.sh
```

## 💰 Cost Management

**Monthly costs:**
- **Droplet:** $12-24/month (~90-180 DKK)
- **Domain:** $12/year (~90 DKK/år)
- **SSL:** FREE (Let's Encrypt)

**Total:** ~100-200 DKK/måned

### Scaling Options

**Når du trænger til mere:**

**Vertical Scaling (enkelt):**
```bash
# I DigitalOcean dashboard:
# Droplet → Resize → Vælg større plan
# Droplet genstartes automatisk
```

**Horizontal Scaling (avanceret):**
- Load Balancer: $12/month extra
- Multiple droplets behind load balancer
- Shared storage (Spaces/NFS)

## 🆘 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs mcp-bridge --err

# Check if port 3000 is in use
lsof -i :3000

# Manually test
cd /var/www/mcp-bridge
npm run start
```

### Nginx Errors

```bash
# Test configuration
nginx -t

# Check error logs
tail -100 /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Renew manually
certbot renew --force-renewal

# Check certificate status
certbot certificates
```

### High CPU/Memory Usage

```bash
# Check resource usage
htop

# Check PM2 metrics
pm2 monit

# If needed, restart application
pm2 restart mcp-bridge
```

## ✅ Deployment Checklist

- [ ] Opret DigitalOcean Droplet
- [ ] SSH til serveren og opdater system
- [ ] Install Node.js 20 + PM2 + Nginx
- [ ] Clone repository og install dependencies
- [ ] Configure `.env` with production secrets
- [ ] Start application med PM2
- [ ] Configure Nginx reverse proxy
- [ ] Setup firewall (ufw)
- [ ] Configure DNS A records
- [ ] Install SSL certificate (Certbot)
- [ ] Test HTTPS endpoint
- [ ] Setup automated backups
- [ ] Configure monitoring/alerts
- [ ] Document production URLs

## 🎉 Done!

MCP Bridge kører nu på DigitalOcean! 🌊

**Din API er tilgængelig på:** `https://yourdomain.com`

**Management:**
- SSH: `ssh root@YOUR_DROPLET_IP`
- Logs: `pm2 logs mcp-bridge`
- Restart: `pm2 restart mcp-bridge`
- Deploy updates: `git pull && pm2 restart mcp-bridge`

Se `EXTERNAL_DATA_INTEGRATION.md` for API integration dokumentation.
