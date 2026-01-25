# 1. Copy files to server
scp docker-compose.yml your-user@your-server:~/pengui/
scp scripts/deploy.sh your-user@your-server:~/pengui/scripts/

# 2. SSH and run
ssh your-user@your-server
cd ~/pengui
export DOCKER_IMAGE=ghcr.io/your-username/pengui:v1.2.3
export GITHUB_TOKEN=your_token
export GITHUB_ACTOR=your-username
export PRODUCTION_ENV="$(cat .env.production)"
./scripts/deploy.sh