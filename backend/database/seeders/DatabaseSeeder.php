<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Core\Database\Seeders\CoreDatabaseSeeder;
use Modules\Expense\Database\Seeders\ExpenseDatabaseSeeder;
use Modules\Leave\Database\Seeders\LeaveDatabaseSeeder;
use Modules\Notice\Database\Seeders\NoticeDatabaseSeeder;
use Modules\Shift\Database\Seeders\ShiftDatabaseSeeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            CoreDatabaseSeeder::class,
            ShiftDatabaseSeeder::class,
            LeaveDatabaseSeeder::class,
            ExpenseDatabaseSeeder::class,
            NoticeDatabaseSeeder::class,
            \Modules\Core\Database\Seeders\DashboardDemoDataSeeder::class,
        ]);
    }
}
