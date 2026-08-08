<?php
declare(strict_types=1);

/**
 * Admin authentication.
 *
 * The very first admin account is created through /auth/setup, which only
 * works while the users table is empty. Passwords are never set by anyone
 * except the site owner, through that form.
 */

function handle_auth(string $method, array $seg): void
{
    $action = $seg[0] ?? '';

    // GET /api/auth/status — drives the admin login/setup screens.
    if ($method === 'GET' && $action === 'status') {
        $user = current_user();
        json_out([
            'needsSetup' => user_count() === 0,
            'user'       => $user ? ['id' => (int) $user['id'], 'email' => $user['email'], 'name' => $user['name']] : null,
            'csrf'       => csrf_token(),
        ]);
    }

    if ($method === 'POST' && $action === 'setup') {
        if (user_count() > 0) {
            throw new ApiError('An administrator already exists.', 409);
        }
        $b = body();
        $email = field($b, 'email', true);
        $password = field($b, 'password', true);
        $name = plain(field($b, 'name'), 120);

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiError('Enter a valid email address.', 422);
        }
        if (strlen($password) < 10) {
            throw new ApiError('Password must be at least 10 characters.', 422);
        }

        $stmt = db()->prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)');
        $stmt->execute([$email, password_hash($password, PASSWORD_DEFAULT), $name]);

        start_session();
        session_regenerate_id(true);
        $_SESSION['uid'] = (int) db()->lastInsertId();
        json_out(['ok' => true, 'csrf' => csrf_token()], 201);
    }

    if ($method === 'POST' && $action === 'login') {
        $ip = client_ip();
        if (login_attempts_exceeded($ip)) {
            throw new ApiError('Too many attempts. Try again in 15 minutes.', 429);
        }
        $b = body();
        $email = field($b, 'email', true);
        $password = field($b, 'password', true);

        $stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            record_login_failure($ip);
            // Deliberately vague: do not reveal whether the address exists.
            throw new ApiError('Incorrect email or password.', 401);
        }

        clear_login_failures($ip);
        start_session();
        session_regenerate_id(true);
        $_SESSION['uid'] = (int) $user['id'];
        db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$user['id']]);

        json_out([
            'ok'   => true,
            'user' => ['id' => (int) $user['id'], 'email' => $user['email'], 'name' => $user['name']],
            'csrf' => csrf_token(),
        ]);
    }

    if ($method === 'POST' && $action === 'logout') {
        start_session();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], (bool) $p['secure'], (bool) $p['httponly']);
        }
        session_destroy();
        json_out(['ok' => true]);
    }

    if ($method === 'POST' && $action === 'password') {
        $user = require_admin();
        require_csrf();
        $b = body();
        $current = field($b, 'currentPassword', true);
        $next = field($b, 'newPassword', true);

        $stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $hash = (string) $stmt->fetchColumn();

        if (!password_verify($current, $hash)) {
            throw new ApiError('Current password is incorrect.', 403);
        }
        if (strlen($next) < 10) {
            throw new ApiError('New password must be at least 10 characters.', 422);
        }
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            ->execute([password_hash($next, PASSWORD_DEFAULT), $user['id']]);
        json_out(['ok' => true]);
    }

    throw new ApiError('Unknown auth endpoint.', 404);
}
