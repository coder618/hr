<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Entities\Organization;
use Modules\Media\Entities\Media;
use Modules\Media\Entities\MediaFolder;
use Tests\TestCase;

class MediaModuleTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $orgA;
    protected User $userA;
    protected string $tokenA;

    protected Organization $orgB;
    protected User $userB;
    protected string $tokenB;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('media');

        foreach (['super_admin', 'admin', 'hr', 'manager', 'employee'] as $r) {
            \Spatie\Permission\Models\Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        // Create Tenant A
        $this->orgA = Organization::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Org Alpha',
            'slug' => 'org-alpha',
            'status' => 'active',
        ]);

        $this->userA = User::create([
            'organization_id' => $this->orgA->id,
            'name' => 'Alpha User',
            'email' => 'alpha@test.local',
            'password' => Hash::make('password123'),
        ]);
        $this->userA->assignRole('admin');
        $this->tokenA = $this->userA->createToken('token-a')->plainTextToken;

        // Create Tenant B
        $this->orgB = Organization::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Org Beta',
            'slug' => 'org-beta',
            'status' => 'active',
        ]);

        $this->userB = User::create([
            'organization_id' => $this->orgB->id,
            'name' => 'Beta User',
            'email' => 'beta@test.local',
            'password' => Hash::make('password123'),
        ]);
        $this->userB->assignRole('admin');
        $this->tokenB = $this->userB->createToken('token-b')->plainTextToken;
    }

    public function test_can_upload_file_and_stream_preview(): void
    {
        $file = UploadedFile::fake()->image('company-logo.png', 400, 300);

        $response = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/media/upload', [
                'file' => $file,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['id', 'uuid', 'file_name', 'preview_url']]);

        $uuid = $response->json('data.uuid');
        $media = Media::where('uuid', $uuid)->first();
        $this->assertNotNull($media);
        $this->assertEquals($this->orgA->id, $media->organization_id);

        // Preview Endpoint stream
        $previewResponse = $this->get('/api/v1/media/' . $uuid . '/preview');
        $previewResponse->assertStatus(200);
        $previewResponse->assertHeader('Content-Type', 'image/png');
    }

    public function test_chunked_upload_merges_successfully(): void
    {
        $uploadId = (string) Str::uuid();
        $chunk1 = UploadedFile::fake()->createWithContent('chunk1.bin', 'Hello ');
        $chunk2 = UploadedFile::fake()->createWithContent('chunk2.bin', 'World!');

        // Upload chunk 0
        $res1 = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/media/upload-chunk', [
                'upload_id' => $uploadId,
                'chunk_index' => 0,
                'total_chunks' => 2,
                'file' => $chunk1,
                'filename' => 'chunked_document.txt',
            ]);

        $res1->assertStatus(200)
            ->assertJsonPath('meta.completed', false);

        // Upload chunk 1 (final)
        $res2 = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/media/upload-chunk', [
                'upload_id' => $uploadId,
                'chunk_index' => 1,
                'total_chunks' => 2,
                'file' => $chunk2,
                'filename' => 'chunked_document.txt',
            ]);

        $res2->assertStatus(201)
            ->assertJsonPath('meta.completed', true)
            ->assertJsonPath('data.file_name', 'chunked_document.txt');

        $mediaId = $res2->json('data.id');
        $media = Media::find($mediaId);
        $this->assertNotNull($media);
        $this->assertEquals($this->orgA->id, $media->organization_id);
    }

    public function test_tenant_isolation_on_media_files(): void
    {
        // Tenant A creates file
        $fileA = UploadedFile::fake()->create('contract-a.pdf', 200, 'application/pdf');
        $resA = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/media/upload', ['file' => $fileA]);
        $mediaAId = $resA->json('data.id');

        // Tenant B lists media: must NOT see Tenant A's media
        $listResB = $this->withHeader('Authorization', 'Bearer ' . $this->tokenB)
            ->getJson('/api/v1/media');
        $listResB->assertStatus(200);

        // Reset authentication state between different users in same test
        auth()->forgetGuards();
        app(\Modules\Core\Contracts\TenantContextInterface::class)->setTenant(null);

        // Tenant B lists media: must NOT see Tenant A's media
        $listResB = $this->withToken($this->tokenB)
            ->getJson('/api/v1/media');
        $listResB->assertStatus(200);

        $itemsB = collect($listResB->json('data'));
        $this->assertFalse($itemsB->contains('id', $mediaAId));

        // Tenant B attempting to delete Tenant A's file must fail with 404
        $deleteResB = $this->withToken($this->tokenB)
            ->deleteJson('/api/v1/media/' . $mediaAId);
        $deleteResB->assertStatus(404);
    }

    public function test_can_manage_folders(): void
    {
        $res = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/media/folders', [
                'name' => 'HR Documents',
            ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.name', 'HR Documents');

        $folderId = $res->json('data.id');
        $folder = MediaFolder::find($folderId);
        $this->assertEquals($this->orgA->id, $folder->organization_id);

        // List folders
        $listRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->getJson('/api/v1/media/folders/list');
        $listRes->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_polymorphic_has_media_trait(): void
    {
        $media = Media::create([
            'organization_id' => $this->orgA->id,
            'file_name' => 'avatar.jpg',
            'stored_name' => 'avatar.jpg',
            'disk' => 'media',
            'file_path' => 'tenants/1/avatar.jpg',
            'mime_type' => 'image/jpeg',
            'file_size' => 1024,
            'extension' => 'jpg',
        ]);

        // Attach to User (which can use HasMedia)
        $this->userA->attachMedia($media, 'avatar');

        $this->assertCount(1, $this->userA->getMedia('avatar'));
        $this->assertEquals('avatar.jpg', $this->userA->getFirstMedia('avatar')->file_name);
        $this->assertStringContainsString($media->uuid, $this->userA->getFirstMediaUrl('avatar'));

        // Detach
        $this->userA->detachMedia($media, 'avatar');
        $this->assertCount(0, $this->userA->getMedia('avatar'));
    }

    public function test_media_disk_migration_command(): void
    {
        Storage::fake('local');
        Storage::fake('r2');

        Storage::disk('local')->put('tenants/1/test.txt', 'sample content');

        $media = Media::create([
            'organization_id' => $this->orgA->id,
            'file_name' => 'test.txt',
            'stored_name' => 'test.txt',
            'disk' => 'local',
            'file_path' => 'tenants/1/test.txt',
            'mime_type' => 'text/plain',
            'file_size' => 14,
            'extension' => 'txt',
        ]);

        $this->artisan('media:migrate-disk local r2')
            ->assertExitCode(0);

        Storage::disk('r2')->assertExists('tenants/1/test.txt');
        $this->assertEquals('r2', $media->fresh()->disk);
    }
}
