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
        // 1. Expense Categories
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->string('name', 100);
            $table->string('code', 30);
            $table->text('description')->nullable();
            $table->decimal('spending_limit', 12, 2)->nullable();
            $table->boolean('requires_receipt')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->index(['organization_id', 'code']);
            $table->index(['organization_id', 'is_active']);
        });

        // 2. Department Budgets
        Schema::create('department_budgets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('department_id');
            $table->unsignedSmallInteger('year');
            $table->decimal('allocated_amount', 14, 2)->default(0.00);
            $table->decimal('spent_amount', 14, 2)->default(0.00);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('department_id')->references('id')->on('departments')->onDelete('cascade');
            $table->unique(['organization_id', 'department_id', 'year'], 'dept_budget_year_unique');
        });

        // 3. Expense Claims
        Schema::create('expense_claims', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->string('claim_number', 50);
            $table->unsignedBigInteger('employee_id');
            $table->unsignedBigInteger('expense_category_id');
            $table->unsignedBigInteger('project_id')->nullable();
            $table->date('claim_date');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 10)->default('USD');
            $table->string('merchant', 150)->nullable();
            $table->string('payment_method', 30)->default('personal_card'); // cash, company_card, personal_card
            $table->text('description');
            $table->unsignedBigInteger('receipt_media_id')->nullable();
            $table->string('status', 30)->default('pending'); // pending, approved, rejected, reimbursed
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('reimbursed_at')->nullable();
            $table->string('payment_reference', 100)->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('expense_category_id')->references('id')->on('expense_categories')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('receipt_media_id')->references('id')->on('media')->nullOnDelete();

            $table->index(['organization_id', 'employee_id', 'status']);
            $table->index(['organization_id', 'claim_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expense_claims');
        Schema::dropIfExists('department_budgets');
        Schema::dropIfExists('expense_categories');
    }
};
