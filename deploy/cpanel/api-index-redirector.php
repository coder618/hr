<?php

/**
 * Alternative Front Controller for cPanel setups where backend public directory
 * is placed in a subfolder like public_html/api instead of a separate subdomain.
 *
 * Place this file as public_html/api/index.php and configure the path to the Laravel
 * core application outside public_html.
 */

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Path to the Laravel application directory (outside web root)
// Example: /home/cpanelusername/office-api
$appPath = __DIR__ . '/../../office-api';

// Check if the application is in maintenance mode
if (file_exists($maintenance = $appPath . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader
require $appPath . '/vendor/autoload.php';

// Bootstrap Laravel and handle the request
(require_once $appPath . '/bootstrap/app.php')
    ->handleRequest(Request::capture());
