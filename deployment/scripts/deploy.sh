#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment...${NC}"

# Navigate to deployment directory
cd ~/pengui/deployment

# Copy nginx configuration
cp /nginx/nginx.conf ./nginx/nginx.conf

# Create .env file with production variables
echo -e "${YELLOW}Creating .env file...${NC}"
cat > .env << 'ENV_EOF'
${PRODUCTION_ENV}
ENV_EOF

# Add DOCKER_IMAGE to .env
echo "DOCKER_IMAGE=${DOCKER_IMAGE}" >> .env

echo -e "${GREEN}.env file created successfully${NC}"

# Login to GitHub Container Registry
echo -e "${YELLOW}Logging into GitHub Container Registry...${NC}"
echo "${GITHUB_TOKEN}" | docker login ghcr.io -u ${GITHUB_ACTOR} --password-stdin

# Pull the new image
echo -e "${YELLOW}Pulling new Docker image: ${DOCKER_IMAGE}${NC}"
docker-compose pull pengui

# Restart services
echo -e "${YELLOW}Restarting services...${NC}"
docker-compose up -d

# Wait for app to be healthy
echo -e "${YELLOW}Waiting for application to start...${NC}"
sleep 10

# Health check
echo -e "${YELLOW}Running health check...${NC}"
if curl -f http://localhost:3000 --max-time 30; then
    echo -e "${GREEN}✓ Health check passed!${NC}"
else
    echo -e "${RED}✗ Health check failed!${NC}"
    echo -e "${RED}Container logs:${NC}"
    docker compose logs pengui
    exit 1
fi

# Cleanup old images
echo -e "${YELLOW}Cleaning up old images...${NC}"
docker image prune -f

echo -e "${GREEN}✓ Deployment successful!${NC}"