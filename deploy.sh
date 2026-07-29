#!/bin/bash

# SurveyPro Deployment Script for sekerapp.online
# Run this script as root or with sudo

set -e

echo "🚀 Starting SurveyPro deployment for sekerapp.online..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
apt install -y nginx certbot python3-certbot-nginx ufw

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /var/www/sekerapp.online
chown -R www-data:www-data /var/www/sekerapp.online

# Copy application files
echo "📋 Copying application files..."
cp -r . /var/www/sekerapp.online/
cd /var/www/sekerapp.online

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# Create logs directory
echo "📝 Creating logs directory..."
mkdir -p logs
chown -R www-data:www-data logs

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads
chown -R www-data:www-data uploads

# Copy Nginx configuration
echo "🌐 Setting up Nginx..."
cp nginx-simple.conf /etc/nginx/sites-available/sekerapp.online
ln -sf /etc/nginx/sites-available/sekerapp.online /etc/nginx/sites-enabled/

# Test Nginx configuration
echo "✅ Testing Nginx configuration..."
nginx -t

# Reload Nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

# Setup firewall
echo "🔥 Setting up firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Get SSL certificate
echo "🔒 Getting SSL certificate..."
certbot --nginx -d sekerapp.online -d www.sekerapp.online --non-interactive --agree-tos --email your-email@example.com

# Setup PM2
echo "⚡ Setting up PM2..."
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Setup systemd service (alternative to PM2)
echo "🔧 Setting up systemd service..."
cp surveypro.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable surveypro.service

# Final Nginx reload
echo "🔄 Final Nginx reload..."
systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo "🌐 Your application is now available at: https://sekerapp.online"
echo "📊 PM2 status: pm2 status"
echo "📝 Logs: pm2 logs surveypro"
echo "🔄 Restart: pm2 restart surveypro"
