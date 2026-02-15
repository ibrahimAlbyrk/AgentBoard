#!/bin/bash
set -e

cd /opt/agentboard

echo "==> Pulling latest changes..."
git pull origin main

echo "==> Installing backend deps..."
cd backend
source venv/bin/activate
pip install -r requirements.txt -q

echo "==> Running migrations..."
alembic upgrade head

echo "==> Restarting backend..."
systemctl restart agentboard-backend

echo "==> Building frontend..."
cd ../frontend
npm ci --silent
npm run build

echo "==> Reloading nginx..."
systemctl reload nginx

echo "==> Deploy complete!"
curl -s http://localhost/health
