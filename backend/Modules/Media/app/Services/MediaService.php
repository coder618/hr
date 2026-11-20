<?php

namespace Modules\Media\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Media\Entities\Media;

class MediaService
{
    public function __construct(
        protected TenantContextInterface $tenantContext
    ) {}

    /**
     * Store an uploaded file and generate GD thumbnail if it's an image
     */
    public function uploadFile(
        UploadedFile $file,
        ?int $folderId = null,
        ?int $userId = null
    ): Media {
        $orgId = $this->tenantContext->getTenantId() ?: 1;
        $datePath = date('Y/m');
        $extension = strtolower($file->getClientOriginalExtension());
        $storedName = Str::uuid() . '.' . $extension;
        $relativePath = "tenants/{$orgId}/{$datePath}/{$storedName}";

        // Save file to private media disk
        $disk = 'media';
        Storage::disk($disk)->putFileAs("tenants/{$orgId}/{$datePath}", $file, $storedName);

        $fileSize = $file->getSize();
        $mimeType = $file->getMimeType() ?: 'application/octet-stream';
        $fullPath = Storage::disk($disk)->path($relativePath);
        $hash = file_exists($fullPath) ? hash_file('sha256', $fullPath) : null;

        $width = null;
        $height = null;
        $thumbnailPath = null;

        // Process image dimensions and generate pure PHP GD thumbnail
        if (str_starts_with($mimeType, 'image/') && file_exists($fullPath)) {
            $imageSize = @getimagesize($fullPath);
            if ($imageSize) {
                $width = $imageSize[0];
                $height = $imageSize[1];
            }

            // Generate thumbnail using GD
            $thumbName = 'thumb_' . $storedName;
            $thumbRelativePath = "tenants/{$orgId}/{$datePath}/{$thumbName}";
            $thumbFullPath = Storage::disk($disk)->path($thumbRelativePath);

            if ($this->generateGdThumbnail($fullPath, $thumbFullPath, $mimeType)) {
                $thumbnailPath = $thumbRelativePath;
            }
        }

        // Create Media database record
        $media = Media::create([
            'organization_id' => $orgId,
            'folder_id' => $folderId,
            'file_name' => $file->getClientOriginalName(),
            'stored_name' => $storedName,
            'disk' => $disk,
            'file_path' => $relativePath,
            'thumbnail_path' => $thumbnailPath,
            'mime_type' => $mimeType,
            'file_size' => $fileSize,
            'extension' => $extension,
            'width' => $width,
            'height' => $height,
            'hash' => $hash,
            'title' => pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'uploaded_by' => $userId,
        ]);

        // Update tenant storage tally
        $tenant = $this->tenantContext->getTenant();
        if ($tenant) {
            $tenant->increment('storage_used_bytes', $fileSize);
        }

        return $media;
    }

    /**
     * Handle chunk of resumable upload and merge when all chunks arrive
     */
    public function handleChunk(
        string $uploadId,
        int $chunkIndex,
        int $totalChunks,
        UploadedFile $chunkFile,
        string $originalFilename,
        ?int $folderId = null,
        ?int $userId = null
    ): ?Media {
        $orgId = $this->tenantContext->getTenantId() ?: 1;
        $chunkDir = storage_path("app/private/chunks/{$orgId}/{$uploadId}");

        if (!file_exists($chunkDir)) {
            @mkdir($chunkDir, 0755, true);
        }

        // Save chunk
        $chunkFile->move($chunkDir, "chunk_{$chunkIndex}");

        // Check if all chunks have arrived
        for ($i = 0; $i < $totalChunks; $i++) {
            if (!file_exists("{$chunkDir}/chunk_{$i}")) {
                return null; // Not ready yet
            }
        }

        // All chunks present: Merge them into final file
        $mergedPath = "{$chunkDir}/merged_" . Str::uuid();
        $mergedHandle = fopen($mergedPath, 'wb');

        for ($i = 0; $i < $totalChunks; $i++) {
            $chunkPart = fopen("{$chunkDir}/chunk_{$i}", 'rb');
            stream_copy_to_stream($chunkPart, $mergedHandle);
            fclose($chunkPart);
            @unlink("{$chunkDir}/chunk_{$i}");
        }
        fclose($mergedHandle);

        // Create UploadedFile instance from merged file
        $mergedFile = new UploadedFile(
            $mergedPath,
            $originalFilename,
            mime_content_type($mergedPath),
            null,
            true
        );

        $media = $this->uploadFile($mergedFile, $folderId, $userId);

        // Cleanup temporary merged file and directory
        @unlink($mergedPath);
        @rmdir($chunkDir);

        return $media;
    }

    /**
     * Pure PHP GD Thumbnail Generator (Shared hosting compatible, no Imagick/CLI required)
     */
    public function generateGdThumbnail(
        string $sourcePath,
        string $destinationPath,
        string $mimeType,
        int $maxWidth = 300,
        int $maxHeight = 300
    ): bool {
        if (!extension_loaded('gd')) {
            return false;
        }

        $image = match ($mimeType) {
            'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($sourcePath),
            'image/png' => @imagecreatefrompng($sourcePath),
            'image/gif' => @imagecreatefromgif($sourcePath),
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($sourcePath) : false,
            default => false,
        };

        if (!$image) {
            return false;
        }

        $origWidth = imagesx($image);
        $origHeight = imagesy($image);

        if ($origWidth <= 0 || $origHeight <= 0) {
            imagedestroy($image);
            return false;
        }

        // Calculate aspect-ratio dimensions
        $ratio = min($maxWidth / $origWidth, $maxHeight / $origHeight);
        $newWidth = (int) round($origWidth * $ratio);
        $newHeight = (int) round($origHeight * $ratio);

        $thumb = imagecreatetruecolor($newWidth, $newHeight);

        // Preserve PNG/GIF/WebP transparency
        if (in_array($mimeType, ['image/png', 'image/gif', 'image/webp'])) {
            imagealphablending($thumb, false);
            imagesavealpha($thumb, true);
            $transparent = imagecolorallocatealpha($thumb, 255, 255, 255, 127);
            imagefilledrectangle($thumb, 0, 0, $newWidth, $newHeight, $transparent);
        }

        imagecopyresampled($thumb, $image, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);

        // Ensure parent directory exists
        $destDir = dirname($destinationPath);
        if (!file_exists($destDir)) {
            @mkdir($destDir, 0755, true);
        }

        $saved = match ($mimeType) {
            'image/png' => imagepng($thumb, $destinationPath, 6),
            'image/gif' => imagegif($thumb, $destinationPath),
            'image/webp' => function_exists('imagewebp') ? imagewebp($thumb, $destinationPath, 80) : false,
            default => imagejpeg($thumb, $destinationPath, 80),
        };

        imagedestroy($image);
        imagedestroy($thumb);

        return $saved;
    }

    /**
     * Delete Media record and files from disk
     */
    public function deleteMedia(Media $media): bool
    {
        Storage::disk($media->disk)->delete($media->file_path);

        if ($media->thumbnail_path) {
            Storage::disk($media->disk)->delete($media->thumbnail_path);
        }

        // Decrement tenant storage tally
        $tenant = $this->tenantContext->getTenant();
        if ($tenant) {
            $tenant->decrement('storage_used_bytes', min($tenant->storage_used_bytes, $media->file_size));
        }

        return $media->delete();
    }
}
