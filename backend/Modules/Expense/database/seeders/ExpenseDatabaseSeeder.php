<?php

namespace Modules\Expense\Database\Seeders;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Modules\Core\Entities\Organization;
use Modules\Expense\Entities\ExpenseCategory;
use Modules\Expense\Entities\OfficeExpense;
use Modules\Expense\Entities\OfficeExpenseCategory;

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

        $defaultOfficeCategories = [
            [
                'name' => 'Office Rent',
                'code' => 'RENT',
                'description' => 'Monthly premises leasing, floor rental fees, and building maintenance charges.',
            ],
            [
                'name' => 'Electricity Bill',
                'code' => 'ELECTRICITY',
                'description' => 'Power utility bills, commercial electrical charges, and generator fuel costs.',
            ],
            [
                'name' => 'Water & Utility Bill',
                'code' => 'UTILITY',
                'description' => 'Water supply authority (WASA), sewerage, gas, and municipal utility bills.',
            ],
            [
                'name' => 'Internet & Telecom',
                'code' => 'INTERNET',
                'description' => 'Dedicated fiber optic lines, office broadband, corporate SIMs, and telephony.',
            ],
            [
                'name' => 'Pantry & Office Refreshments',
                'code' => 'PANTRY',
                'description' => 'Tea, coffee, sugar, milk, drinking water jars, and kitchen refreshments.',
            ],
            [
                'name' => 'Office Supplies & Stationery',
                'code' => 'OFFICE_SUPPLIES',
                'description' => 'Printer toners, A4 paper reams, pens, notepads, and desk supplies.',
            ],
            [
                'name' => 'Maintenance & Repairs',
                'code' => 'MAINTENANCE',
                'description' => 'AC servicing, plumbing, electrical fixtures, elevator maintenance, and repairs.',
            ],
            [
                'name' => 'Cleaning & Waste Management',
                'code' => 'CLEANING',
                'description' => 'Janitorial consumables, trash disposal services, and professional sanitization.',
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

            $seededOfficeCategories = [];
            foreach ($defaultOfficeCategories as $cat) {
                $seededOfficeCategories[$cat['code']] = OfficeExpenseCategory::firstOrCreate(
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

            // Seed demo monthly office expenses if none exist
            $existingCount = OfficeExpense::where('organization_id', $org->id)->count();
            if ($existingCount === 0) {
                $adminUser = User::where('organization_id', $org->id)->first();
                $adminId = $adminUser?->id;

                $sampleExpenses = [
                    [
                        'cat' => 'RENT',
                        'title' => 'HQ Commercial Floor Rent - November 2026',
                        'month' => 11,
                        'year' => 2026,
                        'date' => '2026-11-01',
                        'amount' => 4500.00,
                        'status' => 'paid',
                        'method' => 'bank_transfer',
                        'pay_date' => '2026-11-02',
                        'ref' => 'RENT-2026-11-001',
                        'vendor' => 'Skyline Tower Properties Ltd',
                        'notes' => 'Monthly lease payment for 5th floor office suite including service charge.',
                    ],
                    [
                        'cat' => 'ELECTRICITY',
                        'title' => 'Commercial Electric Meter Bill - October Usage',
                        'month' => 11,
                        'year' => 2026,
                        'date' => '2026-11-08',
                        'amount' => 680.50,
                        'status' => 'paid',
                        'method' => 'mobile_banking',
                        'pay_date' => '2026-11-10',
                        'ref' => 'DESCO-99238472',
                        'vendor' => 'DESCO / National Power Grid',
                        'notes' => 'Meter #382910 - Main AC units and workstation circuits.',
                    ],
                    [
                        'cat' => 'UTILITY',
                        'title' => 'City Water & Sewerage Utility Bill',
                        'month' => 11,
                        'year' => 2026,
                        'date' => '2026-11-12',
                        'amount' => 125.00,
                        'status' => 'paid',
                        'method' => 'bank_transfer',
                        'pay_date' => '2026-11-14',
                        'ref' => 'WASA-88192-26',
                        'vendor' => 'Metropolitan Water Supply Authority',
                        'notes' => 'Quarterly adjusted municipal water & drainage billing.',
                    ],
                    [
                        'cat' => 'INTERNET',
                        'title' => '100 Mbps Dedicated Fiber Internet Line',
                        'month' => 11,
                        'year' => 2026,
                        'date' => '2026-11-05',
                        'amount' => 350.00,
                        'status' => 'paid',
                        'method' => 'card',
                        'pay_date' => '2026-11-05',
                        'ref' => 'INV-FIBER-4920',
                        'vendor' => 'FiberWave Telecom Corp',
                        'notes' => '1:1 primary leased line + backup LTE gateway subscription.',
                    ],
                    [
                        'cat' => 'PANTRY',
                        'title' => 'Monthly Pantry Supplies, Coffee Beans & Drinking Water',
                        'month' => 11,
                        'year' => 2026,
                        'date' => '2026-11-15',
                        'amount' => 210.00,
                        'status' => 'paid',
                        'method' => 'cash',
                        'pay_date' => '2026-11-15',
                        'ref' => 'VOUCHER-PANTRY-11',
                        'vendor' => 'Metro Superstore & Water Supply',
                        'notes' => '20 jars mineral water, premium espresso beans, tea bags, milk powders.',
                    ],
                    [
                        'cat' => 'OFFICE_SUPPLIES',
                        'title' => 'Printing Paper Reams & Desk Stationery Batch',
                        'month' => 11,
                        'year' => 2026,
                        'date' => '2026-11-18',
                        'amount' => 145.00,
                        'status' => 'pending',
                        'method' => 'bank_transfer',
                        'pay_date' => null,
                        'ref' => 'INV-STAT-2026-88',
                        'vendor' => 'Premier Stationery & Print Supplies',
                        'notes' => '10 boxes Double A A4 paper, whiteboard markers, toner cartridge.',
                    ],
                    [
                        'cat' => 'MAINTENANCE',
                        'title' => 'Central HVAC AC Unit Filter Servicing & Gas Top-up',
                        'month' => 11,
                        'year' => 2026,
                        'date' => '2026-11-20',
                        'amount' => 280.00,
                        'status' => 'pending',
                        'method' => 'cash',
                        'pay_date' => null,
                        'ref' => 'JOB-HVAC-9102',
                        'vendor' => 'CoolTech Engineering Services',
                        'notes' => 'Bi-monthly scheduled preventive maintenance for conference and server rooms.',
                    ],
                    // October 2026 sample data
                    [
                        'cat' => 'RENT',
                        'title' => 'HQ Commercial Floor Rent - October 2026',
                        'month' => 10,
                        'year' => 2026,
                        'date' => '2026-10-01',
                        'amount' => 4500.00,
                        'status' => 'paid',
                        'method' => 'bank_transfer',
                        'pay_date' => '2026-10-02',
                        'ref' => 'RENT-2026-10-001',
                        'vendor' => 'Skyline Tower Properties Ltd',
                        'notes' => 'October office lease payment.',
                    ],
                    [
                        'cat' => 'ELECTRICITY',
                        'title' => 'Commercial Electric Meter Bill - September Usage',
                        'month' => 10,
                        'year' => 2026,
                        'date' => '2026-10-09',
                        'amount' => 740.00,
                        'status' => 'paid',
                        'method' => 'mobile_banking',
                        'pay_date' => '2026-10-10',
                        'ref' => 'DESCO-98492019',
                        'vendor' => 'DESCO / National Power Grid',
                        'notes' => 'Higher consumption due to extra server rack cooling.',
                    ],
                    [
                        'cat' => 'INTERNET',
                        'title' => '100 Mbps Dedicated Fiber Internet Line - October',
                        'month' => 10,
                        'year' => 2026,
                        'date' => '2026-10-05',
                        'amount' => 350.00,
                        'status' => 'paid',
                        'method' => 'card',
                        'pay_date' => '2026-10-05',
                        'ref' => 'INV-FIBER-4811',
                        'vendor' => 'FiberWave Telecom Corp',
                        'notes' => 'Monthly dedicated broadband charge.',
                    ],
                ];

                foreach ($sampleExpenses as $se) {
                    $catModel = $seededOfficeCategories[$se['cat']] ?? null;
                    if ($catModel) {
                        OfficeExpense::create([
                            'organization_id' => $org->id,
                            'office_expense_category_id' => $catModel->id,
                            'title' => $se['title'],
                            'expense_month' => $se['month'],
                            'expense_year' => $se['year'],
                            'expense_date' => $se['date'],
                            'amount' => $se['amount'],
                            'currency' => 'BDT',
                            'payment_status' => $se['status'],
                            'payment_method' => $se['method'],
                            'payment_date' => $se['pay_date'],
                            'reference_no' => $se['ref'],
                            'vendor_name' => $se['vendor'],
                            'notes' => $se['notes'],
                            'recorded_by' => $adminId,
                        ]);
                    }
                }
            }
        }
    }
}
