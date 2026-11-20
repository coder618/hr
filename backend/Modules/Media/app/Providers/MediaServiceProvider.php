<?php

namespace Modules\Media\Providers;

use Modules\Media\Console\MigrateMediaDiskCommand;
use Modules\Media\Services\MediaService;
use Nwidart\Modules\Support\ModuleServiceProvider;

class MediaServiceProvider extends ModuleServiceProvider
{
    protected string $name = 'Media';
    protected string $nameLower = 'media';

    /**
     * Command classes to register.
     *
     * @var string[]
     */
    protected array $commands = [
        MigrateMediaDiskCommand::class,
    ];

    /**
     * Provider classes to register.
     *
     * @var string[]
     */
    protected array $providers = [
        RouteServiceProvider::class,
    ];

    public function register(): void
    {
        parent::register();

        $this->app->singleton(MediaService::class);
    }
}
