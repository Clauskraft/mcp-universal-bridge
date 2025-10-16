#!/bin/bash
# DigitalOcean Automated Setup Script for MCP Bridge
# Run this on a fresh Ubuntu 22.04 droplet

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 MCP Bridge - DigitalOcean Automated Setup${NC}"
echo "=============================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (use sudo)${NC}"
  exit 1
fi

# Get configuration from user
echo -e "${YELLOW}Configuration:${NC}"
read -p "Enter your GitHub username: " GITHUB_USER
read -p "Enter repository name (default: mcp-bridge): " REPO_NAME
REPO_NAME=${REPO_NAME:-mcp-bridge}
read -p "Enter your domain (or press Enter to skip): " DOMAIN_NAME
read -p "Enter your email for SSL certificate: " EMAIL

echo ""
echo -e "${GREEN}Starting installation...${NC}"

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install Node.js 20.x
echo -e "${YELLOW}📦 Installing Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo -e "${GREEN}✅ Node version: $(node --version)${NC}"
echo -e "${GREEN}✅ NPM version: $(npm --version)${NC}"

# Install PM2
echo -e "${YELLOW}📦 Installing PM2 process manager...${NC}"
npm install -g pm2

# Install Nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
apt-get install -y nginx

# Install Certbot for SSL
if [ ! -z "$DOMAIN_NAME" ]; then
  echo -e "${YELLOW}📦 Installing Certbot for Let's Encrypt SSL...${NC}"
  apt-get install -y certbot python3-certbot-nginx
fi

# Install Git
apt-get install -y git

# Create application directory
echo -e "${YELLOW}📁 Setting up application directory...${NC}"
mkdir -p /var/www/mcp-bridge
cd /var/www/mcp-bridge

# Clone repository
echo -e "${YELLOW}📥 Cloning repository...${NC}"
git clone https://github.com/${GITHUB_USER}/${REPO_NAME}.git .

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Create .env file
echo -e "${YELLOW}⚙️ Creating environment configuration...${NC}"
cat > .env << EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
ALLOWED_ORIGINS=${DOMAIN_NAME:+https://${DOMAIN_NAME},https://www.${DOMAIN_NAME}}
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
EOF

# Create directories
mkdir -p logs capture-sessions transcripts

# Create PM2 ecosystem file
echo -e "${YELLOW}⚙️ Creating PM2 configuration...${NC}"
cat > ecosystem.config.cjs << 'EOF'
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
EOF

# Start application with PM2
echo -e "${YELLOW}🚀 Starting application...${NC}"
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | tail -n 1 | bash

echo -e "${GREEN}✅ Application started on port 3000${NC}"

# Configure Nginx
echo -e "${YELLOW}🔧 Configuring Nginx...${NC}"

if [ ! -z "$DOMAIN_NAME" ]; then
  # Configuration with domain
  cat > /etc/nginx/sites-available/mcp-bridge << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /realtime-capture {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }

    client_max_body_size 10M;
}
EOF
else
  # Configuration with IP only
  cat > /etc/nginx/sites-available/mcp-bridge << 'EOF'
server {
    listen 80 default_server;

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

    location /realtime-capture {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    client_max_body_size 10M;
}
EOF
fi

# Enable site
ln -sf /etc/nginx/sites-available/mcp-bridge /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx

echo -e "${GREEN}✅ Nginx configured and restarted${NC}"

# Configure firewall
echo -e "${YELLOW}🔒 Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

echo -e "${GREEN}✅ Firewall configured${NC}"

# Setup SSL if domain provided
if [ ! -z "$DOMAIN_NAME" ]; then
  echo -e "${YELLOW}🔐 Setting up SSL certificate...${NC}"
  certbot --nginx -d ${DOMAIN_NAME} -d www.${DOMAIN_NAME} \
    --email ${EMAIL} \
    --agree-tos \
    --non-interactive \
    --redirect

  echo -e "${GREEN}✅ SSL certificate installed${NC}"
fi

# Create backup script
echo -e "${YELLOW}💾 Creating backup script...${NC}"
cat > /root/backup-mcp-bridge.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

tar -czf $BACKUP_DIR/mcp-bridge-$DATE.tar.gz \
  /var/www/mcp-bridge/capture-sessions \
  /var/www/mcp-bridge/transcripts \
  /var/www/mcp-bridge/.env

find $BACKUP_DIR -name "mcp-bridge-*.tar.gz" -mtime +7 -delete

echo "Backup completed: mcp-bridge-$DATE.tar.gz"
EOF

chmod +x /root/backup-mcp-bridge.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-mcp-bridge.sh") | crontab -

echo -e "${GREEN}✅ Backup script created (runs daily at 2 AM)${NC}"

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

echo ""
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}Application Status:${NC}"
pm2 status
echo ""
echo -e "${YELLOW}Access Your Application:${NC}"
if [ ! -z "$DOMAIN_NAME" ]; then
  echo -e "  🌐 URL: https://${DOMAIN_NAME}"
  echo -e "  🌐 Alternative: https://www.${DOMAIN_NAME}"
else
  echo -e "  🌐 URL: http://${SERVER_IP}"
fi
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  📊 View logs: ${GREEN}pm2 logs mcp-bridge${NC}"
echo -e "  📈 Monitor: ${GREEN}pm2 monit${NC}"
echo -e "  🔄 Restart: ${GREEN}pm2 restart mcp-bridge${NC}"
echo -e "  🛑 Stop: ${GREEN}pm2 stop mcp-bridge${NC}"
echo -e "  🚀 Start: ${GREEN}pm2 start mcp-bridge${NC}"
echo ""
echo -e "${YELLOW}Test API:${NC}"
if [ ! -z "$DOMAIN_NAME" ]; then
  echo -e "  curl https://${DOMAIN_NAME}/health"
else
  echo -e "  curl http://${SERVER_IP}/health"
fi
echo ""
echo -e "${YELLOW}Deployment:${NC}"
echo -e "  📁 App directory: ${GREEN}/var/www/mcp-bridge${NC}"
echo -e "  📝 Logs: ${GREEN}/var/www/mcp-bridge/logs/${NC}"
echo -e "  🔐 Environment: ${GREEN}/var/www/mcp-bridge/.env${NC}"
echo -e "  📦 Update: ${GREEN}cd /var/www/mcp-bridge && git pull && pm2 restart mcp-bridge${NC}"
echo ""
echo -e "${GREEN}🎉 MCP Bridge is now running in production!${NC}"
