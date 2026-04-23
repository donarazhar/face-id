<?php

namespace Database\Seeders;

use App\Models\Employee;
use Illuminate\Database\Seeder;

class DummyEmployeeSeeder extends Seeder
{
    /**
     * Seed 4 dummy employees for trial.
     * Face descriptors will be registered via the UI.
     */
    public function run(): void
    {
        $employees = [
            [
                'nip' => '198501012010011001',
                'nama' => 'Ahmad Fauzi, S.Pd.',
                'jabatan' => 'Guru Matematika',
            ],
            [
                'nip' => '199003152012012002',
                'nama' => 'Siti Nurhaliza, M.Pd.',
                'jabatan' => 'Wakil Kepala Sekolah',
            ],
            [
                'nip' => '198712202015011003',
                'nama' => 'Budi Santoso, S.Kom.',
                'jabatan' => 'Staff IT',
            ],
            [
                'nip' => '199505102018012004',
                'nama' => 'Dewi Rahmawati, S.Pd.',
                'jabatan' => 'Guru Bahasa Inggris',
            ],
        ];

        foreach ($employees as $emp) {
            Employee::updateOrCreate(
                ['nip' => $emp['nip']],
                $emp
            );
        }

        $this->command->info('✅ 4 pegawai dummy berhasil ditambahkan.');
    }
}
