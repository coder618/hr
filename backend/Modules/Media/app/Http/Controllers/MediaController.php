<?php

namespace Modules\Media\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;
use Modules\Core\Contracts\TenantContextInterface;
use Modules\Core\Traits\ApiResponseTrait;
use Modules\Media\Entities\Media;
use Modules\Media\Entities\MediaFolder;
use Modules\Media\Services\MediaService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected MediaService $mediaService,
        protected TenantContextInterface $tenantContext
    ) {}

    /**
     * List media items with folder, type, and search filters
     */
    public function index(Request $request): JsonResponse
    {
        $query = Media::with('uploader:id,name')->latest();

        if ($request->has('folder_id')) {
            $folderId = $request->folder_id;
            if ($folderId === 'null' || $folderId === '' || $folderId === null) {
                $query->whereNull('folder_id');
            } else {
                $query->where('folder_id', (int) $folderId);
            }
        }

        if ($request->filled('type')) {
            $type = $request->type;
            if ($type === 'image') {
                $query->where('mime_type', 'like', 'image/%');
            } elseif ($type === 'document') {
                $query->where(function ($q) {
                    $q->where('mime_type', 'like', 'application/pdf%')
                      ->orWhere('mime_type', 'like', '%word%')
                      ->orWhere('mime_type', 'like', '%excel%')
                      ->orWhere('mime_type', 'like', '%spreadsheet%')
                      ->orWhere('mime_type', 'text/plain')
                      ->orWhere('mime_type', 'text/csv');
                });
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('file_name', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->get('per_page', 24);
        $media = $query->paginate($perPage);

        // Format items with URLs
        $items = collect($media->items())->map(function ($item) {
            return array_merge($item->toArray(), [
                'preview_url' => $item->getUrl(),
                'thumbnail_url' => $item->getThumbnailUrl(),
            ]);
        });

        return $this->successResponse(
            $items,
            'Media files retrieved.',
            [
                'current_page' => $media->currentPage(),
                'per_page' => $media->perPage(),
                'total' => $media->total(),
                'last_page' => $media->lastPage(),
            ]
        );
    }

    /**
     * Single File Upload
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:51200', // max 50MB
            'folder_id' => 'nullable|integer|exists:media_folders,id',
        ]);

        $file = $request->file('file');
        $folderId = $request->folder_id ? (int) $request->folder_id : null;
        $user = $request->user();

        $media = $this->mediaService->uploadFile($file, $folderId, $user?->id);

        return $this->successResponse(
            array_merge($media->toArray(), [
                'preview_url' => $media->getUrl(),
                'thumbnail_url' => $media->getThumbnailUrl(),
            ]),
            'File uploaded successfully.',
            null,
            201
        );
    }

    /**
     * Chunked / Resumable Upload Endpoint
     */
    public function uploadChunk(Request $request): JsonResponse
    {
        $request->validate([
            'upload_id' => 'required|string',
            'chunk_index' => 'required|integer',
            'total_chunks' => 'required|integer',
            'file' => 'required|file',
            'filename' => 'required|string',
            'folder_id' => 'nullable|integer',
        ]);

        $uploadId = $request->upload_id;
        $chunkIndex = (int) $request->chunk_index;
        $totalChunks = (int) $request->total_chunks;
        $file = $request->file('file');
        $filename = $request->filename;
        $folderId = $request->folder_id ? (int) $request->folder_id : null;
        $user = $request->user();

        $media = $this->mediaService->handleChunk(
            $uploadId,
            $chunkIndex,
            $totalChunks,
            $file,
            $filename,
            $folderId,
            $user?->id
        );

        if ($media) {
            return $this->successResponse(
                array_merge($media->toArray(), [
                    'preview_url' => $media->getUrl(),
                    'thumbnail_url' => $media->getThumbnailUrl(),
                ]),
                'File fully assembled and saved.',
                ['completed' => true],
                201
            );
        }

        return $this->successResponse(
            ['chunk_index' => $chunkIndex],
            'Chunk received successfully.',
            ['completed' => false]
        );
    }

    /**
     * Stream File Preview
     */
    public function preview($uuid): mixed
    {
        $media = Media::where('uuid', $uuid)->firstOrFail();

        $fullPath = Storage::disk($media->disk)->path($media->file_path);

        if (!file_exists($fullPath)) {
            abort(404, 'File not found on disk.');
        }

        return response()->file($fullPath, [
            'Content-Type' => $media->mime_type,
            'Content-Disposition' => 'inline; filename="' . $media->file_name . '"',
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    /**
     * Stream Thumbnail Preview
     */
    public function thumbnail($uuid): mixed
    {
        $media = Media::where('uuid', $uuid)->firstOrFail();

        if ($media->thumbnail_path) {
            $thumbFullPath = Storage::disk($media->disk)->path($media->thumbnail_path);
            if (file_exists($thumbFullPath)) {
                return response()->file($thumbFullPath, [
                    'Content-Type' => $media->mime_type,
                    'Content-Disposition' => 'inline; filename="thumb_' . $media->file_name . '"',
                    'Cache-Control' => 'private, max-age=604800',
                ]);
            }
        }

        return $this->preview($uuid);
    }

    /**
     * Download File
     */
    public function download($uuid): mixed
    {
        $media = Media::where('uuid', $uuid)->firstOrFail();
        $fullPath = Storage::disk($media->disk)->path($media->file_path);

        if (!file_exists($fullPath)) {
            abort(404, 'File not found on disk.');
        }

        return response()->download($fullPath, $media->file_name, [
            'Content-Type' => $media->mime_type,
        ]);
    }

    /**
     * Update Media Metadata
     */
    public function update(Request $request, $id): JsonResponse
    {
        $media = Media::findOrFail($id);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'alt_text' => 'nullable|string|max:255',
            'caption' => 'nullable|string',
            'folder_id' => 'nullable|integer|exists:media_folders,id',
        ]);

        $media->update($validated);

        return $this->successResponse($media, 'Media metadata updated.');
    }

    /**
     * Delete Media
     */
    public function destroy($id): JsonResponse
    {
        $media = Media::findOrFail($id);
        $this->mediaService->deleteMedia($media);

        return $this->successResponse(null, 'Media file deleted successfully.');
    }

    /**
     * Bulk Delete Media
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer',
        ]);

        $items = Media::whereIn('id', $request->ids)->get();
        foreach ($items as $media) {
            $this->mediaService->deleteMedia($media);
        }

        return $this->successResponse(['count' => $items->count()], 'Selected media files deleted.');
    }

    /**
     * List Media Folders
     */
    public function folders(): JsonResponse
    {
        $folders = MediaFolder::withCount('media')->get();
        return $this->successResponse($folders);
    }

    /**
     * Create Media Folder
     */
    public function createFolder(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:191',
            'parent_id' => 'nullable|integer|exists:media_folders,id',
        ]);

        $folder = MediaFolder::create([
            'name' => $request->name,
            'parent_id' => $request->parent_id,
        ]);

        return $this->successResponse($folder, 'Folder created successfully.', null, 201);
    }

    /**
     * Delete Media Folder
     */
    public function deleteFolder($id): JsonResponse
    {
        $folder = MediaFolder::findOrFail($id);
        $folder->delete();

        return $this->successResponse(null, 'Folder deleted successfully.');
    }
}
