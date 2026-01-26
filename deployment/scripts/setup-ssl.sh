#!/bin/bash

set -e

# Load .env
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Error: Set DOMAIN and EMAIL in .env"
    exit 1
fi

STAGING=${STAGING:-0}

echo "### Setting up directories..."
mkdir -p certbot/{conf,www} nginx/conf.d

# Check if certificate exists
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "### Certificate already exists for $DOMAIN"
    echo "### Skipping SSL setup. Use --force to recreate."
    
    # Still ensure HTTPS config is present
    if [ ! -f "nginx/conf.d/default.conf" ] || ! grep -q "listen 443" nginx/conf.d/default.conf; then
        echo "### Nginx HTTPS config missing, creating it..."
    else
        echo "### SSL and nginx already configured. Exiting."
        exit 0
    fi
fi

if [ ! -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "### No certificate found. Setting up SSL..."
    
    # Create HTTP-only nginx config
    cat > nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        proxy_pass http://pengui:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # Start only nginx (pengui will be started by deploy script)
    echo "### Starting nginx for certificate verification..."
    docker-compose up -d nginx
    
    echo "### Waiting for nginx to be ready..."
    sleep 10
    
    # Get certificate
    echo "### Requesting SSL certificate from Let's Encrypt..."
    STAGING_ARG=""
    [ "$STAGING" != "0" ] && STAGING_ARG="--staging"
    
    docker-compose run --rm --entrypoint "\
      certbot certonly --webroot -w /var/www/certbot \
        $STAGING_ARG --email $EMAIL \
        -d $DOMAIN -d www.$DOMAIN \
        --rsa-key-size 4096 --agree-tos --non-interactive" certbot
    
    echo "### Certificate obtained successfully!"
fi

# Create HTTPS nginx config
echo "### Creating HTTPS nginx configuration..."
cat > nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://pengui:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

echo "### Restarting nginx with HTTPS configuration..."
docker-compose up -d nginx

echo "### Starting certbot for auto-renewal..."
docker-compose up -d certbot

echo "### ✓ SSL and nginx setup complete!"