# WhatsApp API - Deployment Guide

## Table of Contents
1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [PM2 Production](#pm2-production)
4. [Cloud Deployment](#cloud-deployment)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [SSL/HTTPS Setup](#sslhttps-setup)
8. [Monitoring](#monitoring)

---

## Local Development

### Prerequisites
- Node.js 20+
- MySQL 8.0+
- Redis (optional)
- Git

### Quick Start
```bash
# Clone repository
git clone https://github.com/yourusername/whatsapp-api.git
cd whatsapp-api

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Running Tests
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run API tests only
npm run test:api

# Watch mode
npm run test:watch
```

---

## Docker Deployment

### Development with Docker
```bash
# Start all services (app, MySQL, Redis, phpMyAdmin)
npm run docker:dev
# or
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Stop services
docker-compose -f docker-compose.dev.yml down
```

Access:
- API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api/docs
- phpMyAdmin: http://localhost:8080

### Production with Docker
```bash
# Create .env file with production settings
cp .env.example .env
# Edit .env with production values

# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### With Nginx (HTTPS)
```bash
# Create SSL directory
mkdir -p ssl

# Copy your SSL certificates
cp /path/to/fullchain.pem ssl/
cp /path/to/privkey.pem ssl/

# Start with nginx profile
docker-compose --profile with-nginx up -d
```

---

## PM2 Production

### Installation
```bash
# Install PM2 globally
npm install -g pm2

# Start application
npm run pm2:start
# or
pm2 start ecosystem.config.js --env production

# View status
pm2 status

# View logs
pm2 logs whatsapp-api

# Restart
pm2 restart whatsapp-api

# Stop
pm2 stop whatsapp-api

# Remove from PM2
pm2 delete whatsapp-api
```

### PM2 Cluster Mode
The ecosystem.config.js is configured to run in cluster mode with max CPU cores.

### Auto-start on Boot
```bash
pm2 startup
pm2 save
```

---

## Cloud Deployment

### AWS EC2 / DigitalOcean Droplet

1. **Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Redis (optional)
sudo apt install -y redis-server

# Install PM2
sudo npm install -g pm2
```

2. **Deploy Application**
```bash
# Clone repository
git clone https://github.com/yourusername/whatsapp-api.git
cd whatsapp-api

# Install dependencies
npm ci --production

# Setup environment
cp .env.example .env
nano .env  # Configure settings

# Run migrations
npm run migrate

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Railway / Render / Heroku

1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Set build command: `npm ci`
4. Set start command: `npm start`
5. Configure MySQL add-on or external database

---

## Environment Variables

### Required Variables
```env
# Server
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=whatsapp_api
DB_USER=root
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
JWT_EXPIRES_IN=24h

# Redis (optional)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Generate Secure Secrets
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Database Setup

### Create Database
```sql
CREATE DATABASE whatsapp_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'whatsapp_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON whatsapp_api.* TO 'whatsapp_user'@'localhost';
FLUSH PRIVILEGES;
```

### Run Migrations
```bash
# Run all migrations
npm run migrate

# Undo last migration
npm run migrate:undo

# Fresh migration (drop all and re-run)
npm run migrate:fresh
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt
```bash
# Install Certbot
sudo apt install -y certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Certificates will be at:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### Auto-renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
```

### Health Check Endpoint
```bash
curl http://localhost:3000/health
```

### Docker Health Check
```bash
docker inspect --format='{{json .State.Health}}' whatsapp-api
```

### Log Files
- PM2 logs: `./logs/`
- Docker logs: `docker-compose logs -f`

### Recommended Monitoring Tools
- **Sentry** - Error tracking
- **New Relic** / **Datadog** - APM
- **Grafana + Prometheus** - Metrics
- **UptimeRobot** - Uptime monitoring

---

## Troubleshooting

### Common Issues

1. **Port already in use**
```bash
lsof -i :3000
kill -9 <PID>
```

2. **Database connection refused**
- Check MySQL is running: `systemctl status mysql`
- Verify credentials in .env
- Check firewall rules

3. **Redis connection error**
- Set `REDIS_ENABLED=false` if not using Redis
- Or install Redis: `apt install redis-server`

4. **Session files permission**
```bash
chmod -R 755 sessions/
chown -R $USER:$USER sessions/
```

5. **Memory issues**
- PM2: Set `max_memory_restart` in ecosystem.config.js
- Docker: Set memory limits in docker-compose.yml

---

## Security Checklist

- [ ] Change default JWT secrets
- [ ] Use HTTPS in production
- [ ] Set strong database passwords
- [ ] Enable firewall (only ports 80, 443, 22)
- [ ] Keep dependencies updated
- [ ] Enable rate limiting
- [ ] Set up log rotation
- [ ] Regular database backups
- [ ] Use non-root user for application
