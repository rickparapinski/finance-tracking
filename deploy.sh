#!/usr/bin/env bash
set -euo pipefail

LXC="root@192.168.178.50"
APP_DIR="/opt/finance-tracker"

echo "==> pulling latest main on LXC..."
ssh "$LXC" "git -C $APP_DIR pull origin main"

echo "==> rebuilding app image and restarting..."
ssh -t "$LXC" "cd $APP_DIR && docker compose up -d --build app"

echo ""
echo "done — http://192.168.178.50:3000"
