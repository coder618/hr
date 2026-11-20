# OfficeHub SaaS - Multi-Tenant Office Management System

A production-grade, multi-tenant SaaS Office Management System architected specifically for **standard cPanel shared hosting** (no Docker, no root, no Redis, no Supervisor).

---

## Architecture Highlights
* **Backend:** Laravel 11 (PHP 8.2+), MySQL/MariaDB, modular architecture (`nwidart/laravel-modules`).
* **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, Zustand, Lucide icons.
* **Multi-Tenancy:** Row-level isolation via `organization_id`, `BelongsToOrganization` trait, and global `TenantScope`.
* **Hosting Safe:**
  * Queue: `database` driver drained by 1-minute cPanel cron worker.
  * Cache & Session: `database` or `file` store (zero Redis dependencies).
  * Storage: Private disk (`storage/app/private/`) served through authorized controllers (zero symlink dependency).
  * Low Memory: Pure PHP DomPDF, low-memory OpenSpout for XLSX/CSV streaming.

---

## Quick Start (Local Development)

### Prerequisites
* PHP 8.2 or 8.3
* Composer 2.x
* Node.js 18+ and npm

### 1. Setup Project
Run the setup script to install dependencies, copy environment files, and initialize SQLite:
```bash
composer run setup
```

### 2. Run Local Development Server
Start the backend server and frontend development client:
```bash
# Terminal 1 - Backend:
cd backend && php artisan serve

# Terminal 2 - Frontend:
cd frontend && npm run dev

# Terminal 3 - Local Queue Worker (Optional):
cd backend && php artisan queue:listen
```

### 3. Run Tests
```bash
composer run test
```

---

## cPanel Deployment

1. Run the release packager on your workstation or CI:
   ```bash
   composer run build:release
   ```
2. Upload `dist_releases/office-backend-release.zip` to `/home/USER/office-api` outside the web root.
3. Upload `dist_releases/office-frontend-release.zip` to `/home/USER/public_html` (or subdomain docroot).
4. Configure `.env` inside `office-api` with database credentials.
5. In cPanel Cron Jobs, add the single 1-minute cron:
   ```bash
   * * * * * /usr/local/bin/php /home/USER/office-api/artisan schedule:run >> /dev/null 2>&1
   ```
6. Complete setup via SSH (`php artisan migrate --seed`) or via the web installer at `https://api.yourdomain.com/install`.

See the complete [cPanel Deployment Guide](docs/deployment-cpanel.md) for full instructions.
