#!/bin/bash

set -e

echo "### Deploying new application version..."
cd ~/pengui/deployment

# Load .env
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Check if SSL is set up
if [ ! -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "### SSL not configured. Running SSL setup first..."
    chmod +x scripts/setup-ssl.sh
    scripts/setup-ssl.sh
fi

# Pull latest image if needed
if [ ! -z "$DOCKER_IMAGE" ]; then
    echo "### Pulling latest application image..."
    docker-compose pull pengui
fi

# Deploy application
echo "### Starting/restarting application..."
docker-compose up -d pengui

# Ensure nginx and certbot are running
echo "### Ensuring nginx and certbot are running..."
docker-compose up -d nginx certbot

echo "### ✓ Deployment complete!"
echo "### Application is running at https://$DOMAIN"