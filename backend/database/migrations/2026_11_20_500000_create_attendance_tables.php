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
        // 1. Attendance Biometric Devices
        Schema::create('attendance_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('name', 191);
            $table->string('serial_number', 100);
            $table->string('device_api_key', 64)->unique();
            $table->string('device_type', 50)->default('zkteco'); // zkteco, adms, generic_api
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('last_heartbeat_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'serial_number']);
            $table->index(['organization_id', 'is_active']);
        });

        // 2. Raw Attendance Punch Logs
        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('device_id')->nullable()->constrained('attendance_devices')->nullOnDelete();
            $table->dateTime('punch_time');
            $table->string('punch_type', 20)->default('in'); // in, out, break_start, break_end
            $table->string('source', 30)->default('web'); // web, mobile, biometric_device, manual
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('is_geofence_verified')->default(true);
            $table->string('ip_address', 45)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'employee_id', 'punch_time'], 'idx_att_log_emp_punch');
            $table->index(['organization_id', 'punch_time'], 'idx_att_log_punch_time');
        });

        // 3. Daily Attendance Aggregated Records
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            $table->date('date');
            $table->dateTime('clock_in')->nullable();
            $table->dateTime('clock_out')->nullable();
            $table->unsignedInteger('work_minutes')->default(0);
            $table->unsignedInteger('break_minutes')->default(0);
            $table->unsignedInteger('overtime_minutes')->default(0);
            $table->string('status', 30)->default('present'); // present, late, half_day, absent, on_leave, holiday, day_off
            $table->boolean('is_late')->default(false);
            $table->unsignedInteger('late_minutes')->default(0);
            $table->boolean('is_early_leave')->default(false);
            $table->unsignedInteger('early_leave_minutes')->default(0);
            $table->string('regularization_status', 20)->default('none'); // none, pending, approved, rejected
            $table->text('regularization_reason')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'employee_id', 'date'], 'uniq_att_emp_date');
            $table->index(['organization_id', 'date', 'status'], 'idx_att_date_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
        Schema::dropIfExists('attendance_logs');
        Schema::dropIfExists('attendance_devices');
    }
};
