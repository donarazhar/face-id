<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BranchController extends Controller
{
    /**
     * Display a listing of branches.
     */
    public function index(): JsonResponse
    {
        $branches = Branch::orderBy('nama')->get();

        return response()->json([
            'success' => true,
            'data' => $branches,
            'total' => $branches->count(),
        ]);
    }

    /**
     * Store a newly created branch.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:150',
            'alamat' => 'nullable|string|max:255',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'radius' => 'required|integer|in:100,200,300',
            'is_active' => 'boolean',
        ]);

        $branch = Branch::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cabang berhasil ditambahkan.',
            'data' => $branch,
        ], 201);
    }

    /**
     * Display the specified branch.
     */
    public function show(Branch $branch): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $branch,
        ]);
    }

    /**
     * Update the specified branch.
     */
    public function update(Request $request, Branch $branch): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:150',
            'alamat' => 'nullable|string|max:255',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'radius' => 'required|integer|in:100,200,300',
            'is_active' => 'boolean',
        ]);

        $branch->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data cabang berhasil diperbarui.',
            'data' => $branch,
        ]);
    }

    /**
     * Remove the specified branch.
     */
    public function destroy(Branch $branch): JsonResponse
    {
        $branch->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cabang berhasil dihapus.',
        ]);
    }
}
