<?php
declare(strict_types=1);

/** XML sitemap built from whatever is currently published. */

require __DIR__ . '/api/lib/bootstrap.php';
require __DIR__ . '/api/lib/schema.php';

// A crawler may well be the first request after a deploy, before any API call
// has had a chance to create newly added tables.
migrate();

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$base = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '');

/** @var array<int, array{loc:string, lastmod:?string, priority:string}> $urls */
$urls = [];

$add = static function (string $loc, ?string $lastmod, string $priority) use (&$urls, $base): void {
    $urls[] = [
        'loc'      => $base . $loc,
        'lastmod'  => $lastmod ? date('Y-m-d', strtotime($lastmod)) : null,
        'priority' => $priority,
    ];
};

foreach (db()->query("SELECT slug, is_home, updated_at FROM pages WHERE status = 'published'")->fetchAll() as $p) {
    $add($p['is_home'] ? '/' : '/' . $p['slug'], $p['updated_at'], $p['is_home'] ? '1.0' : '0.8');
}

// Categories: parents at /category/slug, children nested under their parent.
$cats = db()->query('SELECT id, slug, parent_id FROM categories')->fetchAll();
$bySlug = [];
foreach ($cats as $c) {
    $bySlug[(int) $c['id']] = $c['slug'];
}
foreach ($cats as $c) {
    $loc = $c['parent_id'] === null
        ? '/category/' . $c['slug']
        : '/category/' . ($bySlug[(int) $c['parent_id']] ?? '') . '/' . $c['slug'];
    $add($loc, null, '0.7');
}

foreach (db()->query("SELECT slug, updated_at FROM products WHERE status = 'published'")->fetchAll() as $p) {
    $add('/products/' . $p['slug'], $p['updated_at'], '0.6');
}

foreach (db()->query("SELECT slug, updated_at FROM posts WHERE status = 'published'")->fetchAll() as $p) {
    $add('/journal/' . $p['slug'], $p['updated_at'], '0.5');
}

header('Content-Type: application/xml; charset=utf-8');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($urls as $u) {
    echo "  <url>\n";
    echo '    <loc>' . htmlspecialchars($u['loc'], ENT_XML1) . "</loc>\n";
    if ($u['lastmod']) {
        echo '    <lastmod>' . $u['lastmod'] . "</lastmod>\n";
    }
    echo '    <priority>' . $u['priority'] . "</priority>\n";
    echo "  </url>\n";
}
echo '</urlset>';
