# Deployment Guide

Deployment instructions for AI Microlearning LMS.

## Prerequisites

- Proxmox VM (Ubuntu Server 22.04 LTS)
- Node.js 20+ LTS
- PostgreSQL 15+ with pgvector
- Redis
- Nginx
- PM2
- Domain name (for SSL)

## Server Setup

### 1. System Updates

```bash
sudo apt-get update && sudo apt-get upgrade -y
```

### 2. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install PostgreSQL

```bash
sudo apt-get install postgresql-15 postgresql-contrib
sudo apt-get install postgresql-15-pgvector
```

### 4. Install Redis

```bash
sudo apt-get install redis-server
```

### 5. Install Nginx

```bash
sudo apt-get install nginx
```

### 6. Install PM2

```bash
sudo npm install -g pm2
```

## Application Deployment

### 1. Clone Repository

```bash
git clone https://github.com/fourtytwo42/Nuggets-LMS.git
cd nuggets-lms
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create `.env` file with production values:

```bash
cp .env.example .env
nano .env
```

Configure:

- Database connection
- Redis connection
- API keys
- JWT secret
- Storage paths
- Application URL

### 4. Database Setup

```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE ai_microlearning_lms;
CREATE USER lms_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ai_microlearning_lms TO lms_user;
\q

# Enable pgvector
sudo -u postgres psql -d ai_microlearning_lms
CREATE EXTENSION IF NOT EXISTS vector;
\q

# Run migrations
npm run db:generate
npm run db:migrate
```

### 5. Build Application

```bash
npm run build
```

### 6. Start with PM2

```bash
# Start application
pm2 start npm --name "lms" -- start

# Start worker
pm2 start npm --name "lms-worker" -- run worker

# Save PM2 process list
pm2 save

# Setup PM2 startup
pm2 startup
```

## Nginx Configuration

### 1. Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/lms
```

### 2. Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 3. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Setup

### 1. Install Certbot

```bash
sudo apt-get install certbot python3-certbot-nginx
```

### 2. Obtain Certificate

```bash
sudo certbot --nginx -d yourdomain.com
```

### 3. Auto-renewal

Certbot sets up auto-renewal automatically.

## Monitoring

### PM2 Monitoring

```bash
# View processes
pm2 status

# View logs
pm2 logs lms

# Monitor
pm2 monit
```

### System Monitoring

```bash
# Check services
sudo systemctl status postgresql
sudo systemctl status redis-server
sudo systemctl status nginx
```

## Backup

### Database Backup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U lms_user ai_microlearning_lms > /backups/db_$DATE.sql
```

### Storage Backup

```bash
# Backup storage directory
tar -czf /backups/storage_$DATE.tar.gz /path/to/storage
```

## Updates

### Application Updates

```bash
cd /path/to/nuggets-lms
git pull
npm install
npm run build
npm run db:migrate
pm2 restart lms
pm2 restart lms-worker
```

## Troubleshooting

### Application Not Starting

- Check PM2 logs: `pm2 logs lms`
- Verify environment variables
- Check database connection
- Verify Redis connection

### Nginx Issues

- Check Nginx config: `sudo nginx -t`
- View Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Verify port 3000 is accessible

### Database Issues

- Check PostgreSQL status: `sudo systemctl status postgresql`
- Verify connection string
- Check database permissions
