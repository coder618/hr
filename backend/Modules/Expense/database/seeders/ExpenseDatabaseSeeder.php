<?php

namespace Modules\Expense\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Core\Entities\Organization;
use Modules\Expense\Entities\ExpenseCategory;

class ExpenseDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(?int $organizationId = null): void
    {
        $orgs = $organizationId
            ? Organization::where('id', $organizationId)->get()
            : Organization::all();

        $defaultCategories = [
            [
                'name' => 'Travel & Commute',
                'code' => 'TRAVEL',
                'description' => 'Business travel, flights, trains, cabs, fuel, and lodging.',
                'spending_limit' => 2000.00,
                'requires_receipt' => true,
            ],
            [
                'name' => 'Meals & Entertainment',
                'code' => 'MEALS',
                'description' => 'Client lunches, team dinners, refreshments during business events.',
                'spending_limit' => 500.00,
                'requires_receipt' => true,
            ],
            [
                'name' => 'Office Supplies & Stationery',
                'code' => 'SUPPLIES',
                'description' => 'Printing, paper, desk accessories, and small office consumables.',
                'spending_limit' => 300.00,
                'requires_receipt' => false,
            ],
            [
                'name' => 'Software & Subscriptions',
                'code' => 'SOFTWARE',
                'description' => 'SaaS tools, developer licenses, cloud infrastructure, domain names.',
                'spending_limit' => 1500.00,
                'requires_receipt' => true,
            ],
            [
                'name' => 'Client Relations & Gifts',
                'code' => 'CLIENT',
                'description' => 'Gifts, conference passes, and client hospitality expenses.',
                'spending_limit' => 1000.00,
                'requires_receipt' => true,
            ],
        ];

        foreach ($orgs as $org) {
            foreach ($defaultCategories as $cat) {
                ExpenseCategory::firstOrCreate(
                    [
                        'organization_id' => $org->id,
                        'code' => $cat['code'],
                    ],
                    array_merge($cat, [
                        'organization_id' => $org->id,
                        'is_active' => true,
                    ])
                );
            }
        }
    }
}
