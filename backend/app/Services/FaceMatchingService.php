<?php

namespace App\Services;

use App\Models\Employee;
use Illuminate\Support\Facades\Cache;

class FaceMatchingService
{
    /**
     * Euclidean Distance threshold for face matching.
     * Lower = stricter, Higher = more lenient.
     * 0.6 is the standard for face-api.js descriptors.
     */
    const THRESHOLD = 0.6;

    /**
     * If a distance is below this value, we can stop early
     * because it's almost certainly the correct person.
     */
    const EARLY_EXIT_THRESHOLD = 0.3;

    /**
     * Cache TTL for face descriptors (in seconds).
     * Descriptors rarely change, so we cache aggressively.
     */
    const CACHE_TTL = 60;

    /**
     * Find matching employee by comparing face descriptors.
     * Optimized with caching + early exit for speed.
     *
     * @param array $inputDescriptor 128-dimensional face descriptor vector
     * @return array|null ['employee' => Employee, 'distance' => float, 'confidence' => float]
     */
    public function findMatch(array $inputDescriptor): ?array
    {
        // Ambil descriptor dari cache, atau query DB jika cache kosong.
        // HANYA ambil kolom id + face_descriptor (skip photo_thumbnail base64 yang besar).
        $descriptorMap = Cache::remember('face_descriptors', self::CACHE_TTL, function () {
            return Employee::active()
                ->withFace()
                ->select(['id', 'face_descriptor'])
                ->get()
                ->mapWithKeys(fn($e) => [$e->id => $e->face_descriptor])
                ->toArray();
        });

        if (empty($descriptorMap)) {
            return null;
        }

        $bestMatchId = null;
        $bestDistance = PHP_FLOAT_MAX;

        foreach ($descriptorMap as $employeeId => $storedDescriptor) {
            if (!is_array($storedDescriptor) || count($storedDescriptor) !== 128) {
                continue;
            }

            $distance = $this->euclideanDistance($inputDescriptor, $storedDescriptor);

            if ($distance < $bestDistance) {
                $bestDistance = $distance;
                $bestMatchId = $employeeId;
            }

            // Early exit: jarak sangat kecil = pasti orang yang sama
            if ($bestDistance < self::EARLY_EXIT_THRESHOLD) {
                break;
            }
        }

        if ($bestMatchId && $bestDistance < self::THRESHOLD) {
            // Baru ambil full Employee record setelah match ditemukan
            $employee = Employee::find($bestMatchId);

            if (!$employee) {
                return null;
            }

            return [
                'employee' => $employee,
                'distance' => round($bestDistance, 6),
                'confidence' => round(1 - ($bestDistance / self::THRESHOLD), 4),
            ];
        }

        return null;
    }

    /**
     * Calculate Euclidean Distance between two vectors.
     * d(p, q) = sqrt(sum((p_i - q_i)^2))
     *
     * @param array $a First vector
     * @param array $b Second vector
     * @return float Distance value
     */
    private function euclideanDistance(array $a, array $b): float
    {
        $sum = 0.0;
        $length = min(count($a), count($b));

        for ($i = 0; $i < $length; $i++) {
            $diff = (float) $a[$i] - (float) $b[$i];
            $sum += $diff * $diff;
        }

        return sqrt($sum);
    }

    /**
     * Validate that a descriptor is a valid 128-dimensional vector.
     *
     * @param mixed $descriptor
     * @return bool
     */
    public function isValidDescriptor($descriptor): bool
    {
        if (!is_array($descriptor)) {
            return false;
        }

        if (count($descriptor) !== 128) {
            return false;
        }

        foreach ($descriptor as $value) {
            if (!is_numeric($value)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Invalidate the cached descriptors.
     * Call this after enrolling or removing a face.
     */
    public static function clearCache(): void
    {
        Cache::forget('face_descriptors');
    }
}
