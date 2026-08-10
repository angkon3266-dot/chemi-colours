<?php
declare(strict_types=1);

/** Admin CRUD. Every route requires a session; every write requires CSRF. */

const SETTING_KEYS = [
    'site_name', 'logo_text', 'logo_url', 'tagline',
    'hero_video_url', 'hero_poster_url',
    'contact_email', 'contact_phone', 'address',
    'whatsapp_number', 'whatsapp_message', 'call_number',
    'cta_label', 'cta_href',
    'footer_tagline', 'footer_note', 'footer_columns',
    'footer_address', 'footer_extra',
    'nav_items', 'nav_bg_color', 'nav_text_color', 'nav_align', 'footer_map_url',
    'ga_measurement_id', 'search_console_token', 'og_image_url', 'meta_description',
    'related_count', 'category_grid_columns',
    'social_twitter', 'social_facebook', 'social_instagram', 'social_linkedin',
    'form_services', 'form_heading', 'form_intro',
    'form_success_title', 'form_success_text',
    // Appearance. The preset names a built-in palette; the four colour keys
    // override individual slots and are blank unless the owner set them.
    'palette_preset', 'palette_primary', 'palette_accent', 'palette_page', 'palette_body',
];

const JSON_SETTING_KEYS = ['form_services', 'footer_columns', 'footer_extra', 'nav_items'];

const BLOCK_TYPES = [
    'hero', 'pagehero', 'richtext', 'features', 'stats', 'timeline',
    'product_grid', 'gallery', 'cta', 'contact', 'faq', 'logos',
    'category_grid', 'parallax', 'director', 'map', 'testimonials', 'posts',
    'carousel', 'intro', 'cards',
];

function handle_admin(string $method, array $seg): void
{
    require_admin();
    if ($method !== 'GET') {
        require_csrf();
    }

    $head = $seg[0] ?? '';
    $rest = array_slice($seg, 1);

    match ($head) {
        'overview'   => admin_overview(),
        'pages'      => admin_pages($method, $rest),
        'products'   => admin_products($method, $rest),
        'categories' => admin_categories($method, $rest),
        'media'      => admin_media($method, $rest),
        'settings'   => admin_settings($method),
        'leads'      => admin_leads($method, $rest),
        'posts'      => admin_posts($method, $rest),
        'users'      => admin_users($method, $rest),
        'analytics'  => admin_analytics($method),
        'optimise'   => admin_optimise($method),
        default      => throw new ApiError('Unknown admin endpoint.', 404),
    };
}

// ---------------------------------------------------------------- overview --
function admin_overview(): void
{
    json_out([
        'products'  => (int) db()->query('SELECT COUNT(*) FROM products')->fetchColumn(),
        'pages'     => (int) db()->query('SELECT COUNT(*) FROM pages')->fetchColumn(),
        'media'     => (int) db()->query('SELECT COUNT(*) FROM media')->fetchColumn(),
        'newLeads'  => (int) db()->query("SELECT COUNT(*) FROM leads WHERE status = 'new'")->fetchColumn(),
        'leads'     => (int) db()->query('SELECT COUNT(*) FROM leads')->fetchColumn(),
    ]);
}

// ------------------------------------------------------------------- pages --
function admin_pages(string $method, array $seg): void
{
    $id = isset($seg[0]) && ctype_digit($seg[0]) ? (int) $seg[0] : 0;
    $sub = $seg[1] ?? '';

    if ($method === 'GET' && !$id) {
        json_out(db()->query(
            'SELECT id, slug, title, nav_label, nav_order, in_nav, is_home, status,
                    meta_title, meta_description, updated_at
             FROM pages ORDER BY nav_order ASC, id ASC'
        )->fetchAll());
    }

    if ($method === 'GET' && $id) {
        $stmt = db()->prepare('SELECT * FROM pages WHERE id = ?');
        $stmt->execute([$id]);
        $page = $stmt->fetch();
        if (!$page) {
            throw new ApiError('Page not found.', 404);
        }
        $bs = db()->prepare('SELECT * FROM blocks WHERE page_id = ? ORDER BY sort_order ASC');
        $bs->execute([$id]);
        $page['blocks'] = array_map(static fn($b) => [
            'id'      => (int) $b['id'],
            'type'    => $b['type'],
            'visible' => (bool) $b['visible'],
            'data'    => decode_json_col($b['data']),
        ], $bs->fetchAll());
        json_out($page);
    }

    if ($method === 'POST' && !$id) {
        $b = body();
        $title = plain(field($b, 'title', true), 200);
        $slug = unique_slug('pages', slugify(field($b, 'slug') ?: $title, 'page'));
        $stmt = db()->prepare(
            'INSERT INTO pages (slug, title, nav_label, nav_order, in_nav, status, meta_title, meta_description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $slug,
            $title,
            plain(field($b, 'nav_label'), 100),
            int_field($b, 'nav_order'),
            bool_field($b, 'in_nav', true) ? 1 : 0,
            field($b, 'status') === 'published' ? 'published' : 'draft',
            plain(field($b, 'meta_title'), 200),
            plain(field($b, 'meta_description'), 300),
        ]);
        json_out(['id' => (int) db()->lastInsertId(), 'slug' => $slug], 201);
    }

    if ($method === 'PUT' && $id && $sub === 'blocks') {
        save_blocks($id, body()['blocks'] ?? []);
        json_out(['ok' => true]);
    }

    if ($method === 'PUT' && $id) {
        $b = body();
        $existing = db()->prepare('SELECT * FROM pages WHERE id = ?');
        $existing->execute([$id]);
        $page = $existing->fetch();
        if (!$page) {
            throw new ApiError('Page not found.', 404);
        }
        $title = plain(field($b, 'title', true), 200);
        $slug = unique_slug('pages', slugify(field($b, 'slug') ?: $title, 'page'), $id);

        $stmt = db()->prepare(
            'UPDATE pages SET slug = ?, title = ?, nav_label = ?, nav_order = ?, in_nav = ?,
                    status = ?, meta_title = ?, meta_description = ? WHERE id = ?'
        );
        $stmt->execute([
            $slug,
            $title,
            plain(field($b, 'nav_label'), 100),
            int_field($b, 'nav_order'),
            bool_field($b, 'in_nav', true) ? 1 : 0,
            field($b, 'status') === 'published' ? 'published' : 'draft',
            plain(field($b, 'meta_title'), 200),
            plain(field($b, 'meta_description'), 300),
            $id,
        ]);

        if (array_key_exists('blocks', $b)) {
            save_blocks($id, $b['blocks']);
        }
        json_out(['ok' => true, 'slug' => $slug]);
    }

    if ($method === 'DELETE' && $id) {
        $isHome = (int) db()->query("SELECT is_home FROM pages WHERE id = $id")->fetchColumn();
        if ($isHome === 1) {
            throw new ApiError('The home page cannot be deleted.', 409);
        }
        db()->prepare('DELETE FROM pages WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    throw new ApiError('Unknown pages endpoint.', 404);
}

function save_blocks(int $pageId, mixed $blocks): void
{
    if (!is_array($blocks)) {
        throw new ApiError('blocks must be an array.', 422);
    }
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM blocks WHERE page_id = ?')->execute([$pageId]);
        $ins = $pdo->prepare(
            'INSERT INTO blocks (page_id, type, sort_order, visible, data) VALUES (?, ?, ?, ?, ?)'
        );
        foreach (array_values($blocks) as $i => $blk) {
            if (!is_array($blk)) {
                continue;
            }
            $type = (string) ($blk['type'] ?? '');
            if (!in_array($type, BLOCK_TYPES, true)) {
                throw new ApiError("Unknown block type \"$type\".", 422);
            }
            $ins->execute([
                $pageId,
                $type,
                $i,
                !empty($blk['visible']) ? 1 : 0,
                json_col(sanitize_block_data($blk['data'] ?? [])),
            ]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/** Rich-text (`html`) keys get whitelist-sanitised; everything else is de-tagged. */
function sanitize_block_data(mixed $data): mixed
{
    if (is_string($data)) {
        return trim(strip_tags($data));
    }
    if (!is_array($data)) {
        return $data;
    }
    $out = [];
    foreach ($data as $k => $v) {
        if ($k === 'html' && is_string($v)) {
            $out[$k] = sanitize_html($v);
        } elseif ($k === 'mapUrl' && is_string($v)) {
            // Google hands out a whole <iframe>; keep the src rather than
            // letting strip_tags() discard the URL along with the tag.
            $out[$k] = extract_map_url($v);
        } else {
            $out[$k] = sanitize_block_data($v);
        }
    }
    return $out;
}

// ---------------------------------------------------------------- products --
function admin_shape_product(array $p): array
{
    return [
        'id'          => (int) $p['id'],
        'slug'        => $p['slug'],
        'name'        => $p['name'],
        'categoryId'  => $p['category_id'] !== null ? (int) $p['category_id'] : null,
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
        'fibres'      => decode_json_col($p['fibres']),
        'summary'     => $p['summary'],
        'description' => $p['description'] ?? '',
        'application' => $p['application_notes'] ?? '',
        'imageId'     => $p['image_id'] !== null ? (int) $p['image_id'] : null,
        'galleryIds'  => array_map('intval', decode_json_col($p['gallery'])),
        'specSheetId' => $p['spec_sheet_id'] !== null ? (int) $p['spec_sheet_id'] : null,
        'status'      => $p['status'],
        'featured'    => (bool) $p['featured'],
        'sortOrder'   => (int) $p['sort_order'],
    ];
}

function product_columns(array $b): array
{
    $fibres = is_array($b['fibres'] ?? null) ? $b['fibres'] : [];
    $gallery = is_array($b['galleryIds'] ?? null) ? array_map('intval', $b['galleryIds']) : [];
    // Owner-defined spec rows: [{label, value}, ...]
    $custom = [];
    foreach (is_array($b['customSpecs'] ?? null) ? $b['customSpecs'] : [] as $row) {
        if (!is_array($row)) {
            continue;
        }
        $label = plain((string) ($row['label'] ?? ''), 80);
        $value = plain((string) ($row['value'] ?? ''), 300);
        if ($label !== '' || $value !== '') {
            $custom[] = ['label' => $label, 'value' => $value];
        }
    }
    $custom = array_slice($custom, 0, 30);
    return [
        plain(field($b, 'name', true), 200),
        ($cid = int_field($b, 'categoryId')) > 0 ? $cid : null,
        plain(field($b, 'ciName'), 120),
        plain(field($b, 'casNo'), 60),
        plain(field($b, 'form'), 80),
        plain(field($b, 'strength'), 80),
        plain(field($b, 'packaging'), 160),
        plain(field($b, 'moq'), 80),
        plain(field($b, 'hsCode'), 40),
        plain(field($b, 'shelfLife'), 80),
        plain(field($b, 'storage'), 300),
        json_col($custom),
        json_col(array_slice(array_map(static fn($f) => plain((string) $f, 60), $fibres), 0, 30)),
        plain(field($b, 'summary'), 400),
        sanitize_html((string) ($b['description'] ?? '')),
        sanitize_html((string) ($b['application'] ?? '')),
        ($iid = int_field($b, 'imageId')) > 0 ? $iid : null,
        json_col($gallery),
        ($sid = int_field($b, 'specSheetId')) > 0 ? $sid : null,
        field($b, 'status') === 'draft' ? 'draft' : 'published',
        bool_field($b, 'featured') ? 1 : 0,
        int_field($b, 'sortOrder'),
    ];
}

function admin_products(string $method, array $seg): void
{
    $id = isset($seg[0]) && ctype_digit($seg[0]) ? (int) $seg[0] : 0;

    if ($method === 'GET' && !$id) {
        $rows = db()->query('SELECT * FROM products ORDER BY sort_order ASC, name ASC')->fetchAll();
        json_out(array_map('admin_shape_product', $rows));
    }

    if ($method === 'GET' && $id) {
        $stmt = db()->prepare('SELECT * FROM products WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new ApiError('Product not found.', 404);
        }
        json_out(admin_shape_product($row));
    }

    if ($method === 'POST' && !$id) {
        $b = body();
        $cols = product_columns($b);
        $slug = unique_slug('products', slugify(field($b, 'slug') ?: $cols[0], 'product'));
        $stmt = db()->prepare(
            'INSERT INTO products (name, category_id, ci_name, cas_no, form, strength,
                packaging, moq, hs_code, shelf_life, storage, custom_specs, fibres, summary,
                description, application_notes, image_id, gallery, spec_sheet_id, status,
                featured, sort_order, slug)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([...$cols, $slug]);
        json_out(['id' => (int) db()->lastInsertId(), 'slug' => $slug], 201);
    }

    if ($method === 'PUT' && $id) {
        $b = body();
        $cols = product_columns($b);
        $slug = unique_slug('products', slugify(field($b, 'slug') ?: $cols[0], 'product'), $id);
        $stmt = db()->prepare(
            'UPDATE products SET name=?, category_id=?, ci_name=?, cas_no=?, form=?, strength=?,
                packaging=?, moq=?, hs_code=?, shelf_life=?, storage=?, custom_specs=?, fibres=?,
                summary=?, description=?, application_notes=?, image_id=?, gallery=?,
                spec_sheet_id=?, status=?, featured=?, sort_order=?, slug=? WHERE id=?'
        );
        $stmt->execute([...$cols, $slug, $id]);
        json_out(['ok' => true, 'slug' => $slug]);
    }

    if ($method === 'DELETE' && $id) {
        db()->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    throw new ApiError('Unknown products endpoint.', 404);
}

// -------------------------------------------------------------- categories --
function admin_categories(string $method, array $seg): void
{
    $id = isset($seg[0]) && ctype_digit($seg[0]) ? (int) $seg[0] : 0;

    if ($method === 'GET') {
        $rows = db()->query(
            'SELECT * FROM categories ORDER BY COALESCE(parent_id, id), parent_id IS NOT NULL, sort_order ASC, name ASC'
        )->fetchAll();

        // PDO hands back every column as a string; the client matches children
        // to parents by id, so these must be real numbers or nothing lines up.
        json_out(array_map(static fn($c) => [
            'id'          => (int) $c['id'],
            'slug'        => $c['slug'],
            'name'        => $c['name'],
            'summary'     => $c['summary'] ?? '',
            'description' => $c['description'] ?? '',
            'parent_id'   => $c['parent_id'] !== null ? (int) $c['parent_id'] : null,
            'image_id'    => $c['image_id'] !== null ? (int) $c['image_id'] : null,
            'sort_order'  => (int) $c['sort_order'],
        ], $rows));
    }

    if ($method === 'POST') {
        $b = body();
        $name = plain(field($b, 'name', true), 150);
        $slug = unique_slug('categories', slugify($name, 'category'));
        $stmt = db()->prepare(
            'INSERT INTO categories (slug, name, description, summary, sort_order, parent_id, image_id)
             VALUES (?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $slug,
            $name,
            plain(field($b, 'description'), 1000),
            plain(field($b, 'summary'), 400),
            int_field($b, 'sort_order'),
            valid_parent($b, 0),
            ($iid = int_field($b, 'image_id')) > 0 ? $iid : null,
        ]);
        json_out(['id' => (int) db()->lastInsertId()], 201);
    }

    if ($method === 'PUT' && $id) {
        $b = body();
        $name = plain(field($b, 'name', true), 150);
        $slug = unique_slug('categories', slugify(field($b, 'slug') ?: $name, 'category'), $id);
        $stmt = db()->prepare(
            'UPDATE categories SET slug=?, name=?, description=?, summary=?, sort_order=?,
                    parent_id=?, image_id=? WHERE id=?'
        );
        $stmt->execute([
            $slug,
            $name,
            plain(field($b, 'description'), 1000),
            plain(field($b, 'summary'), 400),
            int_field($b, 'sort_order'),
            valid_parent($b, $id),
            ($iid = int_field($b, 'image_id')) > 0 ? $iid : null,
            $id,
        ]);
        json_out(['ok' => true]);
    }

    if ($method === 'DELETE' && $id) {
        // Products keep existing but become uncategorised; sub-categories are
        // promoted to top level rather than silently disappearing.
        db()->prepare('UPDATE products SET category_id = NULL WHERE category_id = ?')->execute([$id]);
        db()->prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?')->execute([$id]);
        db()->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    throw new ApiError('Unknown categories endpoint.', 404);
}

/**
 * Validates a requested parent category. The tree is deliberately two levels
 * deep, so a parent must itself be top-level, and a category that already has
 * children cannot be demoted into one.
 */
function valid_parent(array $b, int $selfId): ?int
{
    $parentId = int_field($b, 'parent_id');
    if ($parentId <= 0) {
        return null;
    }
    if ($selfId > 0 && $parentId === $selfId) {
        throw new ApiError('A category cannot be its own parent.', 422);
    }

    $stmt = db()->prepare('SELECT parent_id FROM categories WHERE id = ? LIMIT 1');
    $stmt->execute([$parentId]);
    $row = $stmt->fetch();
    if (!$row) {
        throw new ApiError('That parent category does not exist.', 422);
    }
    if ($row['parent_id'] !== null) {
        throw new ApiError('Categories can only be nested one level deep.', 422);
    }

    if ($selfId > 0) {
        $kids = db()->prepare('SELECT COUNT(*) FROM categories WHERE parent_id = ?');
        $kids->execute([$selfId]);
        if ((int) $kids->fetchColumn() > 0) {
            throw new ApiError('This category has sub-categories, so it cannot become one itself.', 422);
        }
    }

    return $parentId;
}

// ------------------------------------------------------------------- media --
const UPLOAD_RULES = [
    'jpg'  => ['image/jpeg', 'image', 10],
    'jpeg' => ['image/jpeg', 'image', 10],
    'png'  => ['image/png', 'image', 10],
    'webp' => ['image/webp', 'image', 10],
    'gif'  => ['image/gif', 'image', 10],
    'avif' => ['image/avif', 'image', 10],
    'mp4'  => ['video/mp4', 'video', 100],
    'webm' => ['video/webm', 'video', 100],
    'mov'  => ['video/quicktime', 'video', 100],
    'pdf'  => ['application/pdf', 'doc', 20],
];

function admin_media(string $method, array $seg): void
{
    global $CONFIG;
    $action = $seg[0] ?? '';
    $id = ctype_digit((string) $action) ? (int) $action : 0;

    if ($method === 'GET') {
        $kind = $_GET['kind'] ?? '';
        $sql = 'SELECT * FROM media';
        $args = [];
        if (in_array($kind, ['image', 'video', 'doc'], true)) {
            $sql .= ' WHERE kind = ?';
            $args[] = $kind;
        }
        $sql .= ' ORDER BY created_at DESC LIMIT 500';
        $stmt = db()->prepare($sql);
        $stmt->execute($args);
        json_out(array_map(static fn($m) => [
            'id'       => (int) $m['id'],
            'kind'     => $m['kind'],
            'url'      => media_url($m),
            'name'     => $m['original_name'] !== '' ? $m['original_name'] : $m['filename'],
            'mime'     => $m['mime'],
            'size'     => (int) $m['size_bytes'],
            'external' => $m['external_url'] !== '',
            'alt'      => $m['alt'],
        ], $stmt->fetchAll()));
    }

    // Register an off-site asset (CloudFront, CDN, etc.) without uploading.
    if ($method === 'POST' && $action === 'link') {
        $b = body();
        $url = field($b, 'url', true);
        if (!preg_match('#^https?://#i', $url)) {
            throw new ApiError('Enter a full http(s) URL.', 422);
        }
        $kind = in_array(field($b, 'kind'), ['image', 'video', 'doc'], true) ? field($b, 'kind') : 'image';
        $stmt = db()->prepare(
            'INSERT INTO media (kind, external_url, original_name, alt) VALUES (?,?,?,?)'
        );
        $stmt->execute([$kind, mb_substr($url, 0, 1000), plain(field($b, 'name'), 255), plain(field($b, 'alt'), 300)]);
        json_out(['id' => (int) db()->lastInsertId()], 201);
    }

    if ($method === 'POST' && $action === 'upload') {
        $file = $_FILES['file'] ?? null;
        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new ApiError(upload_error_text((int) ($file['error'] ?? UPLOAD_ERR_NO_FILE)), 422);
        }

        $orig = (string) $file['name'];
        $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
        if (!isset(UPLOAD_RULES[$ext])) {
            throw new ApiError('Unsupported file type: .' . $ext, 422);
        }
        [$expectedMime, $kind, $maxMb] = UPLOAD_RULES[$ext];

        if ($file['size'] > $maxMb * 1024 * 1024) {
            throw new ApiError("File is larger than {$maxMb} MB.", 422);
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $realMime = (string) $finfo->file($file['tmp_name']);
        // quicktime/mp4 containers are reported inconsistently, so allow the family.
        $family = explode('/', $expectedMime)[0];
        if ($realMime !== $expectedMime && !str_starts_with($realMime, $family . '/')) {
            throw new ApiError('File contents do not match its extension.', 422);
        }

        $dir = $CONFIG['uploads_dir'];
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new ApiError('Upload directory is not writable.', 500);
        }
        harden_uploads_dir($dir);

        $safe = slugify(pathinfo($orig, PATHINFO_FILENAME), 'file');
        $filename = bin2hex(random_bytes(6)) . '-' . substr($safe, 0, 60) . '.' . $ext;

        if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $filename)) {
            throw new ApiError('Could not save the uploaded file.', 500);
        }
        @chmod($dir . '/' . $filename, 0644);

        // Photographs are stored as WebP: markedly smaller for the same quality,
        // which is what a buyer on a phone actually feels. The original stays on
        // disk untouched in case it is ever needed again.
        if ($kind === 'image') {
            require_once __DIR__ . '/../lib/images.php';
            $webp = convert_to_webp($dir, $filename);
            if ($webp !== null) {
                $filename = $webp;
                $realMime = 'image/webp';
                $file['size'] = filesize($dir . '/' . $webp);
            }
        }

        $stmt = db()->prepare(
            'INSERT INTO media (kind, filename, original_name, mime, size_bytes, alt) VALUES (?,?,?,?,?,?)'
        );
        $stmt->execute([$kind, $filename, mb_substr($orig, 0, 255), $realMime, (int) $file['size'], '']);

        json_out([
            'id'   => (int) db()->lastInsertId(),
            'url'  => '/uploads/' . $filename,
            'kind' => $kind,
        ], 201);
    }

    if ($method === 'DELETE' && $id) {
        $stmt = db()->prepare('SELECT * FROM media WHERE id = ?');
        $stmt->execute([$id]);
        $m = $stmt->fetch();
        if ($m && $m['filename'] !== '') {
            $p = $CONFIG['uploads_dir'] . '/' . basename($m['filename']);
            if (is_file($p)) {
                @unlink($p);
            }
        }
        db()->prepare('DELETE FROM media WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    throw new ApiError('Unknown media endpoint.', 404);
}

/** Belt-and-braces: uploads must never be executed as code. */
function harden_uploads_dir(string $dir): void
{
    $ht = $dir . '/.htaccess';
    if (is_file($ht)) {
        return;
    }
    @file_put_contents($ht, <<<'HTA'
    php_flag engine off
    <FilesMatch "\.(php|phtml|php[0-9]|phar|pl|py|cgi|sh|htaccess)$">
      Require all denied
    </FilesMatch>
    HTA);
}

function upload_error_text(int $code): string
{
    return match ($code) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'The file is too large for the server to accept.',
        UPLOAD_ERR_PARTIAL   => 'The upload was interrupted. Please try again.',
        UPLOAD_ERR_NO_FILE   => 'No file was received.',
        UPLOAD_ERR_NO_TMP_DIR, UPLOAD_ERR_CANT_WRITE => 'The server could not write the file.',
        default              => 'Upload failed.',
    };
}

// ---------------------------------------------------------------- settings --
function admin_settings(string $method): void
{
    if ($method === 'GET') {
        json_out(all_settings());
    }

    if ($method === 'PUT') {
        $b = body();
        $stmt = db()->prepare(
            'INSERT INTO settings (`key`, `value`) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)'
        );
        foreach ($b as $key => $value) {
            if (!in_array($key, SETTING_KEYS, true)) {
                continue;
            }
            if (in_array($key, JSON_SETTING_KEYS, true)) {
                $stmt->execute([$key, json_col(is_array($value) ? $value : [])]);
            } elseif ($key === 'footer_map_url') {
                $stmt->execute([$key, extract_map_url((string) $value)]);
            } else {
                $stmt->execute([$key, plain((string) $value, 2000)]);
            }
        }
        json_out(['ok' => true]);
    }

    throw new ApiError('Unknown settings endpoint.', 404);
}

// ------------------------------------------------------------------- leads --
function admin_leads(string $method, array $seg): void
{
    $id = isset($seg[0]) && ctype_digit($seg[0]) ? (int) $seg[0] : 0;

    if ($method === 'GET') {
        $rows = db()->query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 500')->fetchAll();
        json_out(array_map(static fn($l) => [
            'id'        => (int) $l['id'],
            'name'      => $l['name'],
            'email'     => $l['email'],
            'phone'     => $l['phone'] ?? '',
            'company'   => $l['company'],
            'message'   => $l['message'],
            'services'  => decode_json_col($l['services']),
            'status'    => $l['status'],
            'createdAt' => $l['created_at'],
        ], $rows));
    }

    if ($method === 'PATCH' && $id) {
        $status = field(body(), 'status', true);
        if (!in_array($status, ['new', 'read', 'archived'], true)) {
            throw new ApiError('Invalid status.', 422);
        }
        db()->prepare('UPDATE leads SET status = ? WHERE id = ?')->execute([$status, $id]);
        json_out(['ok' => true]);
    }

    if ($method === 'DELETE' && $id) {
        db()->prepare('DELETE FROM leads WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    throw new ApiError('Unknown leads endpoint.', 404);
}

// ------------------------------------------------------------------- posts --
function admin_posts(string $method, array $seg): void
{
    $id = isset($seg[0]) && ctype_digit($seg[0]) ? (int) $seg[0] : 0;

    if ($method === 'GET' && !$id) {
        json_out(load_posts(false));
    }

    if ($method === 'GET' && $id) {
        $stmt = db()->prepare('SELECT * FROM posts WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new ApiError('Post not found.', 404);
        }
        $post = shape_post($row, media_map([$row['cover_id']]));
        $post['coverId'] = $row['cover_id'] !== null ? (int) $row['cover_id'] : null;
        json_out($post);
    }

    if ($method === 'POST' && !$id) {
        $b = body();
        $title = plain(field($b, 'title', true), 250);
        $slug = unique_slug('posts', slugify(field($b, 'slug') ?: $title, 'post'));
        $slug = $slug === '' ? 'post' : $slug;
        $stmt = db()->prepare(
            'INSERT INTO posts (slug, title, excerpt, body, cover_id, author, status, published_at)
             VALUES (?,?,?,?,?,?,?,?)'
        );
        // post_columns returns [title, excerpt, body, cover, author, status, published_at] —
        // slug leads the column list, so it must lead the bound values too.
        $stmt->execute([$slug, ...post_columns($b, $title)]);
        json_out(['id' => (int) db()->lastInsertId(), 'slug' => $slug], 201);
    }

    if ($method === 'PUT' && $id) {
        $b = body();
        $title = plain(field($b, 'title', true), 250);
        $slug = unique_slug('posts', slugify(field($b, 'slug') ?: $title, 'post'), $id);
        $stmt = db()->prepare(
            'UPDATE posts SET excerpt=?, body=?, cover_id=?, author=?, status=?, published_at=?,
                    title=?, slug=? WHERE id=?'
        );
        $cols = post_columns($b, $title);
        // post_columns returns [title, excerpt, body, cover, author, status, published_at]
        $stmt->execute([
            $cols[1], $cols[2], $cols[3], $cols[4], $cols[5], $cols[6], $cols[0], $slug, $id,
        ]);
        json_out(['ok' => true, 'slug' => $slug]);
    }

    if ($method === 'DELETE' && $id) {
        db()->prepare('DELETE FROM posts WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    throw new ApiError('Unknown posts endpoint.', 404);
}

/** @return array{0:string,1:string,2:string,3:?int,4:string,5:string,6:?string} */
function post_columns(array $b, string $title): array
{
    $status = field($b, 'status') === 'published' ? 'published' : 'draft';
    $published = field($b, 'publishedAt');
    if ($status === 'published' && $published === '') {
        $published = date('Y-m-d H:i:s');
    }
    return [
        $title,
        plain(field($b, 'excerpt'), 500),
        sanitize_html((string) ($b['body'] ?? '')),
        ($cid = int_field($b, 'coverId')) > 0 ? $cid : null,
        plain(field($b, 'author'), 120),
        $status,
        $published !== '' ? $published : null,
    ];
}

// ------------------------------------------------------------------- users --
function admin_users(string $method, array $seg): void
{
    $id = isset($seg[0]) && ctype_digit($seg[0]) ? (int) $seg[0] : 0;
    $me = current_user();

    if ($method === 'GET') {
        json_out(array_map(static fn($u) => [
            'id'          => (int) $u['id'],
            'email'       => $u['email'],
            'name'        => $u['name'],
            'lastLoginAt' => $u['last_login_at'],
            'createdAt'   => $u['created_at'],
            'isYou'       => (int) $u['id'] === (int) ($me['id'] ?? 0),
        ], db()->query('SELECT * FROM users ORDER BY created_at ASC')->fetchAll()));
    }

    if ($method === 'POST') {
        $b = body();
        $email = field($b, 'email', true);
        $password = field($b, 'password', true);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiError('Enter a valid email address.', 422);
        }
        if (strlen($password) < 10) {
            throw new ApiError('Password must be at least 10 characters.', 422);
        }
        $exists = db()->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $exists->execute([$email]);
        if ($exists->fetch()) {
            throw new ApiError('That email address is already in use.', 409);
        }
        db()->prepare('INSERT INTO users (email, password_hash, name) VALUES (?,?,?)')
            ->execute([$email, password_hash($password, PASSWORD_DEFAULT), plain(field($b, 'name'), 120)]);
        json_out(['id' => (int) db()->lastInsertId()], 201);
    }

    if ($method === 'DELETE' && $id) {
        // Never let an account remove itself, and never leave the site locked out.
        if ($id === (int) ($me['id'] ?? 0)) {
            throw new ApiError('You cannot remove your own account.', 409);
        }
        if (user_count() <= 1) {
            throw new ApiError('There must be at least one administrator.', 409);
        }
        db()->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    throw new ApiError('Unknown users endpoint.', 404);
}

// --------------------------------------------------------------- analytics --
function admin_analytics(string $method): void
{
    if ($method !== 'GET') {
        throw new ApiError('Unknown analytics endpoint.', 404);
    }
    require_once __DIR__ . '/../lib/analytics.php';
    json_out(analytics_summary((int) ($_GET['days'] ?? 30)));
}

// ------------------------------------------------------- image optimisation --
function admin_optimise(string $method): void
{
    global $CONFIG;
    if ($method !== 'POST') {
        throw new ApiError('Unknown endpoint.', 404);
    }
    require_once __DIR__ . '/../lib/images.php';
    if (!webp_supported()) {
        throw new ApiError('This server cannot write WebP images.', 501);
    }
    json_out(convert_existing_images($CONFIG['uploads_dir']));
}
