<?php
declare(strict_types=1);

/**
 * First-party traffic logging, recorded server-side as each page is rendered.
 *
 * Deliberately not JavaScript-based: no cookie banner is needed, ad-blockers
 * cannot hide it, and nothing is shared with a third party. A visitor is
 * identified by sha256(ip + user-agent + today + secret), so the value cannot
 * be reversed to an IP address and cannot link a person across two days.
 */

const BOT_PATTERNS = [
    'bot', 'crawl', 'spider', 'slurp', 'facebookexternalhit', 'whatsapp',
    'preview', 'monitor', 'curl', 'wget', 'python-requests', 'headless',
    'lighthouse', 'pingdom', 'uptime', 'semrush', 'ahrefs', 'dataprovider',
];

function looks_like_bot(string $ua): bool
{
    if ($ua === '') {
        return true;
    }
    $ua = strtolower($ua);
    foreach (BOT_PATTERNS as $needle) {
        if (str_contains($ua, $needle)) {
            return true;
        }
    }
    return false;
}

function device_of(string $ua): string
{
    $ua = strtolower($ua);
    if (str_contains($ua, 'ipad') || str_contains($ua, 'tablet')) {
        return 'tablet';
    }
    if (str_contains($ua, 'mobi') || str_contains($ua, 'android') || str_contains($ua, 'iphone')) {
        return 'mobile';
    }
    return 'desktop';
}

/** Never let analytics break a page render. */
function record_pageview(string $path): void
{
    try {
        $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
        if (looks_like_bot($ua) || str_starts_with($path, '/admin')) {
            return;
        }

        $ip = (string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '');
        $hash = hash('sha256', $ip . '|' . $ua . '|' . date('Y-m-d') . '|chemi-analytics');

        $ref = (string) ($_SERVER['HTTP_REFERER'] ?? '');
        $refHost = '';
        if ($ref !== '') {
            $refHost = (string) (parse_url($ref, PHP_URL_HOST) ?: '');
            // Clicking between our own pages is not a traffic source.
            if ($refHost !== '' && $refHost === ($_SERVER['HTTP_HOST'] ?? '')) {
                $refHost = '';
            }
            $refHost = preg_replace('/^www\./', '', strtolower($refHost)) ?? '';
        }

        db()->prepare(
            'INSERT INTO pageviews (path, referrer_host, visitor_hash, device) VALUES (?,?,?,?)'
        )->execute([
            mb_substr($path, 0, 300),
            mb_substr($refHost, 0, 190),
            $hash,
            device_of($ua),
        ]);

        // Cheap housekeeping: roughly once every 500 views, drop anything older
        // than a year so the table cannot grow without bound.
        if (random_int(1, 500) === 1) {
            db()->exec('DELETE FROM pageviews WHERE created_at < (NOW() - INTERVAL 365 DAY)');
        }
    } catch (Throwable $e) {
        error_log('[chemi-analytics] ' . $e->getMessage());
    }
}

/** Everything the admin dashboard shows, for the last N days. */
function analytics_summary(int $days): array
{
    $days = max(1, min(365, $days));

    $totals = db()->prepare(
        'SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors
         FROM pageviews WHERE created_at >= (NOW() - INTERVAL ? DAY)'
    );
    $totals->execute([$days]);
    $t = $totals->fetch() ?: ['views' => 0, 'visitors' => 0];

    $byDay = db()->prepare(
        'SELECT DATE(created_at) AS day, COUNT(*) AS views,
                COUNT(DISTINCT visitor_hash) AS visitors
         FROM pageviews WHERE created_at >= (NOW() - INTERVAL ? DAY)
         GROUP BY DATE(created_at) ORDER BY day ASC'
    );
    $byDay->execute([$days]);

    $topPages = db()->prepare(
        'SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors
         FROM pageviews WHERE created_at >= (NOW() - INTERVAL ? DAY)
         GROUP BY path ORDER BY views DESC LIMIT 20'
    );
    $topPages->execute([$days]);

    $referrers = db()->prepare(
        "SELECT referrer_host, COUNT(*) AS views
         FROM pageviews
         WHERE created_at >= (NOW() - INTERVAL ? DAY) AND referrer_host <> ''
         GROUP BY referrer_host ORDER BY views DESC LIMIT 20"
    );
    $referrers->execute([$days]);

    $devices = db()->prepare(
        'SELECT device, COUNT(*) AS views
         FROM pageviews WHERE created_at >= (NOW() - INTERVAL ? DAY)
         GROUP BY device ORDER BY views DESC'
    );
    $devices->execute([$days]);

    $direct = db()->prepare(
        "SELECT COUNT(*) FROM pageviews
         WHERE created_at >= (NOW() - INTERVAL ? DAY) AND referrer_host = ''"
    );
    $direct->execute([$days]);

    return [
        'days'      => $days,
        'views'     => (int) $t['views'],
        'visitors'  => (int) $t['visitors'],
        'direct'    => (int) $direct->fetchColumn(),
        'byDay'     => array_map(static fn($r) => [
            'day'      => $r['day'],
            'views'    => (int) $r['views'],
            'visitors' => (int) $r['visitors'],
        ], $byDay->fetchAll()),
        'topPages'  => array_map(static fn($r) => [
            'path'     => $r['path'],
            'views'    => (int) $r['views'],
            'visitors' => (int) $r['visitors'],
        ], $topPages->fetchAll()),
        'referrers' => array_map(static fn($r) => [
            'host'  => $r['referrer_host'],
            'views' => (int) $r['views'],
        ], $referrers->fetchAll()),
        'devices'   => array_map(static fn($r) => [
            'device' => $r['device'],
            'views'  => (int) $r['views'],
        ], $devices->fetchAll()),
    ];
}
