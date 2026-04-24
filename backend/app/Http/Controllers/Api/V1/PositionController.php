<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Position;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PositionController extends Controller
{
    public function index(): JsonResponse
    {
        $positions = Position::orderBy('nama')->get();

        return response()->json([
            'success' => true,
            'data' => $positions,
            'total' => $positions->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:150|unique:positions,nama',
            'is_active' => 'boolean',
        ]);

        $position = Position::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Jabatan berhasil ditambahkan.',
            'data' => $position,
        ], 201);
    }

    public function update(Request $request, Position $position): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:150|unique:positions,nama,' . $position->id,
            'is_active' => 'boolean',
        ]);

        $position->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Jabatan berhasil diperbarui.',
            'data' => $position,
        ]);
    }

    public function destroy(Position $position): JsonResponse
    {
        $position->delete();

        return response()->json([
            'success' => true,
            'message' => 'Jabatan berhasil dihapus.',
        ]);
    }
}
