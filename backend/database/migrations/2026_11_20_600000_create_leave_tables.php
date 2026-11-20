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
        // 1. Leave Types & Rules
        Schema::create('leave_types', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->string('name', 100);
            $table->string('code', 20);
            $table->string('color', 20)->default('#3B82F6');
            $table->string('type', 20)->default('paid'); // paid, unpaid
            $table->decimal('annual_entitlement', 5, 2)->default(14.00);
            $table->string('accrual_frequency', 20)->default('monthly'); // monthly, annual_lump_sum
            $table->string('gender_restriction', 20)->default('any'); // any, male, female
            $table->boolean('requires_attachment')->default(false);
            $table->boolean('requires_approval')->default(true);
            $table->unsignedInteger('max_consecutive_days')->nullable();
            $table->boolean('allow_half_day')->default(true);
            $table->decimal('carry_forward_limit', 5, 2)->default(0.00);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->index(['organization_id', 'code']);
            $table->index(['organization_id', 'is_active']);
        });

        // 2. Organization & Branch Holidays
        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->string('name', 150);
            $table->date('from_date');
            $table->date('to_date');
            $table->unsignedInteger('total_days')->default(1);
            $table->boolean('is_recurring')->default(false);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
            $table->index(['organization_id', 'from_date', 'to_date']);
        });

        // 3. Employee Leave Balances per Year
        Schema::create('leave_balances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('employee_id');
            $table->unsignedBigInteger('leave_type_id');
            $table->unsignedSmallInteger('year');
            $table->decimal('allocated_days', 5, 2)->default(0.00);
            $table->decimal('carried_forward', 5, 2)->default(0.00);
            $table->decimal('accrued_days', 5, 2)->default(0.00);
            $table->decimal('used_days', 5, 2)->default(0.00);
            $table->decimal('pending_days', 5, 2)->default(0.00);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('leave_type_id')->references('id')->on('leave_types')->onDelete('cascade');
            $table->unique(['organization_id', 'employee_id', 'leave_type_id', 'year'], 'emp_leave_year_unique');
        });

        // 4. Leave Applications / Requests
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('employee_id');
            $table->unsignedBigInteger('leave_type_id');
            $table->date('from_date');
            $table->date('to_date');
            $table->decimal('total_days', 5, 2);
            $table->boolean('is_half_day')->default(false);
            $table->string('half_day_session', 20)->nullable(); // morning, afternoon
            $table->text('reason');
            $table->unsignedBigInteger('attachment_media_id')->nullable();
            $table->string('status', 20)->default('pending'); // pending, approved, rejected, cancelled
            $table->unsignedBigInteger('actioned_by_user_id')->nullable();
            $table->timestamp('actioned_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('leave_type_id')->references('id')->on('leave_types')->onDelete('cascade');
            $table->foreign('actioned_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['organization_id', 'employee_id', 'status']);
            $table->index(['organization_id', 'from_date', 'to_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('leave_balances');
        Schema::dropIfExists('holidays');
        Schema::dropIfExists('leave_types');
    }
};
