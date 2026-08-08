<?php
declare(strict_types=1);

/**
 * Shared bootstrap: config, DB, session, JSON helpers, error handling.
 * Loaded by api/index.php before any route runs.
 */

class ApiError extends Exception
{
    public int $status;

    public function __construct(string $message, int $status = 400)
    {
        parent::__construct($message);
        $this->status = $status;
    }
}

// Turn warnings/notices into exceptions so nothing leaks into the JSON body.
set_error_handler(static function (int $no, string $str, string $file, int $line): bool {
    if (!(error_reporting() & $no)) {
        return false;
    }
    throw new ErrorException($str, 0, $no, $file, $line);
});

set_exception_handler(static function (Throwable $e): void {
    $status = $e instanceof ApiError ? $e->status : 500;
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
    }
    $payload = ['error' => $e instanceof ApiError ? $e->getMessage() : 'Server error'];
    if (defined('CHEMI_DEBUG') && CHEMI_DEBUG) {
        $payload['detail'] = $e->getMessage();
        $payload['where'] = $e->getFile() . ':' . $e->getLine();
    }
    // Only genuine faults reach the log. 4xx responses are expected outcomes
    // (bad input, not signed in) and would otherwise drown out real problems.
    if ($status >= 500) {
        error_log('[chemi-api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    }
    echo json_encode($payload);
    exit;
});

ini_set('display_errors', '0');
error_reporting(E_ALL);

define('DOCROOT', dirname(__DIR__, 2));

$configPath = dirname(DOCROOT) . '/chemicolours_config.php';
if (!is_file($configPath)) {
    throw new ApiError('Site is not configured yet.', 500);
}
/** @var array $CONFIG */
$CONFIG = require $configPath;

if (!empty($CONFIG['debug'])) {
    define('CHEMI_DEBUG', true);
}

// ---------------------------------------------------------------- database --
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    global $CONFIG;
    $c = $CONFIG['db'];
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $c['host'], $c['name']);
    $pdo = new PDO($dsn, $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

// ----------------------------------------------------------------- session --
function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('chemi_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $https,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// -------------------------------------------------------------- json input --
function body(): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return $cache = [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new ApiError('Request body must be a JSON object.');
    }
    return $cache = $decoded;
}

function json_out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// ------------------------------------------------------------------ params --
function field(array $src, string $key, bool $required = false, string $default = ''): string
{
    $v = $src[$key] ?? null;
    if ($v === null || (is_string($v) && trim($v) === '')) {
        if ($required) {
            throw new ApiError("Field \"$key\" is required.", 422);
        }
        return $default;
    }
    if (!is_scalar($v)) {
        throw new ApiError("Field \"$key\" must be a string.", 422);
    }
    return trim((string) $v);
}

function int_field(array $src, string $key, int $default = 0): int
{
    $v = $src[$key] ?? null;
    return is_numeric($v) ? (int) $v : $default;
}

function bool_field(array $src, string $key, bool $default = false): bool
{
    $v = $src[$key] ?? null;
    if ($v === null) {
        return $default;
    }
    return filter_var($v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $default;
}

/** Turn arbitrary text into a URL-safe slug. */
function slugify(string $text, string $fallback = 'item'): string
{
    $t = strtolower(trim($text));
    $t = preg_replace('/[^a-z0-9]+/u', '-', $t) ?? '';
    $t = trim($t, '-');
    return $t !== '' ? substr($t, 0, 120) : $fallback;
}

/** Ensure a slug is unique within a table, appending -2, -3 ... as needed. */
function unique_slug(string $table, string $slug, ?int $ignoreId = null): string
{
    $allowed = ['pages', 'products', 'categories'];
    if (!in_array($table, $allowed, true)) {
        throw new ApiError('Bad table.', 500);
    }
    $base = $slug;
    $n = 1;
    while (true) {
        $sql = "SELECT id FROM `$table` WHERE slug = ?" . ($ignoreId ? ' AND id <> ?' : '') . ' LIMIT 1';
        $stmt = db()->prepare($sql);
        $stmt->execute($ignoreId ? [$slug, $ignoreId] : [$slug]);
        if (!$stmt->fetch()) {
            return $slug;
        }
        $slug = $base . '-' . (++$n);
    }
}

function json_col(mixed $value): string
{
    return json_encode($value === null ? [] : $value, JSON_UNESCAPED_UNICODE) ?: '[]';
}

function decode_json_col(?string $raw): array
{
    if ($raw === null || $raw === '') {
        return [];
    }
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}
