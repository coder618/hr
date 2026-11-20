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
        // 1. Shifts definitions
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name', 191);
            $table->string('code', 50);
            $table->string('type', 30)->default('fixed'); // fixed, flexible, rotational
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->boolean('is_overnight')->default(false);
            $table->unsignedInteger('total_work_minutes')->default(480); // 8 hours
            $table->unsignedInteger('break_minutes')->default(60); // 1 hour
            $table->unsignedInteger('half_day_threshold_minutes')->default(240); // 4 hours
            $table->unsignedInteger('full_day_threshold_minutes')->default(420); // 7 hours
            $table->unsignedInteger('grace_period_entry_minutes')->default(15);
            $table->unsignedInteger('grace_period_exit_minutes')->default(15);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->json('breaks')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'code']);
            $table->index(['organization_id', 'is_default']);
            $table->index(['organization_id', 'is_active']);
        });

        // 2. Shift assignments (supports individual employee, department, or branch rosters)
        Schema::create('shift_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('shift_id')->constrained('shifts')->cascadeOnDelete();
            $table->string('assignable_type', 50); // employee, department, branch
            $table->unsignedBigInteger('assignable_id');
            $table->unsignedTinyInteger('day_of_week')->nullable(); // 0=Sunday, 1=Monday... 6=Saturday (nullable for date ranges)
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['organization_id', 'assignable_type', 'assignable_id'], 'idx_shift_assignable');
            $table->index(['organization_id', 'start_date', 'end_date'], 'idx_shift_dates');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shift_assignments');
        Schema::dropIfExists('shifts');
    }
};
