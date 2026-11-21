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
        // 1. Office Expense Categories
        Schema::create('office_expense_categories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->string('name', 100);
            $table->string('code', 50);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->index(['organization_id', 'code']);
            $table->index(['organization_id', 'is_active']);
        });

        // 2. Monthly Office Expenses
        Schema::create('office_expenses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('office_expense_category_id');
            $table->string('title', 150);
            $table->unsignedSmallInteger('expense_month'); // 1 - 12
            $table->unsignedSmallInteger('expense_year');  // e.g. 2026
            $table->date('expense_date');
            $table->decimal('amount', 14, 2);
            $table->string('currency', 10)->default('BDT');
            $table->string('payment_status', 30)->default('pending'); // pending, paid, overdue
            $table->string('payment_method', 30)->nullable(); // bank_transfer, cash, card, cheque, mobile_banking, other
            $table->date('payment_date')->nullable();
            $table->string('reference_no', 100)->nullable(); // invoice/meter/bill/voucher number
            $table->string('vendor_name', 150)->nullable();  // landlord, utility company, telecom, etc.
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('receipt_media_id')->nullable();
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('office_expense_category_id')->references('id')->on('office_expense_categories')->onDelete('cascade');
            $table->foreign('receipt_media_id')->references('id')->on('media')->nullOnDelete();
            $table->foreign('recorded_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['organization_id', 'expense_year', 'expense_month']);
            $table->index(['organization_id', 'payment_status']);
            $table->index(['organization_id', 'office_expense_category_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('office_expenses');
        Schema::dropIfExists('office_expense_categories');
    }
};
