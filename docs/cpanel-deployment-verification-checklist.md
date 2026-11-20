# cPanel Shared Hosting Deployment & Complete Verification Checklist

This document confirms the production readiness of the multi-tenant SaaS Office Management System for standard cPanel shared hosting (PHP 8.2/8.3, MySQL/MariaDB, Apache, single cron runner `* * * * * artisan schedule:run`, pure PHP PDF generation, low-memory streamed CSV exports, zero Node.js daemon runtime, zero Redis, zero Supervisor, zero root/SSH dependency).

---

## 1. Hosting Requirements & Server Layout
- [x] **PHP Version:** PHP 8.2+ or 8.3 selected in cPanel MultiPHP Manager.
- [x] **Required Extensions Enabled:**
  - `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`, `gd`, `zip`, `curl`.
- [x] **Database:** MySQL 5.7+ or MariaDB 10.3+ with `Schema::defaultStringLength(191)`.
- [x] **Shared Hosting Drivers Configured:**
  - `QUEUE_CONNECTION=database`
  - `CACHE_STORE=database` (or `file`)
  - `SESSION_DRIVER=database` (or `file`)
  - `MEDIA_DISK=local` (`storage/app/private/` outside public web root with streaming controller)
  - Zero Redis dependencies.
- [x] **Physical Server Directory Layout:**
  - Backend: `/home/USER/office-api/` (outside public web root).
  - API Document Root: `api.domain.com` -> `/home/USER/office-api/public`.
  - Frontend SPA Root: `app.domain.com` -> `/home/USER/public_html` (contents of `dist/`).
- [x] **Apache Security & Rewrite Rules:**
  - `api.htaccess`: Blocks `.env`, dotfiles, `.git`. Forces HTTPS for users while exempting biometric clocks at `/api/v1/devices/*`.
  - `frontend.htaccess`: Rewrites client routes to `index.html` with cache-control headers.

---

## 2. Complete Module Capabilities Checklist

### Phase 1: Core & Tenancy Module
- [x] Shared database, row-level isolation via `organization_id`, `BelongsToOrganization` trait, and global `TenantScope`.
- [x] Multi-guard Sanctum token authentication with Spatie RBAC (`super_admin`, `admin`, `hr`, `manager`, `employee`).
- [x] Web installer (`/installer`), super-admin tenant manager, tenant impersonation with audit banner.
- [x] Automated tenant isolation tests passed (HTTP 404/403 across tenants).

### Phase 2: Media Management Module
- [x] Dedicated private disk outside public web root with streaming controllers (zero `storage:link` symlink dependency).
- [x] GD image thumbnail generation (pure PHP, zero ImageMagick daemon).
- [x] Chunked resumable file upload service for large files over slow shared hosting connections.
- [x] Polymorphic `HasMedia` trait for attaching documents and receipts across all modules.

### Phase 3: Employee Directory & Org Chart Module
- [x] Branch locations with GPS geofence coordinates (`latitude`, `longitude`, `geofence_radius`).
- [x] Recursive hierarchy departments and designation management.
- [x] Comprehensive employee profiles linked to portal user accounts.
- [x] Low-memory cursor-based streaming CSV export and chunked CSV import.
- [x] `EmployeeLookupContract` interface for loose coupling with payroll and attendance.

### Phase 4: Shift & Rostering Module
- [x] Fixed, rotational, and flexible work shifts with automated overnight shift detection.
- [x] Hierarchical shift resolution (Employee override → Department → Branch → Tenant default).
- [x] Batch employee shift assignments and interactive monthly roster calendar UI.
- [x] `ShiftResolverContract` interface.

### Phase 5: Attendance Module
- [x] Geofence verification engine (Haversine formula in pure PHP).
- [x] Clock in/out with break tracking and device metadata logging.
- [x] Hardware biometric device push bridge (`/api/v1/devices/attendance/push` HTTP POST).
- [x] Daily automated compilation command (`attendance:process-daily` at 23:55).
- [x] Attendance regularization request and approval workflow.

### Phase 6: Leave Management Module
- [x] Accrual, carry-forward, and balance tracking per leave type.
- [x] Net working days calculation excluding weekends and official holidays.
- [x] Automated monthly leave accrual artisan command (`leave:accrue` on 1st at 01:00).
- [x] Automated attendance sync (approved leaves auto-marked `on_leave`).

### Phase 7: Payroll & Compensation Module
- [x] Flexible salary structures with dynamic fixed/percentage earnings and deductions.
- [x] Batch payroll calculation consuming attendance summary and approved leaves.
- [x] Pure PHP PDF payslip generation with `barryvdh/laravel-dompdf` (zero wkhtmltopdf/Chrome).
- [x] Low-memory streamed bank transfer CSV instruction generator.

### Phase 8: Project & Task Management Module
- [x] Projects and milestone tracking with budget and team assignments.
- [x] Interactive Kanban task board with status lifecycle (`todo`, `in_progress`, `in_review`, `completed`).
- [x] Task priority levels, checklist toggling, and work time logging with automated hour rollups.

### Phase 9: Expense / Finance Module
- [x] Expense categories with spending limits and receipt enforcement rules.
- [x] Department budget tracking with live utilization percentages and remaining balances.
- [x] Expense claim submission, approval, rejection, and reimbursement reference workflows.
- [x] Automated budget spend tracking upon claim approval.
- [x] Low-memory cursor-based expense CSV export and annual spend analytics.

### Phase 10: Notice Board & Announcements Module
- [x] Company-wide, department-specific, and branch-specific announcement targeting.
- [x] Pinned notices, priority levels (`normal`, `important`, `urgent`), and expiry dates.
- [x] Employee read receipts and mandatory acknowledgment tracking.

### Phase 11: Settings, White-Labeling, Audit Trail & Health
- [x] White-label branding (brand colors, logo URL, favicon, tagline, registration numbers).
- [x] Public branding endpoint (`GET /api/v1/branding`) for dynamic tenant styling.
- [x] Immutable activity and security audit trail with low-memory streamed CSV export.
- [x] System health monitor probe checking DB, storage, cache, cron pulse, and queue backlog.
- [x] Automated system maintenance command (`system:maintenance` at 02:00) pruning stale logs and temp files.

---

## 3. Master Cron Schedule Configuration
In cPanel -> **Cron Jobs**:
```crontab
* * * * * /usr/local/bin/php /home/USER/office-api/artisan schedule:run >> /dev/null 2>&1
```
Verified registered schedules:
1. `scheduler:heartbeat` -> Runs every minute.
2. `queue:work --stop-when-empty --max-time=50` -> Runs every minute without overlapping.
3. `attendance:process-daily` -> Compiles daily punches at 23:55.
4. `leave:accrue` -> Accrues monthly balances on 1st at 01:00.
5. `system:maintenance` -> Prunes stale logs and temp files daily at 02:00.

---

## 4. Production Release Artifacts
Generated via `deploy/build-release.sh` in `dist_releases/`:
- `office-backend-release.zip` (~13 MB): Complete Laravel 11 backend with optimized production `vendor/`, all 10 modules, migrations, seeders, config, and hardened `.htaccess`.
- `office-frontend-release.zip` (~284 KB): Optimized production build of React 18 SPA with cache-busting asset hashes and SPA rewrite `.htaccess`.
