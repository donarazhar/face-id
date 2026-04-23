<?php

namespace App\Services;

use App\Models\Employee;

class FaceMatchingService
{
    /**
     * Euclidean Distance threshold for face matching.
     * Lower = stricter, Higher = more lenient.
     * 0.6 is the standard for face-api.js descriptors.
     */
    const THRESHOLD = 0.6;

    /**
     * Find matching employee by comparing face descriptors.
     *
     * @param array $inputDescriptor 128-dimensional face descriptor vector
     * @return array|null ['employee' => Employee, 'distance' => float, 'confidence' => float]
     */
    public function findMatch(array $inputDescriptor): ?array
    {
        $employees = Employee::active()
            ->withFace()
            ->get();

        if ($employees->isEmpty()) {
            return null;
        }

        $bestMatch = null;
        $bestDistance = PHP_FLOAT_MAX;

        foreach ($employees as $employee) {
            $storedDescriptor = $employee->face_descriptor;

            if (!is_array($storedDescriptor) || count($storedDescriptor) !== 128) {
                continue;
            }

            $distance = $this->euclideanDistance($inputDescriptor, $storedDescriptor);

            if ($distance < $bestDistance) {
                $bestDistance = $distance;
                $bestMatch = $employee;
            }
        }

        if ($bestMatch && $bestDistance < self::THRESHOLD) {
            return [
                'employee' => $bestMatch,
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
}
