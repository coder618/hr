# System Architecture: Multi-Tenant SaaS Office Management System

## 1. Overview & Hosting Target
This system is architected to operate with 100% reliability on **standard cPanel shared hosting** environments without requiring Docker, root access, Redis, Supervisor daemons, or long-running worker processes.

### Key Constraints Respected
1. **No Daemons / Supervisor:** Background queues are driven by the database queue driver and drained by a scheduled worker (`queue:work --stop-when-empty --max-time=50`) executed via the standard 1-minute cPanel cron.
2. **No Redis:** All cache, session, and queue stores use MySQL/MariaDB or local filesystem stores.
3. **No Symlink Dependency (`storage:link`):** Shared hosts frequently disable symlinks. All uploaded documents, avatars, and media files reside in private storage (`storage/app/private/`) outside the public web root and are delivered through authorized streaming controller endpoints or signed URLs.
4. **Memory & Execution Limits:** Heavy workloads (bulk attendance calculations, monthly payroll runs, PDF generations, CSV imports) are divided into small chunked jobs (batch size 20–50 items) that complete within 5–15 seconds.

---

## 2. Multi-Tenancy Architecture

### Strategy: Single Database, Shared Schema, Row-Level Isolation
* Every tenant-owned table features an `organization_id` column.
* Composite primary indexes are structured with `organization_id` as the leading column for maximum index selectivity and query performance.
* Isolation is enforced by:
  1. `BelongsToOrganization` trait that attaches a global query scope (`TenantScope`).
  2. Automatic assignment of `organization_id` during model creation.
  3. Strict authorization policies on all route-model bindings.
  4. Platform Super Admin routes executed with `withoutGlobalScope(TenantScope::class)` for platform governance.

```
+-------------------------------------------------------------+
|                     Request Life Cycle                      |
+-------------------------------------------------------------+
                               |
                               v
               +-------------------------------+
               |    Tenant Identification      |
               |  - Sanctum Auth User Org      |
               |  - Device API Key / Serial    |
               |  - X-Organization Header      |
               +---------------+---------------+
                               |
                               v
               +-------------------------------+
               |     TenantContext Service     |
               | Stores current organization   |
               +---------------+---------------+
                               |
                               v
               +-------------------------------+
               |   BelongsToOrganization Trait |
               | Applies TenantScope globally  |
               +-------------------------------+
```

---

## 3. Modular System Architecture
The application uses `nwidart/laravel-modules` for strict domain separation.

### Independence Rules
1. Modules never import another module's Eloquent models directly.
2. Cross-module communication is conducted via:
   - **Contracts / Interfaces** located in `Modules/Core/Contracts/`.
   - **Domain Events** listened to asynchronously or synchronously.
3. Modules declare their requirements in `module.json`.
4. Tenant module access is dynamic: individual modules can be enabled or disabled per tenant based on their subscription plan.

---

## 4. Frontend Architecture
The frontend is a React 18 SPA built with Vite, TypeScript, and Tailwind CSS.
* **Module Manifests:** Every module in `frontend/src/modules/<name>/` exports a `module.config.ts` defining its routes, sidebar navigation items, and required permissions.
* **Central Registry:** The router and navigation are dynamically compiled from enabled modules and user permissions.
* **Polling Real-time:** Uses TanStack Query with background polling (15s–60s) instead of WebSockets.
