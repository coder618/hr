<?php

namespace Modules\Attendance\Services;

class GeofenceService
{
    /**
     * Earth radius in meters.
     */
    protected const EARTH_RADIUS_METERS = 6371000;

    /**
     * Calculate distance between two GPS coordinates using the Haversine formula (pure PHP).
     *
     * @param float $lat1 Latitude of point 1
     * @param float $lon1 Longitude of point 1
     * @param float $lat2 Latitude of point 2
     * @param float $lon2 Longitude of point 2
     * @return float Distance in meters
     */
    public function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $latFrom = deg2rad($lat1);
        $lonFrom = deg2rad($lon1);
        $latTo = deg2rad($lat2);
        $lonTo = deg2rad($lon2);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(
            pow(sin($latDelta / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)
        ));

        return $angle * self::EARTH_RADIUS_METERS;
    }

    /**
     * Check if a coordinate is within a target geofence circle.
     */
    public function isWithinGeofence(
        float $punchLat,
        float $punchLon,
        float $targetLat,
        float $targetLon,
        int $radiusMeters
    ): bool {
        $distance = $this->calculateDistance($punchLat, $punchLon, $targetLat, $targetLon);
        return $distance <= $radiusMeters;
    }
}
