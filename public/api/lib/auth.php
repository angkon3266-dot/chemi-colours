<?php
declare(strict_types=1);

/**
 * Session auth + CSRF for the admin panel.
 * Public (site-facing) endpoints never call require_admin().
 */

function current_user(): ?array
{
    start_session();
    $id = $_SESSION['uid'] ?? null;
    if (!$id) {
        return null;
    }
    $stmt = db()->prepare('SELECT id, email, name, last_login_at FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $u = $stmt->fetch();
    return $u ?: null;
}

function require_admin(): array
{
    $u = current_user();
    if (!$u) {
        throw new ApiError('Not signed in.', 401);
    }
    return $u;
}

function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

/** Every state-changing admin request must carry the CSRF header. */
function require_csrf(): void
{
    start_session();
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $have = $_SESSION['csrf'] ?? '';
    if ($have === '' || $sent === '' || !hash_equals($have, $sent)) {
        throw new ApiError('Invalid or missing CSRF token.', 403);
    }
}

function user_count(): int
{
    return (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
}

/**
 * Simple throttle so the login form cannot be brute-forced.
 * Counts failures per IP over the last 15 minutes.
 */
function login_attempts_exceeded(string $ip): bool
{
    $stmt = db()->prepare(
        'SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND created_at > (NOW() - INTERVAL 15 MINUTE)'
    );
    $stmt->execute([$ip]);
    return (int) $stmt->fetchColumn() >= 8;
}

function record_login_failure(string $ip): void
{
    db()->prepare('INSERT INTO login_attempts (ip, created_at) VALUES (?, NOW())')->execute([$ip]);
}

function clear_login_failures(string $ip): void
{
    db()->prepare('DELETE FROM login_attempts WHERE ip = ?')->execute([$ip]);
}

function client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
}
