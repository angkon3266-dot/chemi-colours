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

/**
 * $resolved comes from render.php, which already looked this exact path up
 * against products, posts, categories and pages to build the meta tags —
 * the same source of truth the client-side router uses. A vulnerability
 * scanner or malware probe (/wp-includes/wlwmanifest.xml, /.env, /backup…)
 * never resolves to anything real, so it never reaches here, without having
 * to guess from the path's shape or maintain a list of known junk requests.
 */
function record_pageview(string $path, bool $resolved): void
{
    try {
        $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
        if (!$resolved || looks_like_bot($ua) || str_starts_with($path, '/admin')) {
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
    return build_analytics_summary(
        'created_at >= (NOW() - INTERVAL ? DAY)',
        [$days],
        'DATE(created_at)',
        $days
    );
}

/**
 * Same shape as analytics_summary(), scoped to the current calendar day (not
 * a rolling 24 hours) and broken down by hour rather than by day — a single
 * day has nothing to chart one bar per day.
 */
function analytics_summary_today(): array
{
    return build_analytics_summary(
        'DATE(created_at) = CURDATE()',
        [],
        "DATE_FORMAT(created_at, '%H:00')",
        0
    );
}

/**
 * $where/$whereParams select the time window; $bucketExpr is what "day" in
 * the response actually groups by (a calendar date for a day range, an hour
 * label for "today"). Every query below shares both, so the two ranges stay
 * a single code path instead of two summaries drifting apart over time.
 */
function build_analytics_summary(string $where, array $whereParams, string $bucketExpr, int $days): array
{
    $totals = db()->prepare(
        "SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors
         FROM pageviews WHERE $where"
    );
    $totals->execute($whereParams);
    $t = $totals->fetch() ?: ['views' => 0, 'visitors' => 0];

    $byDay = db()->prepare(
        "SELECT $bucketExpr AS day, COUNT(*) AS views,
                COUNT(DISTINCT visitor_hash) AS visitors
         FROM pageviews WHERE $where
         GROUP BY $bucketExpr ORDER BY day ASC"
    );
    $byDay->execute($whereParams);

    $topPages = db()->prepare(
        "SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors
         FROM pageviews WHERE $where
         GROUP BY path ORDER BY views DESC LIMIT 20"
    );
    $topPages->execute($whereParams);

    $referrers = db()->prepare(
        "SELECT referrer_host, COUNT(*) AS views
         FROM pageviews
         WHERE $where AND referrer_host <> ''
         GROUP BY referrer_host ORDER BY views DESC LIMIT 20"
    );
    $referrers->execute($whereParams);

    $devices = db()->prepare(
        "SELECT device, COUNT(*) AS views
         FROM pageviews WHERE $where
         GROUP BY device ORDER BY views DESC"
    );
    $devices->execute($whereParams);

    $direct = db()->prepare(
        "SELECT COUNT(*) FROM pageviews
         WHERE $where AND referrer_host = ''"
    );
    $direct->execute($whereParams);

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
