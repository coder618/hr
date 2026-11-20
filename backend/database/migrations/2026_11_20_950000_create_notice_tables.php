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
        // 1. Notices
        Schema::create('notices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->string('title', 200);
            $table->longText('content');
            $table->string('priority', 20)->default('normal'); // normal, important, urgent
            $table->string('target_type', 30)->default('all'); // all, department, branch
            $table->string('status', 20)->default('published'); // draft, published, archived
            $table->boolean('is_pinned')->default(false);
            $table->boolean('requires_acknowledgment')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['organization_id', 'status', 'published_at']);
            $table->index(['organization_id', 'is_pinned']);
        });

        // 2. Notice Targets (for specific departments or branches)
        Schema::create('notice_targets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('notice_id');
            $table->string('target_type', 30); // department, branch
            $table->unsignedBigInteger('target_id');
            $table->timestamps();

            $table->foreign('notice_id')->references('id')->on('notices')->onDelete('cascade');
            $table->index(['notice_id', 'target_type', 'target_id']);
        });

        // 3. Notice Acknowledgments (Read receipts / employee acknowledgment)
        Schema::create('notice_acknowledgments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('notice_id');
            $table->unsignedBigInteger('employee_id');
            $table->timestamp('acknowledged_at');
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('notice_id')->references('id')->on('notices')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');

            $table->unique(['notice_id', 'employee_id']);
            $table->index(['organization_id', 'employee_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notice_acknowledgments');
        Schema::dropIfExists('notice_targets');
        Schema::dropIfExists('notices');
    }
};
