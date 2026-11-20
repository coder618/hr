<?php

namespace Modules\Notice\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Core\Entities\Organization;
use Modules\Notice\Entities\Notice;

class NoticeDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(?int $organizationId = null): void
    {
        $orgs = $organizationId
            ? Organization::where('id', $organizationId)->get()
            : Organization::all();

        foreach ($orgs as $org) {
            Notice::firstOrCreate(
                [
                    'organization_id' => $org->id,
                    'title' => 'Welcome to the New Office Management Portal',
                ],
                [
                    'organization_id' => $org->id,
                    'title' => 'Welcome to the New Office Management Portal',
                    'content' => "Welcome everyone! Our unified self-service portal is now live. You can record daily attendance, submit leave requests, view monthly payslips, track projects, and claim business expenses seamlessly.",
                    'priority' => 'important',
                    'target_type' => 'all',
                    'status' => 'published',
                    'is_pinned' => true,
                    'requires_acknowledgment' => false,
                    'published_at' => now(),
                    'expires_at' => now()->addMonths(6),
                ]
            );

            Notice::firstOrCreate(
                [
                    'organization_id' => $org->id,
                    'title' => 'Office Security & Clean Desk Policy',
                ],
                [
                    'organization_id' => $org->id,
                    'title' => 'Office Security & Clean Desk Policy',
                    'content' => "Please ensure your work laptops are locked when stepping away from your desk. Keep printed documents securely stored at the end of each working day.",
                    'priority' => 'normal',
                    'target_type' => 'all',
                    'status' => 'published',
                    'is_pinned' => false,
                    'requires_acknowledgment' => true,
                    'published_at' => now(),
                    'expires_at' => now()->addYear(),
                ]
            );
        }
    }
}
