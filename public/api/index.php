<?php
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/sanitize.php';
require __DIR__ . '/lib/schema.php';

// ------------------------------------------------------------ path parsing --
$uri  = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/api/index.php')), '/');
$path = $base !== '' && str_starts_with($uri, $base) ? substr($uri, strlen($base)) : $uri;
$seg  = array_values(array_filter(explode('/', trim($path, '/')), static fn($s) => $s !== ''));
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// The schema is created on demand so a fresh deploy needs no manual step.
migrate();

require __DIR__ . '/routes/public.php';
require __DIR__ . '/routes/auth.php';
require __DIR__ . '/routes/admin.php';

$head = $seg[0] ?? '';

if ($head === 'auth') {
    handle_auth($method, array_slice($seg, 1));
}
if ($head === 'admin') {
    handle_admin($method, array_slice($seg, 1));
}
handle_public($method, $seg);

throw new ApiError('Unknown endpoint.', 404);
