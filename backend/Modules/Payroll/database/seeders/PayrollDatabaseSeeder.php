<?php

namespace Modules\Payroll\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Core\Entities\Organization;
use Modules\Payroll\Entities\SalaryStructure;

class PayrollDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $organizations = Organization::all();

        foreach ($organizations as $org) {
            if (SalaryStructure::where('organization_id', $org->id)->count() === 0) {
                $structure = SalaryStructure::create([
                    'organization_id' => $org->id,
                    'name' => 'Standard Executive Structure',
                    'description' => 'Default monthly salary structure with standard allowances and deductions',
                    'is_active' => true,
                ]);

                // Earnings
                $structure->components()->create([
                    'organization_id' => $org->id,
                    'name' => 'House Rent Allowance',
                    'type' => 'earning',
                    'calculation_type' => 'percentage_of_basic',
                    'percentage_value' => 20.00,
                    'is_taxable' => true,
                    'is_mandatory' => true,
                ]);

                $structure->components()->create([
                    'organization_id' => $org->id,
                    'name' => 'Medical Allowance',
                    'type' => 'earning',
                    'calculation_type' => 'fixed',
                    'default_amount' => 2500.00,
                    'is_taxable' => false,
                    'is_mandatory' => true,
                ]);

                $structure->components()->create([
                    'organization_id' => $org->id,
                    'name' => 'Conveyance Allowance',
                    'type' => 'earning',
                    'calculation_type' => 'fixed',
                    'default_amount' => 1500.00,
                    'is_taxable' => false,
                    'is_mandatory' => true,
                ]);

                // Deductions
                $structure->components()->create([
                    'organization_id' => $org->id,
                    'name' => 'Provident Fund',
                    'type' => 'deduction',
                    'calculation_type' => 'percentage_of_basic',
                    'percentage_value' => 8.00,
                    'is_mandatory' => true,
                ]);

                $structure->components()->create([
                    'organization_id' => $org->id,
                    'name' => 'Professional Tax',
                    'type' => 'deduction',
                    'calculation_type' => 'fixed',
                    'default_amount' => 500.00,
                    'is_mandatory' => false,
                ]);
            }
        }
    }
}
