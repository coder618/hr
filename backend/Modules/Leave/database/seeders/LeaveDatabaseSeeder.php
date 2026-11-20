<?php

namespace Modules\Leave\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Core\Entities\Organization;
use Modules\Leave\Entities\LeaveType;

class LeaveDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $organizations = Organization::all();

        foreach ($organizations as $org) {
            if (LeaveType::where('organization_id', $org->id)->count() === 0) {
                LeaveType::create([
                    'organization_id' => $org->id,
                    'name' => 'Annual Leave',
                    'code' => 'AL',
                    'color' => '#3B82F6',
                    'type' => 'paid',
                    'annual_entitlement' => 14.00,
                    'accrual_frequency' => 'monthly',
                    'gender_restriction' => 'any',
                    'requires_attachment' => false,
                    'requires_approval' => true,
                    'allow_half_day' => true,
                    'is_active' => true,
                ]);

                LeaveType::create([
                    'organization_id' => $org->id,
                    'name' => 'Sick Leave',
                    'code' => 'SL',
                    'color' => '#EF4444',
                    'type' => 'paid',
                    'annual_entitlement' => 10.00,
                    'accrual_frequency' => 'annual_lump_sum',
                    'gender_restriction' => 'any',
                    'requires_attachment' => true,
                    'requires_approval' => true,
                    'allow_half_day' => true,
                    'is_active' => true,
                ]);

                LeaveType::create([
                    'organization_id' => $org->id,
                    'name' => 'Casual Leave',
                    'code' => 'CL',
                    'color' => '#10B981',
                    'type' => 'paid',
                    'annual_entitlement' => 7.00,
                    'accrual_frequency' => 'annual_lump_sum',
                    'gender_restriction' => 'any',
                    'requires_attachment' => false,
                    'requires_approval' => true,
                    'allow_half_day' => true,
                    'is_active' => true,
                ]);
            }
        }
    }
}
