#!/usr/bin/env bash
# ==============================================================================
# Build & Release Packaging Script for cPanel Shared Hosting
# ==============================================================================
# This script creates two production-ready ZIP packages for deployment without SSH:
# 1. office-backend-release.zip (includes pre-built vendor/ directory)
# 2. office-frontend-release.zip (contains static dist/ directory ready for public_html)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist_releases"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

echo "==> Starting cPanel Release Build ($TIMESTAMP)..."
echo "==> Project Root: $ROOT_DIR"

mkdir -p "$DIST_DIR"

# 1. Build Frontend Static Assets
echo "==> Building Frontend SPA..."
cd "$ROOT_DIR/frontend"
npm install --silent
npm run build

echo "==> Packaging Frontend Release..."
cd "$ROOT_DIR/frontend/dist"
# Ensure .htaccess is included in dist
cp "$ROOT_DIR/deploy/cpanel/frontend.htaccess" "$ROOT_DIR/frontend/dist/.htaccess"
zip -r "$DIST_DIR/office-frontend-release.zip" ./* .htaccess -x "*.DS_Store"

echo "    Created: $DIST_DIR/office-frontend-release.zip"

# 2. Build Backend with Production Vendor
echo "==> Preparing Backend..."
cd "$ROOT_DIR/backend"

# Ensure optimized production vendor without dev packages
composer install --no-dev --optimize-autoloader --no-interaction

# Prepare temporary packaging folder
TEMP_BACKEND="/tmp/office_backend_build_$$"
rm -rf "$TEMP_BACKEND"
mkdir -p "$TEMP_BACKEND"

echo "==> Copying backend files to packaging directory..."
rsync -av --exclude="storage/logs/*.log" \
          --exclude="storage/framework/cache/data/*" \
          --exclude="storage/framework/sessions/*" \
          --exclude="storage/framework/views/*" \
          --exclude="tests" \
          --exclude=".git" \
          --exclude=".env" \
          --exclude="node_modules" \
          "$ROOT_DIR/backend/" "$TEMP_BACKEND/"

# Ensure required storage directories exist
mkdir -p "$TEMP_BACKEND/storage/app/private/tenants"
mkdir -p "$TEMP_BACKEND/storage/framework/cache/data"
mkdir -p "$TEMP_BACKEND/storage/framework/sessions"
mkdir -p "$TEMP_BACKEND/storage/framework/views"
mkdir -p "$TEMP_BACKEND/storage/logs"

# Ensure deploy .htaccess is in public
cp "$ROOT_DIR/deploy/cpanel/api.htaccess" "$TEMP_BACKEND/public/.htaccess"

echo "==> Packaging Backend Release ZIP..."
cd "$TEMP_BACKEND"
zip -r "$DIST_DIR/office-backend-release.zip" ./* .htaccess -x "*.DS_Store"

rm -rf "$TEMP_BACKEND"

echo "    Created: $DIST_DIR/office-backend-release.zip"

# Restore dev dependencies for local development
echo "==> Restoring backend dev dependencies for local DX..."
cd "$ROOT_DIR/backend"
composer install --no-interaction --quiet

echo "========================================================================"
echo " RELEASE PACKAGING COMPLETE!"
echo " Output files:"
echo "   1. $DIST_DIR/office-backend-release.zip  -> Upload to /home/USER/office-api"
echo "   2. $DIST_DIR/office-frontend-release.zip -> Upload to /home/USER/public_html"
echo "========================================================================"
