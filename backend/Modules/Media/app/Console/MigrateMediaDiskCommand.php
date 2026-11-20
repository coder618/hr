<?php

namespace Modules\Media\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Modules\Media\Entities\Media;

class MigrateMediaDiskCommand extends Command
{
    protected $signature = 'media:migrate-disk {fromDisk=local} {toDisk=r2}';
    protected $description = 'Migrate stored media files between storage disks (e.g. local to Cloudflare R2 / S3)';

    public function handle(): int
    {
        $fromDisk = $this->argument('fromDisk');
        $toDisk = $this->argument('toDisk');

        $this->info("Migrating media assets from [{$fromDisk}] to [{$toDisk}]...");

        $mediaRecords = Media::withoutGlobalScopes()->where('disk', $fromDisk)->get();
        $count = $mediaRecords->count();

        if ($count === 0) {
            $this->info("No media files found on disk [{$fromDisk}].");
            return 0;
        }

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        foreach ($mediaRecords as $media) {
            if (Storage::disk($fromDisk)->exists($media->file_path)) {
                $stream = Storage::disk($fromDisk)->readStream($media->file_path);
                Storage::disk($toDisk)->writeStream($media->file_path, $stream);

                if ($media->thumbnail_path && Storage::disk($fromDisk)->exists($media->thumbnail_path)) {
                    $thumbStream = Storage::disk($fromDisk)->readStream($media->thumbnail_path);
                    Storage::disk($toDisk)->writeStream($media->thumbnail_path, $thumbStream);
                }

                $media->update(['disk' => $toDisk]);
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Successfully migrated {$count} files to [{$toDisk}].");

        return 0;
    }
}
