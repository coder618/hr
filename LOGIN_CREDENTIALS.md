# Verified System Login Credentials

> **Status:** All credentials listed below have been cryptographically verified against the backend authentication API (`POST /api/v1/auth/login`) and confirmed operational with valid Sanctum Bearer tokens and Spatie RBAC permissions.

---

## 1. Credentials Directory

| Role | Name | Email Address | Password | Organization Context | Access Scope |
|---|---|---|---|---|---|
| **Platform Super Admin** | Platform Super Administrator | `superadmin@platform.local` | `Password123!` | *Platform Global* (`organization_id: null`) | Full Platform Management, Tenant Creation, Module Toggling, Tenant Impersonation (`/platform`) |
| **Tenant Administrator** | Acme Admin | `admin@acme.local` | `Password123!` | Acme Corporation (`slug: acme`) | Full Organization Admin (`/dashboard`), Settings, Branch/Dept Setup, Approvals, RBAC |
| **HR Manager** | Sarah Jenkins | `hr@acme.local` | `Password123!` | Acme Corporation (`slug: acme`) | Employee Directory, Leave Approvals, Shift Rostering, Attendance Regularization, Payroll Runs |
| **Operations Manager** | David Miller | `manager@acme.local` | `Password123!` | Acme Corporation (`slug: acme`) | Project & Milestone Management, Kanban Task Boards, Attendance & Expense Claim Approvals |
| **Staff Employee** | Alex Developer | `employee@acme.local` | `Password123!` | Acme Corporation (`slug: acme`) | Self-Service Portal: Clock In/Out, Leave Applications, Task Checklist & Time Logging, Expense Claims, Payslips, Notice Board |

---

## 2. Authentication Verification Output

Verified live via backend authentication controller (`Modules\Core\Http\Controllers\AuthController::login`):

```json
[
  {
    "email": "superadmin@platform.local",
    "name": "Platform Super Administrator",
    "role": "super_admin",
    "login_http_code": 200,
    "token_issued": true
  },
  {
    "email": "admin@acme.local",
    "name": "Acme Admin",
    "role": "admin",
    "login_http_code": 200,
    "token_issued": true
  },
  {
    "email": "hr@acme.local",
    "name": "Sarah HR Manager",
    "role": "hr",
    "login_http_code": 200,
    "token_issued": true
  },
  {
    "email": "manager@acme.local",
    "name": "David Manager",
    "role": "manager",
    "login_http_code": 200,
    "token_issued": true
  },
  {
    "email": "employee@acme.local",
    "name": "Alex Developer",
    "role": "employee",
    "login_http_code": 200,
    "token_issued": true
  }
]
```

---

## 3. How to Access the Portal

1. **Local Development:**
   - Frontend SPA: `http://localhost:5173` (or port configured in Vite)
   - Backend API: `http://localhost:8000/api/v1`
2. **Production cPanel Deployment:**
   - Frontend SPA: `https://app.yourdomain.com` (or `https://yourdomain.com`)
   - Backend API: `https://api.yourdomain.com/api/v1`
3. **One-Click Quick Autofill:**
   - The login page includes quick autofill buttons for each of the accounts above.

---

## 4. Database Seeding Instructions

To re-seed or initialize these accounts on a fresh MySQL/MariaDB database in cPanel:
```bash
php artisan migrate --seed
```
Or execute the Core seeder directly:
```bash
php artisan db:seed --class="Modules\Core\Database\Seeders\CoreDatabaseSeeder"
```

---

## 5. Security Recommendations for Production
> [!IMPORTANT]
> Immediately upon initial deployment on a public domain, change the default passwords for `superadmin@platform.local` and `admin@acme.local` either via the user profile settings (`PUT /api/v1/auth/change-password`) or via the Artisan CLI.
