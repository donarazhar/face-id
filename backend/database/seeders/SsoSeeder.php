<?php

namespace Database\Seeders;

use App\Models\SsoApp;
use Illuminate\Database\Seeder;

class SsoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $apps = [
            [
                'app_name' => 'Portal Berita Internal',
                'api_key' => 'APP-PORTAL-001',
                'is_active' => true,
            ],
            [
                'app_name' => 'Aplikasi Penggajian',
                'api_key' => 'APP-PAYROLL-002',
                'is_active' => true,
            ],
        ];

        foreach ($apps as $app) {
            SsoApp::updateOrCreate(
                ['api_key' => $app['api_key']],
                $app
            );
        }

        $this->command->info('✅ 2 Aplikasi Klien SSO (Portal & Penggajian) berhasil ditambahkan.');
    }
}
