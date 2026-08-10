<?php
declare(strict_types=1);

/**
 * Serves the SPA shell with real <head> tags filled in per URL.
 *
 * Facebook, WhatsApp, LinkedIn and (for indexing purposes) most crawlers do not
 * execute JavaScript, so meta tags set by React are invisible to them. Sharing a
 * link produced no preview at all. This renders the same index.html but with the
 * title, description and Open Graph tags already in the markup.
 *
 * Falls back to the untouched shell if anything goes wrong: a broken preview is
 * survivable, a broken website is not.
 */

$shell = __DIR__ . '/index.html';
if (!is_file($shell)) {
    http_response_code(500);
    exit('Missing application shell.');
}
$html = (string) file_get_contents($shell);

try {
    require __DIR__ . '/api/lib/bootstrap.php';
    require __DIR__ . '/api/lib/schema.php';
    require __DIR__ . '/api/lib/analytics.php';
    migrate(); // no-op once the stored schema version matches

    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $path = '/' . trim($path, '/');
    $seg = array_values(array_filter(explode('/', trim($path, '/')), static fn($s) => $s !== ''));

    $settings = [];
    foreach (db()->query('SELECT `key`, `value` FROM settings')->fetchAll() as $r) {
        $settings[$r['key']] = (string) $r['value'];
    }

    $siteName = $settings['site_name'] ?? '';
    $title = $siteName;
    $description = ($settings['meta_description'] ?? '') ?: ($settings['footer_tagline'] ?? '');
    $image = ($settings['og_image_url'] ?? '')
        ?: (($settings['hero_poster_url'] ?? '') ?: ($settings['logo_url'] ?? ''));
    $type = 'website';

    // ---- resolve the specific page ----------------------------------------
    if (($seg[0] ?? '') === 'products' && isset($seg[1])) {
        $stmt = db()->prepare(
            "SELECT p.*, c.name AS cat FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE p.slug = ? AND p.status = 'published' LIMIT 1"
        );
        $stmt->execute([$seg[1]]);
        if ($row = $stmt->fetch()) {
            $title = $row['name'] . ($row['cat'] ? ' — ' . $row['cat'] : '');
            $description = $row['summary'] ?: $description;
            $img = product_image_url((int) $row['image_id']);
            $image = $img ?: $image;
            $type = 'product';
        }
    } elseif (($seg[0] ?? '') === 'journal' && isset($seg[1])) {
        $stmt = db()->prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published' LIMIT 1");
        $stmt->execute([$seg[1]]);
        if ($row = $stmt->fetch()) {
            $title = $row['title'];
            $description = $row['excerpt'] ?: $description;
            $img = product_image_url((int) $row['cover_id']);
            $image = $img ?: $image;
            $type = 'article';
        }
    } elseif (($seg[0] ?? '') === 'category' && isset($seg[1])) {
        $slug = $seg[2] ?? $seg[1];
        $stmt = db()->prepare('SELECT * FROM categories WHERE slug = ? LIMIT 1');
        $stmt->execute([$slug]);
        if ($row = $stmt->fetch()) {
            $title = $row['name'];
            $description = $row['summary'] ?: $description;
        }
    } else {
        $slug = $seg[0] ?? '';
        $stmt = $slug === ''
            ? db()->query("SELECT * FROM pages WHERE is_home = 1 AND status = 'published' LIMIT 1")
            : (static function (string $s) {
                $q = db()->prepare("SELECT * FROM pages WHERE slug = ? AND status = 'published' LIMIT 1");
                $q->execute([$s]);
                return $q;
            })($slug);
        if ($row = $stmt->fetch()) {
            $title = $row['meta_title'] ?: $row['title'];
            $description = $row['meta_description'] ?: $description;
        }
    }

    // $row was set (truthy) or reset to false (falsy) by whichever branch
    // above ran — the same lookup the client-side router relies on via
    // /:slug, so this is the actual "does this page exist" answer rather
    // than a guess. A scanner path that never matched a real product, post,
    // category or page never sets $row at all.
    record_pageview($path, (bool) $row);

    if ($siteName !== '' && stripos($title, $siteName) === false) {
        $title .= ' — ' . $siteName;
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $canonical = $scheme . '://' . $host . ($path === '/' ? '/' : $path);
    $imageAbs = $image !== '' && !preg_match('#^https?://#i', $image)
        ? $scheme . '://' . $host . '/' . ltrim($image, '/')
        : $image;

    $tags = [
        '<title>' . e($title) . '</title>',
        '<meta name="description" content="' . e($description) . '">',
        '<link rel="canonical" href="' . e($canonical) . '">',
        '<meta property="og:type" content="' . e($type) . '">',
        '<meta property="og:site_name" content="' . e($siteName) . '">',
        '<meta property="og:title" content="' . e($title) . '">',
        '<meta property="og:description" content="' . e($description) . '">',
        '<meta property="og:url" content="' . e($canonical) . '">',
        '<meta name="twitter:card" content="' . ($imageAbs ? 'summary_large_image' : 'summary') . '">',
    ];
    if ($imageAbs !== '') {
        $tags[] = '<meta property="og:image" content="' . e($imageAbs) . '">';
        $tags[] = '<meta name="twitter:image" content="' . e($imageAbs) . '">';
    }
    if (($settings['search_console_token'] ?? '') !== '') {
        $tags[] = '<meta name="google-site-verification" content="'
            . e($settings['search_console_token']) . '">';
    }
    if (($settings['ga_measurement_id'] ?? '') !== '') {
        $ga = e($settings['ga_measurement_id']);
        $tags[] = '<script async src="https://www.googletagmanager.com/gtag/js?id=' . $ga . '"></script>';
        $tags[] = '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}'
            . "gtag('js',new Date());gtag('config','$ga');</script>";
    }

    // Replace the build's placeholder title, then inject before </head>.
    $html = preg_replace('#<title>.*?</title>#is', '', $html, 1) ?? $html;
    $html = str_ireplace('</head>', implode("\n    ", $tags) . "\n  </head>", $html);
} catch (Throwable $e) {
    error_log('[chemi-render] ' . $e->getMessage());
    // fall through with the untouched shell
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
echo $html;

function e(string $v): string
{
    return htmlspecialchars(trim($v), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function product_image_url(int $mediaId): string
{
    if ($mediaId <= 0) {
        return '';
    }
    $stmt = db()->prepare('SELECT filename, external_url FROM media WHERE id = ? LIMIT 1');
    $stmt->execute([$mediaId]);
    $m = $stmt->fetch();
    if (!$m) {
        return '';
    }
    if (($m['external_url'] ?? '') !== '') {
        return $m['external_url'];
    }
    return ($m['filename'] ?? '') !== '' ? '/uploads/' . $m['filename'] : '';
}
