#!/bin/bash

# Initial Let's Encrypt setup script
# Run this once on the production server to obtain SSL certificates

set -e

DOMAIN="yourdomain.com"
EMAIL="your-email@example.com"
STAGING=0 # Set to 1 for testing

CERTBOT_DIR="./certbot"
NGINX_CONF_DIR="./nginx/conf.d"

echo "### Preparing directories..."
mkdir -p "$CERTBOT_DIR/conf"
mkdir -p "$CERTBOT_DIR/www"

echo "### Creating initial nginx config for certificate acquisition..."
cat > "$NGINX_CONF_DIR/app.conf" << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# Replace domain placeholder
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$NGINX_CONF_DIR/app.conf"

echo "### Starting nginx..."
docker-compose -f docker-compose.prod.yml up -d nginx

echo "### Waiting for nginx to start..."
sleep 5

echo "### Requesting Let's Encrypt certificate..."
CERTBOT_CMD="certonly --webroot -w /var/www/certbot \
  --email $EMAIL \
  -d $DOMAIN \
  --agree-tos \
  --no-eff-email \
  --force-renewal"

if [ $STAGING != "0" ]; then
  CERTBOT_CMD="$CERTBOT_CMD --staging"
fi

docker-compose -f docker-compose.prod.yml run --rm certbot $CERTBOT_CMD

echo "### Updating nginx config with SSL..."
cat > "$NGINX_CONF_DIR/app.conf" << 'EOF'
# HTTP - redirect all traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS - proxy to app
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;

    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    location / {
        proxy_pass http://pengui:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /_next/static {
        proxy_pass http://pengui:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    location /health {
        proxy_pass http://pengui:3000;
        access_log off;
    }
}
EOF

sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$NGINX_CONF_DIR/app.conf"

echo "### Reloading nginx..."
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "### SSL setup complete!"
echo "Certificates are located in: $CERTBOT_DIR/conf/live/$DOMAIN/"