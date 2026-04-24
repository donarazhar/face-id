<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\RecognizeFaceRequest;
use App\Http\Resources\AttendanceResource;
use App\Models\AttendanceLog;
use App\Services\FaceMatchingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    protected FaceMatchingService $faceMatchingService;

    public function __construct(FaceMatchingService $faceMatchingService)
    {
        $this->faceMatchingService = $faceMatchingService;
    }

    /**
     * Recognize a face and log attendance.
     */
    public function recognize(RecognizeFaceRequest $request): JsonResponse
    {
        $match = $this->faceMatchingService->findMatch($request->face_descriptor);

        if (!$match) {
            return response()->json([
                'success' => false,
                'message' => 'Wajah tidak dikenali. Pastikan wajah Anda sudah terdaftar.',
            ], 404);
        }

        $employee = $match['employee'];

        // Check if already checked in today
        $existingLog = AttendanceLog::where('employee_id', $employee->id)
            ->today()
            ->first();

        if ($existingLog) {
            // Already checked in, return info
            $hour = now()->format('H');
            $greeting = $hour < 12 ? 'Pagi' : ($hour < 15 ? 'Siang' : ($hour < 18 ? 'Sore' : 'Malam'));

            return response()->json([
                'success' => true,
                'message' => "Selamat {$greeting}, {$employee->nama}. Anda sudah absen hari ini pada {$existingLog->check_in_time->format('H:i')}.",
                'already_checked_in' => true,
                'data' => new AttendanceResource($existingLog->load('employee')),
            ]);
        }

        // Create new attendance log
        $log = AttendanceLog::create([
            'employee_id' => $employee->id,
            'check_in_time' => now(),
            'status' => 'hadir',
            'confidence_score' => $match['confidence'],
            'method' => 'face_id',
        ]);

        $hour = now()->format('H');
        $greeting = $hour < 12 ? 'Pagi' : ($hour < 15 ? 'Siang' : ($hour < 18 ? 'Sore' : 'Malam'));

        return response()->json([
            'success' => true,
            'message' => "Selamat {$greeting}, {$employee->nama}. Absen berhasil dicatat!",
            'already_checked_in' => false,
            'data' => new AttendanceResource($log->load('employee')),
        ], 201);
    }

    /**
     * Get today's attendance logs.
     */
    public function today(): JsonResponse
    {
        $logs = AttendanceLog::with('employee')
            ->today()
            ->orderBy('check_in_time', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => AttendanceResource::collection($logs),
            'total' => $logs->count(),
            'date' => today()->toDateString(),
        ]);
    }

    /**
     * Get attendance report with date filtering.
     */
    public function report(Request $request): JsonResponse
    {
        $query = AttendanceLog::with('employee.branch');

        if ($request->has('date_from')) {
            $query->whereDate('check_in_time', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('check_in_time', '<=', $request->date_to);
        }

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->has('branch_id')) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('branch_id', $request->branch_id);
            });
        }

        $logs = $query->orderBy('check_in_time', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => AttendanceResource::collection($logs),
            'total' => $logs->count(),
        ]);
    }

    /**
     * Dashboard statistics.
     */
    public function stats(): JsonResponse
    {
        $totalEmployees = \App\Models\Employee::active()->count();
        $registeredFaces = \App\Models\Employee::active()->withFace()->count();
        $todayAttendance = AttendanceLog::today()->count();
        $todayLogs = AttendanceLog::with('employee')
            ->today()
            ->orderBy('check_in_time', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_employees' => $totalEmployees,
                'registered_faces' => $registeredFaces,
                'unregistered_faces' => $totalEmployees - $registeredFaces,
                'today_attendance' => $todayAttendance,
                'attendance_rate' => $totalEmployees > 0
                    ? round(($todayAttendance / $totalEmployees) * 100, 1)
                    : 0,
                'recent_attendance' => AttendanceResource::collection($todayLogs),
            ],
        ]);
    }
}
