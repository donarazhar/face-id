<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\SsoApp;
use App\Models\AttendanceLog;
use App\Services\FaceMatchingService;
use App\Models\QrLoginSession;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class SsoController extends Controller
{
    protected FaceMatchingService $faceMatchingService;

    public function __construct(FaceMatchingService $faceMatchingService)
    {
        $this->faceMatchingService = $faceMatchingService;
    }

    /**
     * SSO Gateway - Agnostic endpoint for external apps
     */
    public function verifyFace(Request $request): JsonResponse
    {
        // Validasi API Key Aplikasi Peminta
        $appId = $request->input('app_id');
        $ssoApp = SsoApp::where('api_key', $appId)->where('is_active', true)->first();

        if (!$ssoApp) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized App ID',
            ], 401);
        }

        // Catat waktu panggilan terakhir
        $ssoApp->update(['last_called_at' => now()]);

        // Validasi input
        if (!$request->has('face_descriptor') || !is_array($request->face_descriptor)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Missing or invalid face_descriptor (128-d vector expected)',
            ], 400);
        }

        // 1. ENGINE: Lakukan pencocokan (Matching)
        $match = $this->faceMatchingService->findMatch($request->face_descriptor);

        if (!$match) {
            return response()->json([
                'status' => 'error',
                'message' => 'Face not recognized in the system',
            ], 404);
        }

        $employee = $match['employee'];

        // 2. LOGGING: Catat ke dalam audit trail SSO / Attendance
        AttendanceLog::create([
            'employee_id' => $employee->id,
            'check_in_time' => now(),
            'status' => 'hadir',
            'confidence_score' => $match['confidence'],
            'method' => substr('sso_' . strtolower(str_replace(' ', '_', $ssoApp->app_name)), 0, 20),
        ]);

        // 3. API GATEWAY: Generate Access Token (Menggunakan Laravel Sanctum)
        // Kita menggunakan id pegawai sebagai token identity
        $token = $employee->createToken($ssoApp->app_name . '-Token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'data' => [
                'employee_id' => $employee->nip,
                'name' => $employee->nama,
                'jabatan' => $employee->jabatan,
                'photo_thumbnail' => $employee->photo_thumbnail,
                'branch' => $employee->branch,
                'confidence' => $match['confidence'],
                'access_token' => $token
            ],
            'log_status' => 'Activity Recorded for ' . $ssoApp->app_name
        ]);
    }

    /**
     * Generate QR Token for Mobile Handoff
     */
    public function generateQr(Request $request): JsonResponse
    {
        $appId = $request->input('app_id');
        $ssoApp = SsoApp::where('api_key', $appId)->where('is_active', true)->first();

        if (!$ssoApp) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized App ID'], 401);
        }

        $session = QrLoginSession::create([
            'token' => (string) Str::uuid(),
            'app_id' => $appId,
            'status' => 'pending',
            'expires_at' => now()->addMinutes(5) // Token expires in 5 minutes
        ]);

        return response()->json([
            'status' => 'success',
            'data' => [
                'token' => $session->token,
                'expires_at' => $session->expires_at
            ]
        ]);
    }

    /**
     * Check QR Token status (Polled by PC)
     */
    public function checkQrStatus($token): JsonResponse
    {
        $session = QrLoginSession::where('token', $token)->first();

        if (!$session) {
            return response()->json(['status' => 'error', 'message' => 'Invalid token'], 404);
        }

        if (now()->greaterThan($session->expires_at)) {
            $session->update(['status' => 'failed']);
            return response()->json(['status' => 'expired', 'message' => 'Token has expired'], 400);
        }

        if ($session->status === 'success' && $session->employee_id) {
            $employee = Employee::find($session->employee_id);
            $ssoApp = SsoApp::where('api_key', $session->app_id)->first();
            
            $accessToken = $employee->createToken($ssoApp->app_name . '-Token')->plainTextToken;

            // Delete session after successful consumption
            $session->delete();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'employee_id' => $employee->nip,
                    'name' => $employee->nama,
                    'jabatan' => $employee->jabatan,
                    'photo_thumbnail' => $employee->photo_thumbnail,
                    'access_token' => $accessToken
                ]
            ]);
        }

        return response()->json(['status' => $session->status]);
    }

    /**
     * Verify Face from Mobile for QR Login
     */
    public function verifyQrFace(Request $request): JsonResponse
    {
        $token = $request->input('token');
        $session = QrLoginSession::where('token', $token)->first();

        if (!$session || $session->status !== 'pending' || now()->greaterThan($session->expires_at)) {
            return response()->json(['status' => 'error', 'message' => 'Invalid or expired token'], 400);
        }

        if (!$request->has('face_descriptor') || !is_array($request->face_descriptor)) {
            return response()->json(['status' => 'error', 'message' => 'Invalid face descriptor'], 400);
        }

        $match = $this->faceMatchingService->findMatch($request->face_descriptor);

        if (!$match) {
            return response()->json(['status' => 'error', 'message' => 'Face not recognized'], 404);
        }

        $employee = $match['employee'];
        $ssoApp = SsoApp::where('api_key', $session->app_id)->first();

        // Update session
        $session->update([
            'status' => 'success',
            'employee_id' => $employee->id
        ]);

        // Logging
        AttendanceLog::create([
            'employee_id' => $employee->id,
            'check_in_time' => now(),
            'status' => 'hadir',
            'confidence_score' => $match['confidence'],
            'method' => substr('qr_' . strtolower(str_replace(' ', '_', $ssoApp->app_name)), 0, 20),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Verification successful. You can look at your PC now.']);
    }
}
