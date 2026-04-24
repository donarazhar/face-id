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
        Schema::create('qr_login_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('token')->unique();
            $table->string('app_id');
            $table->enum('status', ['pending', 'success', 'failed'])->default('pending');
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();
            
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('qr_login_sessions');
    }
};
