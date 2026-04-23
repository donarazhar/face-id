<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Http\Requests\EnrollFaceRequest;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;

class EmployeeController extends Controller
{
    /**
     * Display a listing of employees.
     */
    public function index(): JsonResponse
    {
        $employees = Employee::orderBy('nama')->get();

        return response()->json([
            'success' => true,
            'data' => EmployeeResource::collection($employees),
            'total' => $employees->count(),
        ]);
    }

    /**
     * Store a newly created employee.
     */
    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        $employee = Employee::create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Pegawai berhasil ditambahkan.',
            'data' => new EmployeeResource($employee),
        ], 201);
    }

    /**
     * Display the specified employee.
     */
    public function show(Employee $employee): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new EmployeeResource($employee),
        ]);
    }

    /**
     * Update the specified employee.
     */
    public function update(UpdateEmployeeRequest $request, Employee $employee): JsonResponse
    {
        $employee->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Data pegawai berhasil diperbarui.',
            'data' => new EmployeeResource($employee),
        ]);
    }

    /**
     * Remove the specified employee.
     */
    public function destroy(Employee $employee): JsonResponse
    {
        $employee->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pegawai berhasil dihapus.',
        ]);
    }

    /**
     * Enroll a face descriptor for the employee.
     */
    public function enrollFace(EnrollFaceRequest $request, Employee $employee): JsonResponse
    {
        $employee->update([
            'face_descriptor' => $request->face_descriptor,
            'face_registered_at' => now(),
            'photo_thumbnail' => $request->thumbnail,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Wajah {$employee->nama} berhasil didaftarkan.",
            'data' => new EmployeeResource($employee->fresh()),
        ]);
    }

    /**
     * Remove face enrollment for the employee.
     */
    public function removeFace(Employee $employee): JsonResponse
    {
        $employee->update([
            'face_descriptor' => null,
            'face_registered_at' => null,
            'photo_thumbnail' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Data wajah {$employee->nama} berhasil dihapus.",
            'data' => new EmployeeResource($employee->fresh()),
        ]);
    }
}
