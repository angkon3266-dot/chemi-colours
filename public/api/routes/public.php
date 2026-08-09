<?php
declare(strict_types=1);

/** Site-facing endpoints. No authentication, read-only except lead capture. */

function all_settings(): array
{
    $rows = db()->query('SELECT `key`, `value` FROM settings')->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $out[$r['key']] = $r['value'];
    }
    // Fields stored as JSON are decoded so the client gets real arrays.
    foreach (['form_services', 'footer_columns', 'footer_extra', 'nav_items'] as $jsonKey) {
        if (isset($out[$jsonKey])) {
            $decoded = json_decode((string) $out[$jsonKey], true);
            $out[$jsonKey] = is_array($decoded) ? $decoded : [];
        }
    }
    return $out;
}

function media_url(?array $m): string
{
    if (!$m) {
        return '';
    }
    if (($m['external_url'] ?? '') !== '') {
        return $m['external_url'];
    }
    return ($m['filename'] ?? '') !== '' ? '/uploads/' . $m['filename'] : '';
}

function media_map(array $ids): array
{
    $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
    if (!$ids) {
        return [];
    }
    $in = implode(',', array_fill(0, count($ids), '?'));
    $stmt = db()->prepare("SELECT * FROM media WHERE id IN ($in)");
    $stmt->execute($ids);
    $out = [];
    foreach ($stmt->fetchAll() as $m) {
        $out[(int) $m['id']] = $m;
    }
    return $out;
}

function shape_product(array $p, array $mediaById = []): array
{
    $galleryIds = decode_json_col($p['gallery'] ?? null);
    return [
        'id'          => (int) $p['id'],
        'slug'        => $p['slug'],
        'name'        => $p['name'],
        'categoryId'  => $p['category_id'] !== null ? (int) $p['category_id'] : null,
        'category'     => $p['category_name'] ?? '',
        'categorySlug' => $p['category_slug'] ?? '',
        'ciName'      => $p['ci_name'],
        'casNo'       => $p['cas_no'],
        'form'        => $p['form'] ?? '',
        'strength'    => $p['strength'] ?? '',
        'packaging'   => $p['packaging'] ?? '',
        'moq'         => $p['moq'] ?? '',
        'hsCode'      => $p['hs_code'] ?? '',
        'shelfLife'   => $p['shelf_life'] ?? '',
        'storage'     => $p['storage'] ?? '',
        'customSpecs' => decode_json_col($p['custom_specs'] ?? null),
        'fibres'      => decode_json_col($p['fibres'] ?? null),
        'summary'     => $p['summary'],
        'description' => $p['description'] ?? '',
        'application' => $p['application_notes'] ?? '',
        'image'       => media_url($mediaById[(int) ($p['image_id'] ?? 0)] ?? null),
        'gallery'     => array_values(array_filter(array_map(
            static fn($id) => media_url($mediaById[(int) $id] ?? null),
            $galleryIds
        ))),
        'specSheet'   => media_url($mediaById[(int) ($p['spec_sheet_id'] ?? 0)] ?? null),
        'featured'    => (bool) $p['featured'],
        'status'      => $p['status'],
    ];
}

/** One category row shaped for the client, including its image and counts. */
function shape_category(array $c): array
{
    $img = null;
    if (!empty($c['image_id'])) {
        $m = media_map([$c['image_id']]);
        $img = $m[(int) $c['image_id']] ?? null;
    }
    return [
        'id'           => (int) $c['id'],
        'slug'         => $c['slug'],
        'name'         => $c['name'],
        'summary'      => $c['summary'] ?? '',
        'description'  => $c['description'] ?? '',
        'parentId'     => isset($c['parent_id']) && $c['parent_id'] !== null ? (int) $c['parent_id'] : null,
        'image'        => media_url($img),
        'productCount' => (int) ($c['product_count'] ?? 0),
        'childCount'   => (int) ($c['child_count'] ?? 0),
    ];
}

function find_category(string $slug): ?array
{
    $stmt = db()->prepare('SELECT * FROM categories WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    return $stmt->fetch() ?: null;
}

/**
 * Product count for a category includes anything filed under its
 * sub-categories, so a main category never looks empty.
 */
const CATEGORY_COUNT_SQL = '(SELECT COUNT(*) FROM products p
      WHERE p.status = "published"
        AND (p.category_id = c.id
             OR p.category_id IN (SELECT c2.id FROM categories c2 WHERE c2.parent_id = c.id))
    ) AS product_count,
    (SELECT COUNT(*) FROM categories c3 WHERE c3.parent_id = c.id) AS child_count';

function category_tree(): array
{
    $rows = db()->query(
        'SELECT c.*, ' . CATEGORY_COUNT_SQL . '
         FROM categories c WHERE c.parent_id IS NULL
         ORDER BY c.sort_order ASC, c.name ASC'
    )->fetchAll();

    return array_map(static function ($row) {
        $cat = shape_category($row);
        $cat['children'] = array_map('shape_category', child_categories((int) $row['id']));
        return $cat;
    }, $rows);
}

function child_categories(int $parentId): array
{
    $stmt = db()->prepare(
        'SELECT c.*, ' . CATEGORY_COUNT_SQL . '
         FROM categories c WHERE c.parent_id = ?
         ORDER BY c.sort_order ASC, c.name ASC'
    );
    $stmt->execute([$parentId]);
    return $stmt->fetchAll();
}

function load_products(bool $publishedOnly = true, array $opts = []): array
{
    $where = [];
    $args = [];
    if ($publishedOnly) {
        $where[] = "p.status = 'published'";
    }
    if (!empty($opts['category'])) {
        $where[] = 'c.slug = ?';
        $args[] = $opts['category'];
    }
    if (!empty($opts['categories'])) {
        // Selecting a main category also brings in everything under it.
        $slugs = array_slice(array_values(array_filter($opts['categories'])), 0, 40);
        if ($slugs) {
            $in = implode(',', array_fill(0, count($slugs), '?'));
            $where[] = "(c.slug IN ($in) OR c.parent_id IN
                         (SELECT c4.id FROM categories c4 WHERE c4.slug IN ($in)))";
            array_push($args, ...$slugs, ...$slugs);
        }
    }
    if (!empty($opts['categoryId'])) {
        if (!empty($opts['includeChildren'])) {
            $where[] = '(p.category_id = ? OR p.category_id IN
                         (SELECT c2.id FROM categories c2 WHERE c2.parent_id = ?))';
            $args[] = $opts['categoryId'];
            $args[] = $opts['categoryId'];
        } else {
            $where[] = 'p.category_id = ?';
            $args[] = $opts['categoryId'];
        }
    }
    if (!empty($opts['featured'])) {
        $where[] = 'p.featured = 1';
    }
    if (!empty($opts['search'])) {
        $where[] = '(p.name LIKE ? OR p.ci_name LIKE ? OR p.summary LIKE ?)';
        $like = '%' . $opts['search'] . '%';
        array_push($args, $like, $like, $like);
    }
    $sql = 'SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
            LEFT JOIN categories c ON c.id = p.category_id';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY p.sort_order ASC, p.name ASC';
    if (!empty($opts['limit'])) {
        $sql .= ' LIMIT ' . max(1, min(200, (int) $opts['limit']));
    }
    $stmt = db()->prepare($sql);
    $stmt->execute($args);
    $rows = $stmt->fetchAll();

    $ids = [];
    foreach ($rows as $r) {
        $ids[] = $r['image_id'];
        $ids[] = $r['spec_sheet_id'];
        foreach (decode_json_col($r['gallery']) as $g) {
            $ids[] = $g;
        }
    }
    $mediaById = media_map($ids);

    return array_map(static fn($r) => shape_product($r, $mediaById), $rows);
}

/** Journal post shaped for the client. */
function shape_post(array $p, array $mediaById = []): array
{
    return [
        'id'          => (int) $p['id'],
        'slug'        => $p['slug'],
        'title'       => $p['title'],
        'excerpt'     => $p['excerpt'],
        'body'        => $p['body'] ?? '',
        'author'      => $p['author'],
        'cover'       => media_url($mediaById[(int) ($p['cover_id'] ?? 0)] ?? null),
        'publishedAt' => $p['published_at'],
        'status'      => $p['status'],
    ];
}

function load_posts(bool $publishedOnly = true, int $limit = 0): array
{
    $sql = 'SELECT * FROM posts';
    if ($publishedOnly) {
        $sql .= " WHERE status = 'published'";
    }
    $sql .= ' ORDER BY COALESCE(published_at, created_at) DESC';
    if ($limit > 0) {
        $sql .= ' LIMIT ' . min(100, $limit);
    }
    $rows = db()->query($sql)->fetchAll();
    $mediaById = media_map(array_column($rows, 'cover_id'));
    return array_map(static fn($r) => shape_post($r, $mediaById), $rows);
}

function load_page(string $slug): ?array
{
    $stmt = db()->prepare("SELECT * FROM pages WHERE slug = ? AND status = 'published' LIMIT 1");
    $stmt->execute([$slug]);
    $page = $stmt->fetch();
    if (!$page) {
        return null;
    }
    $bs = db()->prepare('SELECT * FROM blocks WHERE page_id = ? AND visible = 1 ORDER BY sort_order ASC');
    $bs->execute([$page['id']]);

    $blocks = [];
    foreach ($bs->fetchAll() as $b) {
        $blocks[] = [
            'id'   => (int) $b['id'],
            'type' => $b['type'],
            'data' => decode_json_col($b['data']),
        ];
    }

    return [
        'slug'            => $page['slug'],
        'title'           => $page['title'],
        'metaTitle'       => $page['meta_title'],
        'metaDescription' => $page['meta_description'],
        'blocks'          => $blocks,
    ];
}

function handle_public(string $method, array $seg): void
{
    $head = $seg[0] ?? '';

    // GET /api/bootstrap — everything the shell needs to render.
    if ($method === 'GET' && $head === 'bootstrap') {
        $nav = db()->query(
            "SELECT slug, nav_label, title, is_home FROM pages
             WHERE status = 'published' AND in_nav = 1 ORDER BY nav_order ASC"
        )->fetchAll();

        json_out([
            'settings' => all_settings(),
            'nav' => array_map(static fn($p) => [
                'label' => $p['nav_label'] !== '' ? $p['nav_label'] : $p['title'],
                'href'  => $p['is_home'] ? '/' : '/' . $p['slug'],
            ], $nav),
            'home' => load_page(home_slug()),
        ]);
    }

    if ($method === 'GET' && $head === 'page') {
        $slug = $seg[1] ?? '';
        $page = load_page($slug !== '' ? $slug : home_slug());
        if (!$page) {
            throw new ApiError('Page not found.', 404);
        }
        json_out($page);
    }

    if ($method === 'GET' && $head === 'products') {
        $opts = [
            'category' => $_GET['category'] ?? '',
            'search'   => $_GET['search'] ?? '',
            'limit'    => $_GET['limit'] ?? 0,
            'featured' => !empty($_GET['featured']),
            'categories' => array_filter(array_map('trim', explode(',', (string) ($_GET['categories'] ?? '')))),
        ];
        $rows = load_products(true, $opts);

        // A "featured" strip that nothing is flagged for would render as an
        // empty section on the home page. Fall back to the newest products so
        // the site always shows something real.
        if (!$rows && !empty($opts['featured']) && ($_GET['category'] ?? '') === '') {
            $opts['featured'] = false;
            $opts['limit'] = $opts['limit'] ?: 6;
            $rows = load_products(true, $opts);
        }

        json_out($rows);
    }

    if ($method === 'GET' && $head === 'product') {
        $slug = $seg[1] ?? '';
        $stmt = db()->prepare(
            "SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             WHERE p.slug = ? AND p.status = 'published' LIMIT 1"
        );
        $stmt->execute([$slug]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new ApiError('Product not found.', 404);
        }
        $ids = [$row['image_id'], $row['spec_sheet_id'], ...decode_json_col($row['gallery'])];
        json_out(shape_product($row, media_map($ids)));
    }

    if ($method === 'GET' && $head === 'posts') {
        json_out(load_posts(true, (int) ($_GET['limit'] ?? 0)));
    }

    if ($method === 'GET' && $head === 'post') {
        $stmt = db()->prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published' LIMIT 1");
        $stmt->execute([$seg[1] ?? '']);
        $row = $stmt->fetch();
        if (!$row) {
            throw new ApiError('Post not found.', 404);
        }
        json_out(shape_post($row, media_map([$row['cover_id']])));
    }

    if ($method === 'GET' && $head === 'menu') {
        $tree = category_tree();
        // A handful of products per category is plenty for a dropdown panel.
        foreach ($tree as &$cat) {
            $cat['products'] = array_map(
                static fn($p) => ['slug' => $p['slug'], 'name' => $p['name'], 'image' => $p['image']],
                load_products(true, ['categoryId' => $cat['id'], 'includeChildren' => true, 'limit' => 8])
            );
        }
        unset($cat);
        json_out($tree);
    }

    if ($method === 'GET' && $head === 'categories') {
        json_out(category_tree());
    }

    // GET /api/category/{slug}[/{subSlug}] — browse view for one category.
    if ($method === 'GET' && $head === 'category') {
        $slug = $seg[1] ?? '';
        $subSlug = $seg[2] ?? '';

        $cat = find_category($slug);
        if (!$cat) {
            throw new ApiError('Category not found.', 404);
        }

        $sub = null;
        if ($subSlug !== '') {
            $sub = find_category($subSlug);
            if (!$sub || (int) $sub['parent_id'] !== (int) $cat['id']) {
                throw new ApiError('Sub-category not found.', 404);
            }
        }

        $children = $sub ? [] : child_categories((int) $cat['id']);

        // Landing on a main category with sub-categories shows those; otherwise
        // (or once a sub-category is chosen) it shows products.
        $target = $sub ?: $cat;
        $products = load_products(true, ['categoryId' => (int) $target['id'], 'includeChildren' => !$sub]);

        json_out([
            'category'    => shape_category($cat),
            'subcategory' => $sub ? shape_category($sub) : null,
            'children'    => array_map('shape_category', $children),
            'products'    => $products,
        ]);
    }

    // POST /api/leads — the public contact form.
    if ($method === 'POST' && $head === 'leads') {
        $b = body();

        // Honeypot: real users never fill this hidden field.
        if (field($b, 'website') !== '') {
            json_out(['ok' => true]);
        }

        $email = field($b, 'email', true);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiError('Please enter a valid email address.', 422);
        }
        $services = $b['services'] ?? [];
        if (!is_array($services)) {
            $services = [];
        }
        $services = array_slice(array_map(static fn($s) => plain((string) $s, 80), $services), 0, 20);

        $stmt = db()->prepare(
            'INSERT INTO leads (name, email, phone, company, message, services, ip, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            plain(field($b, 'name'), 200),
            mb_substr($email, 0, 200),
            plain(field($b, 'phone'), 40),
            plain(field($b, 'company'), 200),
            plain(field($b, 'message'), 5000),
            json_col($services),
            client_ip(),
            mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 400),
        ]);

        notify_lead_by_email(
            $email,
            plain(field($b, 'name'), 200),
            plain(field($b, 'message'), 5000),
            plain(field($b, 'phone'), 40)
        );
        json_out(['ok' => true], 201);
    }
}

function home_slug(): string
{
    $s = db()->query("SELECT slug FROM pages WHERE is_home = 1 AND status = 'published' LIMIT 1")
        ->fetchColumn();
    return is_string($s) && $s !== '' ? $s : 'home';
}

/** Best-effort notification; a mail failure must never break the form. */
function notify_lead_by_email(string $fromEmail, string $name, string $message, string $phone = ''): void
{
    $to = (string) (db()->query("SELECT `value` FROM settings WHERE `key` = 'contact_email'")
        ->fetchColumn() ?: '');
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return;
    }
    $subject = 'New enquiry from ' . ($name !== '' ? $name : 'the website');
    $bodyText = "Name: $name\nEmail: $fromEmail\n"
        . ($phone !== '' ? "Phone: $phone\n" : '')
        . "\n$message\n";
    $headers = 'From: no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . "\r\n"
        . 'Reply-To: ' . $fromEmail . "\r\n"
        . 'Content-Type: text/plain; charset=utf-8';
    try {
        @mail($to, $subject, $bodyText, $headers);
    } catch (Throwable) {
        // Ignore: the lead is already stored in the database.
    }
}
