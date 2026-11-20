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
        // 1. Projects
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->string('title', 150);
            $table->string('code', 30);
            $table->text('description')->nullable();
            $table->string('client_name', 150)->nullable();
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->decimal('budget', 14, 2)->default(0.00);
            $table->string('status', 30)->default('planning'); // planning, in_progress, on_hold, completed, cancelled
            $table->string('priority', 20)->default('medium'); // low, medium, high, urgent
            $table->unsignedBigInteger('manager_id')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('manager_id')->references('id')->on('employees')->nullOnDelete();
            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'code']);
        });

        // 2. Project Team Members
        Schema::create('project_members', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('employee_id');
            $table->string('role', 50)->default('member'); // manager, lead, member, reviewer
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->unique(['project_id', 'employee_id']);
        });

        // 3. Project Milestones
        Schema::create('project_milestones', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('project_id');
            $table->string('title', 150);
            $table->text('description')->nullable();
            $table->date('due_date')->nullable();
            $table->string('status', 30)->default('pending'); // pending, completed
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->index(['organization_id', 'project_id', 'status']);
        });

        // 4. Tasks
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('milestone_id')->nullable();
            $table->unsignedBigInteger('assignee_id')->nullable();
            $table->unsignedBigInteger('creator_id')->nullable();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->string('priority', 20)->default('medium'); // low, medium, high, urgent
            $table->string('status', 30)->default('todo'); // todo, in_progress, in_review, completed
            $table->date('due_date')->nullable();
            $table->decimal('estimated_hours', 6, 2)->default(0.00);
            $table->decimal('actual_hours', 6, 2)->default(0.00);
            $table->json('checklist')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->foreign('milestone_id')->references('id')->on('project_milestones')->nullOnDelete();
            $table->foreign('assignee_id')->references('id')->on('employees')->nullOnDelete();
            $table->foreign('creator_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['organization_id', 'project_id', 'status']);
            $table->index(['organization_id', 'assignee_id']);
        });

        // 5. Task Time Logs / Work Logs
        Schema::create('task_time_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('task_id');
            $table->unsignedBigInteger('employee_id');
            $table->date('log_date');
            $table->decimal('hours_spent', 5, 2);
            $table->text('description')->nullable();
            $table->boolean('is_billable')->default(true);
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('cascade');
            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->index(['organization_id', 'task_id']);
            $table->index(['organization_id', 'employee_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_time_logs');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('project_milestones');
        Schema::dropIfExists('project_members');
        Schema::dropIfExists('projects');
    }
};
