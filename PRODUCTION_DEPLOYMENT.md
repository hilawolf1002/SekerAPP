# SekerApp Production Deployment Guide

## Overview
This guide explains how to deploy SekerApp to the domain `sekerapp.online` on port 7766.

## Prerequisites
- Ubuntu 20.04+ server
- Root or sudo access
- Domain `sekerapp.online` pointing to your server
- Node.js 16+ installed

## Quick Deployment

### 1. Run the deployment script
```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

### 2. Update your email in the script
Edit `deploy.sh` and change `your-email@example.com` to your actual email.

## Manual Deployment Steps

### 1. Install dependencies
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx ufw
```

### 2. Setup application directory
```bash
sudo mkdir -p /var/www/sekerapp.online
sudo chown -R www-data:www-data /var/www/sekerapp.online
```

### 3. Copy application files
```bash
sudo cp -r . /var/www/sekerapp.online/
cd /var/www/sekerapp.online
sudo npm install --production
```

### 4. Setup Nginx
```bash
sudo cp nginx-sekerapp.online.conf /etc/nginx/sites-available/sekerapp.online
sudo ln -sf /etc/nginx/sites-available/sekerapp.online /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Get SSL certificate
```bash
sudo certbot --nginx -d sekerapp.online -d www.sekerapp.online --non-interactive --agree-tos --email your-email@example.com
```

### 6. Setup PM2
```bash
sudo npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Configuration Files

### Nginx Configuration
- `nginx-sekerapp.online.conf` - Nginx virtual host configuration
- Proxies requests to localhost:7766
- Handles SSL termination
- Includes security headers

### PM2 Configuration
- `ecosystem.config.js` - PM2 process manager configuration
- Runs on port 7766
- Production environment settings

### Systemd Service
- `SekerApp.service` - Alternative to PM2
- Runs as system service
- Automatic restart on failure

## Port Configuration
- **Application Port**: 7766 (internal)
- **Public Ports**: 80 (HTTP), 443 (HTTPS)
- **Firewall**: Only 22, 80, 443 are open

## Health Monitoring

### Health Check Endpoint
```
GET /health
```
Returns "healthy" if the application is running.

### Health Check Script
```bash
npm run health
```

### PM2 Monitoring
```bash
pm2 monit
pm2 logs SekerApp
```

## SSL Certificate
- Automatically obtained via Let's Encrypt
- Auto-renewal configured
- Redirects HTTP to HTTPS

## Security Features
- Firewall (UFW) enabled
- Security headers in Nginx
- Rate limiting
- CORS protection
- Input validation

## Troubleshooting

### Check application status
```bash
pm2 status
pm2 logs SekerApp
```

### Check Nginx status
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Check firewall
```bash
sudo ufw status
```

### Check SSL certificate
```bash
sudo certbot certificates
```

## Maintenance

### Update application
```bash
cd /var/www/sekerapp.online
git pull
npm install --production
pm2 restart SekerApp
```

### Update SSL certificate
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### View logs
```bash
pm2 logs SekerApp
sudo journalctl -u SekerApp
```

## Environment Variables
Create `.env` file with:
```
NODE_ENV=production
PORT=7766
HOST=0.0.0.0
CORS_ORIGIN=https://sekerapp.online
JWT_SECRET=your-secret-key
```

## Support
For issues, check:
1. PM2 logs: `pm2 logs SekerApp`
2. Nginx logs: `/var/log/nginx/error.log`
3. System logs: `sudo journalctl -u SekerApp`
