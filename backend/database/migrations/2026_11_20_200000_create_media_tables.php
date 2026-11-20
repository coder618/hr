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
        Schema::create('media_folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignId('parent_id')->nullable()->constrained('media_folders')->onDelete('cascade');
            $table->string('name', 191);
            $table->timestamps();

            $table->unique(['organization_id', 'parent_id', 'name']);
            $table->index(['organization_id', 'parent_id']);
        });

        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignId('folder_id')->nullable()->constrained('media_folders')->onDelete('set null');
            $table->string('file_name', 255); // Original client filename
            $table->string('stored_name', 255); // Sanitized hashed filename on disk
            $table->string('disk', 50)->default('media');
            $table->string('file_path', 500); // e.g. tenants/1/2026/11/abc.jpg
            $table->string('thumbnail_path', 500)->nullable();
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size'); // Bytes
            $table->string('extension', 20);
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('hash', 64)->nullable(); // SHA-256 for deduplication
            $table->string('title', 255)->nullable();
            $table->string('alt_text', 255)->nullable();
            $table->text('caption')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['organization_id', 'folder_id']);
            $table->index(['organization_id', 'mime_type']);
            $table->index(['organization_id', 'hash']);
            $table->index(['organization_id', 'created_at']);
        });

        Schema::create('mediables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('media_id')->constrained('media')->onDelete('cascade');
            $table->string('mediable_type', 191);
            $table->unsignedBigInteger('mediable_id');
            $table->string('collection', 100)->default('default');
            $table->unsignedInteger('order_column')->default(0);
            $table->timestamps();

            $table->index(['mediable_type', 'mediable_id', 'collection']);
            $table->index(['media_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mediables');
        Schema::dropIfExists('media');
        Schema::dropIfExists('media_folders');
    }
};
