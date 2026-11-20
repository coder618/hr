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
        // 1. Salary Structures
        Schema::create('salary_structures', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->index(['organization_id', 'is_active']);
        });

        // 2. Salary Components
        Schema::create('salary_components', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('salary_structure_id');
            $table->string('name', 100);
            $table->string('type', 20); // earning, deduction
            $table->string('calculation_type', 30)->default('fixed'); // fixed, percentage_of_basic
            $table->decimal('default_amount', 12, 2)->default(0.00);
            $table->decimal('percentage_value', 5, 2)->nullable();
            $table->boolean('is_taxable')->default(false);
            $table->boolean('is_mandatory')->default(false);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('salary_structure_id')->references('id')->on('salary_structures')->onDelete('cascade');
            $table->index(['organization_id', 'salary_structure_id']);
        });

        // 3. Employee Salary Assignment
        Schema::create('employee_salaries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('employee_id');
            $table->unsignedBigInteger('salary_structure_id')->nullable();
            $table->decimal('base_salary', 12, 2);
            $table->string('payment_method', 30)->default('bank_transfer'); // bank_transfer, cash, cheque
            $table->string('bank_name', 100)->nullable();
            $table->string('bank_account_number', 50)->nullable();
            $table->string('bank_routing_number', 50)->nullable();
            $table->json('custom_components')->nullable();
            $table->date('effective_from')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('salary_structure_id')->references('id')->on('salary_structures')->nullOnDelete();
            $table->unique(['organization_id', 'employee_id']);
        });

        // 4. Payroll Runs
        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->string('batch_number', 50);
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month'); // 1-12
            $table->unsignedBigInteger('branch_id')->nullable();
            $table->unsignedInteger('total_employees')->default(0);
            $table->decimal('total_gross', 14, 2)->default(0.00);
            $table->decimal('total_deductions', 14, 2)->default(0.00);
            $table->decimal('total_net', 14, 2)->default(0.00);
            $table->string('status', 20)->default('draft'); // draft, processing, approved, paid
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['organization_id', 'year', 'month']);
        });

        // 5. Individual Payslips
        Schema::create('payslips', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('payroll_run_id');
            $table->unsignedBigInteger('employee_id');
            $table->string('payslip_number', 50);
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->decimal('working_days', 5, 2)->default(0.00);
            $table->decimal('present_days', 5, 2)->default(0.00);
            $table->decimal('paid_leave_days', 5, 2)->default(0.00);
            $table->decimal('unpaid_leave_days', 5, 2)->default(0.00);
            $table->decimal('absent_days', 5, 2)->default(0.00);
            $table->unsignedInteger('overtime_minutes')->default(0);
            $table->unsignedInteger('late_minutes')->default(0);
            $table->decimal('base_salary', 12, 2);
            $table->json('earnings_breakdown');
            $table->json('deductions_breakdown');
            $table->decimal('gross_pay', 12, 2);
            $table->decimal('total_deductions', 12, 2);
            $table->decimal('net_pay', 12, 2);
            $table->string('payment_method', 30)->default('bank_transfer');
            $table->string('payment_status', 20)->default('pending'); // pending, paid
            $table->string('pdf_path', 255)->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('payroll_run_id')->references('id')->on('payroll_runs')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->unique(['organization_id', 'payroll_run_id', 'employee_id']);
            $table->index(['organization_id', 'employee_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payslips');
        Schema::dropIfExists('payroll_runs');
        Schema::dropIfExists('employee_salaries');
        Schema::dropIfExists('salary_components');
        Schema::dropIfExists('salary_structures');
    }
};
