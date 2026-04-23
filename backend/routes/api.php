<?php

use App\Http\Controllers\Api\V1\EmployeeController;
use App\Http\Controllers\Api\V1\AttendanceController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Face-as-a-Service
|--------------------------------------------------------------------------
|
| Prefix: /api/v1
| All routes are versioned for future scalability.
|
*/

Route::prefix('v1')->group(function () {
    // Employee Management
    Route::apiResource('employees', EmployeeController::class);
    Route::post('employees/{employee}/enroll-face', [EmployeeController::class, 'enrollFace']);
    Route::delete('employees/{employee}/remove-face', [EmployeeController::class, 'removeFace']);

    // Attendance & Recognition
    Route::post('attendance/recognize', [AttendanceController::class, 'recognize']);
    Route::get('attendance/today', [AttendanceController::class, 'today']);
    Route::get('attendance/report', [AttendanceController::class, 'report']);

    // Dashboard
    Route::get('dashboard/stats', [AttendanceController::class, 'stats']);

    // SSO Gateway
    Route::post('auth/verify-face', [\App\Http\Controllers\Api\V1\SsoController::class, 'verifyFace']);
});
