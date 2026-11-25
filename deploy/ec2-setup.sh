#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 22.04 / 24.04 EC2 instance for FleetTrack.
#
#   On the instance (as the default "ubuntu" user):
#     curl -fsSL https://raw.githubusercontent.com/Sharanpreet27-Singh/logistics-tracking-project/main/deploy/ec2-setup.sh -o ec2-setup.sh
#     bash ec2-setup.sh                       # uses the repo above
#     bash ec2-setup.sh <your-fork-git-url>   # or your own fork
#
#   The first run creates server/.env and downloads the RDS certificate bundle.
#   Enter your RDS MySQL settings in server/.env, then rerun the script.
#
# Installs Node 20, Nginx and PM2, clones the repo into /opt/fleettrack,
# generates JWT secrets, builds the client, starts the API under PM2 and puts Nginx in front on port 80.
set -euo pipefail

REPO_URL="${1:-https://github.com/Sharanpreet27-Singh/logistics-tracking-project.git}"
APP_DIR=/opt/fleettrack

echo "==> System packages"
sudo apt-get update -y
sudo apt-get install -y curl git nginx ca-certificates gnupg openssl

echo "==> Node.js 20"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v && npm -v

echo "==> PM2"
sudo npm install -g pm2 >/dev/null

echo "==> Application code"
sudo mkdir -p "$APP_DIR"
sudo chown "$USER":"$USER" "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

echo "==> Environment file"
mkdir -p server/certs
if [ ! -s server/certs/rds-global-bundle.pem ]; then
  curl -fsSL --remove-on-error https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o server/certs/rds-global-bundle.pem
fi
if [ ! -f server/.env ]; then
  install -m 600 server/.env.production.example server/.env
  sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$(openssl rand -hex 32)|" server/.env
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$(openssl rand -hex 32)|" server/.env
  # Public address of this instance (IMDSv2), used for CORS. Replace with your domain later.
  TOKEN=$(curl -sX PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
  PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: ${TOKEN}" http://169.254.169.254/latest/meta-data/public-ipv4 || true)
  if [ -n "$PUBLIC_IP" ]; then sed -i "s|^CLIENT_URL=.*|CLIENT_URL=http://${PUBLIC_IP}|" server/.env; fi
  echo "    Set DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD in $APP_DIR/server/.env, then rerun this script."
  exit 0
fi

echo "==> Build and start"
NO_PULL=1 INIT_SCHEMA=1 bash deploy/deploy.sh

echo "==> Nginx"
sudo cp deploy/nginx.conf /etc/nginx/sites-available/fleettrack
sudo ln -sf /etc/nginx/sites-available/fleettrack /etc/nginx/sites-enabled/fleettrack
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

echo "==> Start PM2 on boot"
sudo env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null
pm2 save >/dev/null

cat <<EOF

FleetTrack is running.
  Site:      http://${PUBLIC_IP:-<instance-public-ip>}
  API check: http://${PUBLIC_IP:-<instance-public-ip>}/api/v1/health
  Logs:      pm2 logs fleettrack-api
  First admin: add ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD to $APP_DIR/server/.env
               then run npm run admin:create from $APP_DIR and remove those values.
  Updates:   cd $APP_DIR && bash deploy/deploy.sh
EOF
