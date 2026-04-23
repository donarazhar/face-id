<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sso_apps', function (Blueprint $table) {
            $table->id();
            $table->string('app_name', 100);
            $table->string('api_key', 64)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_called_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sso_apps');
    }
};
