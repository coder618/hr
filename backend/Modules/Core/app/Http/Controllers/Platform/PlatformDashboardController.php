<?php

namespace Modules\Core\Http\Controllers\Platform;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Modules\Core\Entities\Organization;
use Modules\Core\Entities\SchedulerHeartbeat;
use Modules\Core\Traits\ApiResponseTrait;

class PlatformDashboardController extends Controller
{
    use ApiResponseTrait;

    /**
     * Get platform-wide overview statistics
     */
    public function stats(): JsonResponse
    {
        $totalOrganizations = Organization::count();
        $activeOrganizations = Organization::where('status', 'active')->count();
        $suspendedOrganizations = Organization::where('status', 'suspended')->count();
        $totalUsers = User::whereNotNull('organization_id')->count();

        $heartbeat = SchedulerHeartbeat::where('component', 'scheduler')->first();
        $cronHealthy = false;
        $lastHeartbeat = null;

        if ($heartbeat) {
            $lastHeartbeat = $heartbeat->last_heartbeat_at;
            $cronHealthy = now()->diffInMinutes($heartbeat->last_heartbeat_at) <= 3;
        }

        return $this->successResponse([
            'total_organizations' => $totalOrganizations,
            'active_organizations' => $activeOrganizations,
            'suspended_organizations' => $suspendedOrganizations,
            'total_users' => $totalUsers,
            'cron_healthy' => $cronHealthy,
            'last_heartbeat' => $lastHeartbeat,
            'php_version' => PHP_VERSION,
            'server_time' => now()->toIso8601String(),
        ]);
    }
}
