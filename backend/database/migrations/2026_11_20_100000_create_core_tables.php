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
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name', 191);
            $table->string('slug', 191)->unique();
            $table->string('domain', 191)->nullable()->index();
            $table->string('status', 50)->default('active')->index(); // active, suspended
            $table->unsignedBigInteger('plan_id')->nullable()->index();
            $table->unsignedBigInteger('storage_used_bytes')->default(0);
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        Schema::create('tenant_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->string('module_name', 100);
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'module_name']);
        });

        Schema::create('scheduler_heartbeats', function (Blueprint $table) {
            $table->id();
            $table->string('component', 100)->unique();
            $table->timestamp('last_heartbeat_at');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable()->after('id')->constrained('organizations')->onDelete('cascade');
            $table->boolean('is_super_admin')->default(false)->after('organization_id');
            $table->string('phone', 50)->nullable()->after('email');
            $table->string('avatar', 255)->nullable()->after('phone');
            $table->boolean('is_active')->default(true)->after('avatar');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
            
            $table->index(['organization_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropIndex(['organization_id', 'is_active']);
            $table->dropColumn([
                'organization_id',
                'is_super_admin',
                'phone',
                'avatar',
                'is_active',
                'last_login_at',
            ]);
        });

        Schema::dropIfExists('scheduler_heartbeats');
        Schema::dropIfExists('tenant_modules');
        Schema::dropIfExists('organizations');
    }
};
