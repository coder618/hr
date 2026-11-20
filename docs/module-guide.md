# Module Developer Guide

This guide explains how to build and register new modules within the Office Management System while preserving modular independence and multi-tenant isolation.

---

## 1. Module Architecture Overview

Every module resides under `backend/Modules/<ModuleName>/` and follows this canonical structure:

```
Modules/SampleModule/
├── Config/
│   └── config.php
├── Contracts/                 # Local contracts or interfaces
├── Database/
│   ├── Migrations/           # Module-specific migrations
│   └── Seeders/              # Module-specific seeders
├── Entities/                 # Eloquent models using BelongsToOrganization
├── Events/                   # Domain events for inter-module communication
├── Http/
│   ├── Controllers/
│   ├── Requests/             # Form request validation
│   └── Resources/            # API response transformations
├── Listeners/
├── Policies/
├── Providers/
│   ├── SampleModuleServiceProvider.php
│   └── RouteServiceProvider.php
├── Routes/
│   └── api.php               # Versioned routes prefix /api/v1/sample
├── Tests/
│   └── Feature/
└── module.json               # Module manifest and dependencies
```

---

## 2. Independence Rules

1. **Never Import Models from Other Modules:**
   ```php
   // FORBIDDEN:
   use Modules\Employee\Entities\Employee;

   // CORRECT:
   use Modules\Core\Contracts\EmployeeLookupContract;
   public function __construct(protected EmployeeLookupContract $employeeLookup) {}
   ```
2. **Always Use `BelongsToOrganization` on Tenant Models:**
   ```php
   namespace Modules\SampleModule\Entities;

   use App\Traits\BelongsToOrganization;
   use Illuminate\Database\Eloquent\Model;

   class SampleItem extends Model
   {
       use BelongsToOrganization;

       protected $fillable = ['organization_id', 'title', 'amount'];
   }
   ```
3. **Cross-Module Actions via Domain Events:**
   When an action affects another module (e.g., an expense approval should be added to payroll):
   ```php
   event(new ExpenseApprovedForReimbursementEvent($expense));
   ```
   The Payroll module registers a listener to this event and acts on its own data without coupling.

---

## 3. Frontend Module Structure

Frontend modules mirror the backend under `frontend/src/modules/<module-name>/`:

```
src/modules/sample/
├── api/                      # TanStack Query hooks & Axios calls
├── components/               # Module-specific UI components
├── pages/                    # Routed page views
├── types/                    # TypeScript interfaces
└── module.config.ts          # Manifest declaring routes and sidebar items
```

### Module Manifest Example (`module.config.ts`):
```typescript
import { ModuleConfig } from '@/types/module';
import { lazy } from 'react';

export const sampleModuleConfig: ModuleConfig = {
  id: 'sample',
  name: 'Sample Module',
  routes: [
    {
      path: '/samples',
      component: lazy(() => import('./pages/SampleListPage')),
      permission: 'samples.view',
    },
  ],
  navigation: [
    {
      name: 'Samples',
      path: '/samples',
      icon: 'Layers',
      permission: 'samples.view',
    },
  ],
};
```
