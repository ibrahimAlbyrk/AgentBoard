#!/bin/bash
set -e

cd /opt/agentboard

echo "==> Pulling latest changes..."
git pull origin main

echo "==> Building and restarting containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Cleaning unused images..."
docker image prune -f

echo "==> Status:"
docker compose -f docker-compose.prod.yml ps
echo "==> Deploy complete!"
