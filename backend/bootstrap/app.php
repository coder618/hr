<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->redirectGuestsTo(fn () => null);

        $middleware->alias([
            'module' => \Modules\Core\Http\Middleware\CheckModuleEnabled::class,
            'super_admin' => \Modules\Core\Http\Middleware\RequireSuperAdmin::class,
            'role' => \Modules\Core\Http\Middleware\RequireRole::class,
            'tenant.identify' => \Modules\Core\Http\Middleware\IdentifyTenant::class,
            'tenant.active' => \Modules\Core\Http\Middleware\EnsureTenantActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
