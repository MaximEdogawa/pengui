#!/bin/bash

set -e
echo "### Checking correct ssl setup..."

cd ~/pengui/deployment

if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

echo "### Checking SSL configuration..."

if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "✓ Certificate exists for $DOMAIN"
    
    # Check expiration
    EXPIRY=$(docker-compose run --rm --entrypoint "\
      openssl x509 -noout -enddate -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem" certbot 2>/dev/null | cut -d= -f2)
    echo "✓ Certificate expires: $EXPIRY"
else
    echo "✗ No certificate found for $DOMAIN"
    echo "  Run scripts/setup-ssl.sh to configure SSL"
    exit 1
fi

if [ -f "nginx/conf.d/default.conf" ] && grep -q "listen 443" nginx/conf.d/default.conf; then
    echo "✓ Nginx HTTPS configuration exists"
else
    echo "✗ Nginx HTTPS configuration missing"
    exit 1
fi

echo ""
echo "### SSL Status: OK"
```

## File Structure
```
.
├── docker-compose.yml
├── .env
├── scripts/setup-ssl.sh          # Run once (or when SSL config changes)
├── scripts/deploy.sh             # Run every deployment
├── scripts/check-ssl.sh          # Optional: check SSL status
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
│       └── default.conf  # Created by setup-ssl.sh
├── certbot/
│   ├── conf/             # Certificate storage
│   └── www/              # ACME challenge