# cPanel Shared Hosting Deployment Guide

This guide walks you step-by-step through deploying the Office Management System on any standard cPanel shared hosting account.

---

## 1. Hosting Requirements Checklist
Before starting, ensure your cPanel account supports:
* **PHP Version:** PHP 8.2 or PHP 8.3 (select in cPanel -> **MultiPHP Manager**).
* **PHP Extensions:** In cPanel -> **Select PHP Version** or MultiPHP INI, enable:
  * `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`, `gd`, `zip`, `curl`.
* **Database:** MySQL 5.7+ or MariaDB 10.3+.
* **Cron Jobs:** Standard crontab tool in cPanel.
* **Storage Allocation:** At least 250 MB for application files plus database storage.

---

## 2. Directory Layout on the Server

To ensure absolute security, the Laravel core backend is placed **outside** the web root.

```
/home/YOUR_CPANEL_USER/
│
├── office-api/                     <-- Core backend application (PRIVATE)
│   ├── app/
│   ├── Modules/
│   ├── vendor/
│   ├── storage/
│   └── .env
│
└── public_html/
    ├── api/                        <-- Target of api.yourdomain.com (Contents of backend/public)
    │   ├── .htaccess
    │   └── index.php
    │
    └── app/                        <-- Target of app.yourdomain.com (Contents of frontend/dist)
        ├── .htaccess
        └── index.html
```

---

## 3. Subdomain Configuration

In cPanel -> **Domains** or **Subdomains**, create two subdomains:
1. `api.yourdomain.com` -> Document Root: `/home/YOUR_CPANEL_USER/office-api/public`
   *(Alternatively, if your host forces document roots under public_html: point to `/home/YOUR_CPANEL_USER/public_html/api` and use the provided redirector `index.php`).*
2. `app.yourdomain.com` -> Document Root: `/home/YOUR_CPANEL_USER/public_html/app`

---

## 4. Database Setup

1. In cPanel -> **MySQL Databases**:
   * Create a new database: e.g., `user_officemanagement`.
   * Create a new database user: e.g., `user_officeadmin` with a strong password.
   * Add the user to the database with **ALL PRIVILEGES**.

---

## 5. Deployment Packaging (Local Machine)

On your local workstation or CI runner, generate the production deployment packages:
```bash
composer run build:release
```
This generates two files in `dist_releases/`:
1. `office-backend-release.zip` (pre-bundled with production `vendor/`)
2. `office-frontend-release.zip` (compiled static assets with SPA `.htaccess`)

---

## 6. Uploading to cPanel

### Backend
1. In cPanel **File Manager**, navigate to `/home/YOUR_CPANEL_USER/`.
2. Create folder `office-api` and upload `office-backend-release.zip`.
3. Extract the ZIP file inside `office-api`.
4. Copy `.env.example` to `.env` inside `office-api`.
5. Edit `.env` with your database credentials, `APP_URL=https://api.yourdomain.com`, `FRONTEND_URL=https://app.yourdomain.com`, and mail details.

### Frontend
1. Navigate to the document root of `app.yourdomain.com` (e.g. `public_html/app`).
2. Upload `office-frontend-release.zip` and extract its contents directly into the folder.
3. Ensure `.htaccess` is present.

---

## 7. Migration & Initial Seed

### Option A: If SSH Terminal is Available
In cPanel **Terminal**:
```bash
cd ~/office-api
php artisan migrate --force
php artisan db:seed --force
php artisan config:cache
php artisan route:cache
```

### Option B: If No SSH is Available (Protected Web Installer)
1. Open `https://api.yourdomain.com/install` in your browser.
2. Complete the setup wizard to verify database connectivity, execute migrations, and seed the initial Super Admin account.
3. The installer automatically locks itself upon completion by creating `storage/installed`.

---

## 8. Master Cron Job Setup

In cPanel -> **Cron Jobs**:
* Select **Once Per Minute** (`* * * * *`).
* Command:
  ```bash
  /usr/local/bin/php /home/YOUR_CPANEL_USER/office-api/artisan schedule:run >> /dev/null 2>&1
  ```
*(Adjust `/usr/local/bin/php` to your host's specific PHP 8.2+ path, e.g. `/usr/local/bin/ea-php82`).*

---

## 9. Verification & Preflight
Run the preflight health check to verify all permissions and extensions:
* Via Web: `https://api.yourdomain.com/api/v1/health`
* Or via CLI: `php artisan app:preflight`
