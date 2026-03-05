#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# PuzzleTrainer GCP Compute Engine Setup Script
#
# Run this on a fresh Debian/Ubuntu e2-micro VM:
#   sudo bash setup.sh
#
# Prerequisites:
#   - Your repo pushed to a git remote (GitHub, etc.)
#   - A .env file ready with your secrets
# ============================================================

REPO_URL="${1:?Usage: setup.sh <git-repo-url>}"
APP_DIR="/opt/puzzletrainer"
APP_USER="puzzletrainer"

echo "==> Installing system dependencies"
apt-get update
apt-get install -y curl nginx git

# Install Node.js 20 LTS
if ! command -v node &> /dev/null; then
  echo "==> Installing Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Creating app user"
id -u "$APP_USER" &>/dev/null || useradd --system --create-home --shell /bin/bash "$APP_USER"

echo "==> Cloning repo"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "==> Creating .env file (edit this with your real values)"
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" << 'ENVEOF'
NODE_ENV=production
PORT=3000
GOOGLE_CLIENT_ID=your-google-client-id-here
SESSION_SECRET=change-me-to-a-random-string
ENVEOF
  echo "    !! Edit /opt/puzzletrainer/.env with your actual secrets !!"
fi

echo "==> Building client"
cd "$APP_DIR/client"
npm ci
npm run build

echo "==> Building server"
cd "$APP_DIR/server"
npm ci
npx prisma generate

# Copy client build into server's public dir
rm -rf "$APP_DIR/server/public"
cp -r "$APP_DIR/client/dist" "$APP_DIR/server/public"

npm run build

echo "==> Running database migrations"
npx prisma migrate deploy

echo "==> Setting ownership"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

echo "==> Installing systemd service"
cp "$APP_DIR/deploy/puzzletrainer.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable puzzletrainer
systemctl restart puzzletrainer

echo "==> Configuring nginx"
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/puzzletrainer
ln -sf /etc/nginx/sites-available/puzzletrainer /etc/nginx/sites-enabled/puzzletrainer
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "==> Done! PuzzleTrainer is running."
echo ""
echo "Next steps:"
echo "  1. Edit /opt/puzzletrainer/.env with your real secrets"
echo "  2. Seed the database: sudo -u puzzletrainer bash -c 'cd /opt/puzzletrainer/server && npx prisma db seed'"
echo "  3. Restart: sudo systemctl restart puzzletrainer"
echo "  4. (Optional) Set up HTTPS with: sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx"
echo ""
