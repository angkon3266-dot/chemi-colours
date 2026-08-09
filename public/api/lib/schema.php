<?php
declare(strict_types=1);

/**
 * Idempotent schema creation + first-run seed content.
 * Safe to run repeatedly: every statement is CREATE TABLE IF NOT EXISTS,
 * and seeding only happens when a table is empty.
 */

/** Bump whenever the statements below change, to re-run them once. */
const SCHEMA_VERSION = 8;

/**
 * Cheap gate in front of the real work. Without it every single API request
 * re-ran ~15 DDL statements plus information_schema look-ups, which was
 * costing hundreds of milliseconds on every page load.
 */
function migrate(): void
{
    try {
        $v = db()->query("SELECT `value` FROM settings WHERE `key` = 'schema_version'")
            ->fetchColumn();
        if ($v !== false && (int) $v === SCHEMA_VERSION) {
            return;
        }
    } catch (Throwable) {
        // settings table does not exist yet: fall through and build it.
    }

    migrate_run();

    db()->prepare(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)'
    )->execute(['schema_version', (string) SCHEMA_VERSION]);
}

function migrate_run(): void
{
    $pdo = db();

    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(120) NOT NULL DEFAULT '',
        last_login_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS login_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX ip_time (ip, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        `key` VARCHAR(64) PRIMARY KEY,
        `value` LONGTEXT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS pages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(150) NOT NULL UNIQUE,
        title VARCHAR(200) NOT NULL,
        nav_label VARCHAR(100) NOT NULL DEFAULT '',
        nav_order INT NOT NULL DEFAULT 0,
        in_nav TINYINT(1) NOT NULL DEFAULT 1,
        is_home TINYINT(1) NOT NULL DEFAULT 0,
        status ENUM('draft','published') NOT NULL DEFAULT 'draft',
        meta_title VARCHAR(200) NOT NULL DEFAULT '',
        meta_description VARCHAR(300) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS blocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        page_id INT NOT NULL,
        type VARCHAR(40) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        visible TINYINT(1) NOT NULL DEFAULT 1,
        data LONGTEXT NULL,
        CONSTRAINT fk_blocks_page FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
        INDEX page_sort (page_id, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(150) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        description TEXT NULL,
        sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS media (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kind ENUM('image','video','doc') NOT NULL DEFAULT 'image',
        filename VARCHAR(255) NOT NULL DEFAULT '',
        original_name VARCHAR(255) NOT NULL DEFAULT '',
        mime VARCHAR(120) NOT NULL DEFAULT '',
        size_bytes BIGINT NOT NULL DEFAULT 0,
        external_url VARCHAR(1000) NOT NULL DEFAULT '',
        alt VARCHAR(300) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(150) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        category_id INT NULL,
        ci_name VARCHAR(120) NOT NULL DEFAULT '',
        cas_no VARCHAR(60) NOT NULL DEFAULT '',
        shade_name VARCHAR(120) NOT NULL DEFAULT '',
        shade_hex VARCHAR(9) NOT NULL DEFAULT '',
        fastness_light VARCHAR(20) NOT NULL DEFAULT '',
        fastness_wash VARCHAR(20) NOT NULL DEFAULT '',
        fastness_rub VARCHAR(20) NOT NULL DEFAULT '',
        fibres LONGTEXT NULL,
        summary VARCHAR(400) NOT NULL DEFAULT '',
        description LONGTEXT NULL,
        application_notes LONGTEXT NULL,
        image_id INT NULL,
        gallery LONGTEXT NULL,
        spec_sheet_id INT NULL,
        status ENUM('draft','published') NOT NULL DEFAULT 'published',
        featured TINYINT(1) NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX cat (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(180) NOT NULL UNIQUE,
        title VARCHAR(250) NOT NULL,
        excerpt VARCHAR(500) NOT NULL DEFAULT '',
        body LONGTEXT NULL,
        cover_id INT NULL,
        author VARCHAR(120) NOT NULL DEFAULT '',
        status ENUM('draft','published') NOT NULL DEFAULT 'draft',
        published_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX status_date (status, published_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL DEFAULT '',
        email VARCHAR(200) NOT NULL DEFAULT '',
        company VARCHAR(200) NOT NULL DEFAULT '',
        message TEXT NULL,
        services LONGTEXT NULL,
        status ENUM('new','read','archived') NOT NULL DEFAULT 'new',
        ip VARCHAR(45) NOT NULL DEFAULT '',
        user_agent VARCHAR(400) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX status_time (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // --- incremental migrations (safe to re-run) ---------------------------
    add_column('categories', 'parent_id', 'INT NULL');
    add_column('categories', 'image_id', 'INT NULL');
    add_column('categories', 'summary', "VARCHAR(400) NOT NULL DEFAULT ''");
    add_column('leads', 'phone', "VARCHAR(40) NOT NULL DEFAULT ''");

    // Supply-side specs. This is a chemicals supply business, not a dye house:
    // shade and fastness belong to the mill's lab, packaging and MOQ do not.
    // The old colour columns are left untouched so nothing already entered is
    // lost, but no screen reads them now.
    add_column('products', 'form', "VARCHAR(80) NOT NULL DEFAULT ''");
    add_column('products', 'strength', "VARCHAR(80) NOT NULL DEFAULT ''");
    add_column('products', 'packaging', "VARCHAR(160) NOT NULL DEFAULT ''");
    add_column('products', 'moq', "VARCHAR(80) NOT NULL DEFAULT ''");
    add_column('products', 'hs_code', "VARCHAR(40) NOT NULL DEFAULT ''");
    add_column('products', 'shelf_life', "VARCHAR(80) NOT NULL DEFAULT ''");
    add_column('products', 'storage', "VARCHAR(300) NOT NULL DEFAULT ''");
    // Free-form rows the owner defines: [{label, value}, ...]
    add_column('products', 'custom_specs', 'LONGTEXT NULL');

    seed_settings();
    seed_categories();
    seed_pages();
    seed_products();

    // The header button was renamed; move existing installs across once.
    db()->exec(
        "UPDATE settings SET `value` = 'Get in touch'
         WHERE `key` = 'cta_label' AND `value` = 'Start a project'"
    );

    upgrade_products_page_once();
    add_home_highlights();
    enable_hero_cta_once();
}

/**
 * The hero block was seeded before the over-video button existed, so it has no
 * CTA keys at all and the button could never render. Fill them in once and
 * switch it on; the label, action and target stay editable in the page builder.
 */
function enable_hero_cta_once(): void
{
    $done = db()->query("SELECT `value` FROM settings WHERE `key` = 'hero_cta_v1'")->fetchColumn();
    if ($done !== false) {
        return;
    }
    db()->prepare('INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)')
        ->execute(['hero_cta_v1', '1']);

    $stmt = db()->query("SELECT id, data FROM blocks WHERE type = 'hero'");
    $update = db()->prepare('UPDATE blocks SET data = ? WHERE id = ?');

    foreach ($stmt->fetchAll() as $row) {
        $data = decode_json_col($row['data']);
        if (array_key_exists('ctaEnabled', $data)) {
            continue;
        }
        $data += [
            'ctaEnabled' => true,
            'ctaLabel'   => 'Request a quote',
            'ctaAction'  => 'link',
            'ctaHref'    => '/contact',
        ];
        $update->execute([json_col($data), $row['id']]);
    }
}

/**
 * Drops a category showcase onto the home page so a first-time visitor can see
 * what is sold without scrolling. Guarded by a flag row: the home page is
 * user-editable, and re-adding this block on every request would be a mess.
 */
function add_home_highlights(): void
{
    $done = db()->query("SELECT `value` FROM settings WHERE `key` = 'home_highlights_v1'")
        ->fetchColumn();
    if ($done !== false) {
        return;
    }
    // Claim the flag first: if anything below fails we still never retry.
    db()->prepare('INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)')
        ->execute(['home_highlights_v1', '1']);

    $homeId = db()->query('SELECT id FROM pages WHERE is_home = 1 LIMIT 1')->fetchColumn();
    if ($homeId === false) {
        return;
    }
    $homeId = (int) $homeId;

    $already = db()->prepare(
        "SELECT COUNT(*) FROM blocks WHERE page_id = ? AND type = 'category_grid'"
    );
    $already->execute([$homeId]);
    if ((int) $already->fetchColumn() > 0) {
        return;
    }

    // Sit directly under the hero, ahead of everything else.
    db()->prepare(
        'UPDATE blocks SET sort_order = sort_order + 1 WHERE page_id = ? AND sort_order >= 1'
    )->execute([$homeId]);

    db()->prepare(
        'INSERT INTO blocks (page_id, type, sort_order, visible, data) VALUES (?, ?, ?, 1, ?)'
    )->execute([
        $homeId,
        'category_grid',
        1,
        json_col([
            'title'    => 'What we supply',
            'subtitle' => 'Technical dyestuff and auxiliaries across every major class.',
            'source'   => 'main',
            'limit'    => 8,
        ]),
    ]);
}

/**
 * The Products page originally held a flat product grid; it now leads with the
 * category showcase. Runs at most once, and only while the page still matches
 * what was seeded — so a hand-edited page is never overwritten.
 */
function upgrade_products_page_once(): void
{
    $done = db()->query("SELECT `value` FROM settings WHERE `key` = 'migrated_products_parallax'")
        ->fetchColumn();
    if ($done !== false) {
        return;
    }
    setting_default('migrated_products_parallax', '1');

    $pageId = db()->query("SELECT id FROM pages WHERE slug = 'products' LIMIT 1")->fetchColumn();
    if ($pageId === false) {
        return;
    }

    $stmt = db()->prepare("SELECT id FROM blocks WHERE page_id = ? AND type = 'product_grid'");
    $stmt->execute([$pageId]);
    $blockId = $stmt->fetchColumn();
    if ($blockId === false) {
        return;
    }

    $upd = db()->prepare("UPDATE blocks SET type = 'parallax', data = ? WHERE id = ?");
    $upd->execute([json_col(['title' => '', 'subtitle' => '']), $blockId]);
}

/** Adds a column only when it is missing, so migrate() stays idempotent. */
function add_column(string $table, string $column, string $definition): void
{
    $allowed = ['categories', 'products', 'leads', 'pages', 'media', 'blocks', 'posts'];
    if (!in_array($table, $allowed, true) || !preg_match('/^[a-z_]+$/', $column)) {
        throw new ApiError('Bad migration target.', 500);
    }
    $stmt = db()->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$table, $column]);
    if ((int) $stmt->fetchColumn() === 0) {
        db()->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
    }
}

/**
 * Starter products, deliberately created as DRAFTS with no technical values.
 * Nothing invented is ever shown to the public: the owner fills in the real
 * C.I. names, CAS numbers and fastness ratings, then publishes.
 */
function seed_products(): void
{
    if ((int) db()->query('SELECT COUNT(*) FROM products')->fetchColumn() > 0) {
        return;
    }

    $starters = [
        ['Reactive Red', 'reactive-dyes', '#c0392b'],
        ['Reactive Turquoise', 'reactive-dyes', '#17a2b8'],
        ['Disperse Blue', 'disperse-dyes', '#1f4e9c'],
        ['Disperse Orange', 'disperse-dyes', '#e8622a'],
        ['Acid Black', 'acid-dyes', '#1c1c1c'],
        ['Vat Olive Green', 'vat-dyes', '#4a6b3a'],
    ];

    $catStmt = db()->prepare('SELECT id FROM categories WHERE slug = ? LIMIT 1');
    $ins = db()->prepare(
        'INSERT INTO products (slug, name, category_id, shade_hex, summary, status, sort_order)
         VALUES (?, ?, ?, ?, ?, "draft", ?)'
    );

    foreach ($starters as $i => [$name, $catSlug, $hex]) {
        $catStmt->execute([$catSlug]);
        $catId = $catStmt->fetchColumn();
        $ins->execute([
            unique_slug('products', slugify($name, 'product')),
            $name,
            $catId !== false ? (int) $catId : null,
            $hex,
            '',
            $i,
        ]);
    }
}

function setting_default(string $key, mixed $value): void
{
    $stmt = db()->prepare('INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)');
    $stmt->execute([$key, is_string($value) ? $value : json_encode($value)]);
}

function seed_settings(): void
{
    setting_default('site_name', 'Chemi Colours');
    setting_default('logo_text', 'Chemi Colours');
    setting_default('logo_url', '');
    setting_default('tagline', 'Dyestuff for dyeing factories');
    setting_default('whatsapp_number', '');
    setting_default('whatsapp_message', 'Hello, I would like to enquire about');
    setting_default('call_number', '');
    setting_default('footer_address', '');
    setting_default('footer_extra', json_encode([]));
    setting_default('nav_items', json_encode([]));
    setting_default('nav_bg_color', '#ffffff');
    setting_default('nav_align', 'left');
    setting_default('ga_measurement_id', '');
    setting_default('search_console_token', '');
    setting_default('og_image_url', '');
    setting_default('meta_description', '');
    setting_default('nav_text_color', '#1f2937');
    setting_default('footer_map_url', '');
    setting_default('hero_video_url', 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260602_150901_c45b90ec-18d7-42ff-90e2-b95d7109e330.mp4');
    setting_default('hero_poster_url', '');
    setting_default('contact_email', 'hello@chemicolours.com');
    setting_default('contact_phone', '');
    setting_default('address', '');
    setting_default('cta_label', 'Get in touch');
    setting_default('cta_href', '/contact');
    setting_default('footer_tagline', 'Dyestuff and textile chemicals for mills that cannot afford a bad batch.');
    setting_default('footer_note', '© ' . date('Y') . ' Chemi Colours. All rights reserved.');
    setting_default('social_twitter', '');
    setting_default('social_facebook', '');
    setting_default('social_instagram', '');
    setting_default('social_linkedin', '');
    setting_default('form_services', json_encode([
        'Reactive Dyes', 'Disperse Dyes', 'Acid Dyes', 'Vat Dyes',
        'Textile Auxiliaries', 'Pigment Dispersions', 'Bulk Supply',
        'Custom Formulation', 'Other',
    ]));
    setting_default('form_heading', 'Say hello! 👋');
    setting_default('form_intro', 'Tell us about your requirement');
    setting_default('form_success_title', "You're all set!");
    setting_default('form_success_text', 'Expect a reply within 24 hours.');
    setting_default('footer_columns', json_encode([
        ['title' => 'Company', 'links' => [
            ['label' => 'Our story', 'href' => '/our-story'],
            ['label' => 'Expertise', 'href' => '/expertise'],
            ['label' => 'Products', 'href' => '/products'],
        ]],
        ['title' => 'Support', 'links' => [
            ['label' => 'Contact', 'href' => '/contact'],
        ]],
    ]));
}

function seed_categories(): void
{
    if ((int) db()->query('SELECT COUNT(*) FROM categories')->fetchColumn() > 0) {
        return;
    }
    $cats = [
        'Reactive Dyes', 'Disperse Dyes', 'Acid Dyes', 'Vat Dyes',
        'Direct Dyes', 'Basic Dyes', 'Pigment Dispersions', 'Textile Auxiliaries',
    ];
    $stmt = db()->prepare('INSERT INTO categories (slug, name, sort_order) VALUES (?, ?, ?)');
    foreach ($cats as $i => $name) {
        $stmt->execute([slugify($name), $name, $i]);
    }
}

function seed_pages(): void
{
    if ((int) db()->query('SELECT COUNT(*) FROM pages')->fetchColumn() > 0) {
        return;
    }

    $home = create_seed_page('home', 'Home', '', 0, true, false);
    add_block($home, 'hero', 0, [
        'headline'     => "We colour the world's fabric",
        'headline2'    => 'with dependable',
        'accent'       => 'dyestuff',
        'useSiteVideo' => true,
        'videoUrl'     => '',
        'showForm'     => true,
    ]);
    add_block($home, 'stats', 1, [
        'title' => 'Trusted on the shop floor',
        'items' => [
            // Placeholders only. Never seed invented figures: on a live
            // chemicals site a buyer could rely on them.
            ['value' => '—', 'label' => 'Years supplying mills'],
            ['value' => '—', 'label' => 'Shades in catalogue'],
            ['value' => '—', 'label' => 'Batch-to-batch consistency'],
            ['value' => '—', 'label' => 'Technical response time'],
        ],
    ]);
    add_block($home, 'richtext', 2, [
        'eyebrow' => 'What we do',
        'title'   => 'Colour that survives the wash test',
        'html'    => '<p>Describe what your company supplies here, and what makes your dyestuff dependable for a mill. Replace this placeholder text from the admin panel.</p>',
    ]);
    add_block($home, 'product_grid', 3, [
        'title'    => 'Our range',
        'subtitle' => 'Technical dyestuff across every major class.',
        'mode'     => 'featured',
        'limit'    => 6,
    ]);
    add_block($home, 'cta', 4, [
        'title'      => 'Need a shade matched?',
        'text'       => 'Send us your swatch and substrate. Our lab will come back with a recipe and a quotation.',
        'buttonText' => 'Talk to our lab',
        'buttonHref' => '/contact',
    ]);

    $story = create_seed_page('our-story', 'Our Story', 'Our story', 1, false, true);
    add_block($story, 'pagehero', 0, [
        'eyebrow'  => 'Our story',
        'title'    => 'Built beside the dye house',
        'subtitle' => 'Replace this with your own introduction.',
    ]);
    add_block($story, 'richtext', 1, [
        'html' => '<p>Chemi Colours began as a small trading operation supplying a handful of local dye houses. What set the business apart was simple: when a shade went wrong, we turned up at the mill.</p><p>That habit became the company. Today we supply dyestuff across the full technical range, but the promise has not changed — consistent colour, documented fastness, and a technical team that answers the phone.</p>',
    ]);
    add_block($story, 'timeline', 2, [
        'title' => 'Milestones',
        'items' => [
            // Dates and claims must come from the owner, not from us.
            ['year' => 'Year', 'title' => 'Milestone', 'text' => 'Describe what happened. Edit or delete from the admin panel.'],
        ],
    ]);

    $exp = create_seed_page('expertise', 'Expertise', 'Expertise', 2, false, true);
    add_block($exp, 'pagehero', 0, [
        'eyebrow'  => 'Expertise',
        'title'    => 'More than a drum of powder',
        'subtitle' => 'Shade matching, fastness testing, and process troubleshooting.',
    ]);
    add_block($exp, 'features', 1, [
        'title' => 'How we support your floor',
        'items' => [
            ['title' => 'Shade matching', 'text' => 'Send a swatch and substrate; our lab returns a reproducible recipe with the exact dye combination and dosing.'],
            ['title' => 'Fastness testing', 'text' => 'Light, wash and rub fastness assessed in-house so you get documented ratings, not estimates.'],
            ['title' => 'Process troubleshooting', 'text' => 'Uneven dyeing, tailing, or shade drift between batches — we work through the variables with your technicians.'],
            ['title' => 'Compliance support', 'text' => 'Documentation aligned to ZDHC MRSL and OEKO-TEX for buyers who audit your inputs.'],
            ['title' => 'Custom formulation', 'text' => 'Blends tuned to your water chemistry, machinery and cycle times.'],
            ['title' => 'Bulk supply', 'text' => 'Reliable lead times and batch reservation so a repeat order matches the first one.'],
        ],
    ]);
    add_block($exp, 'cta', 2, [
        'title'      => 'Bring us a difficult shade',
        'text'       => 'The tricky ones are the interesting ones.',
        'buttonText' => 'Contact the lab',
        'buttonHref' => '/contact',
    ]);

    $prod = create_seed_page('products', 'Products', 'Products', 3, false, true);
    add_block($prod, 'pagehero', 0, [
        'eyebrow'  => 'Our products',
        'title'    => 'The catalogue',
        'subtitle' => 'Filter by class to find the right dyestuff for your substrate.',
    ]);
    add_block($prod, 'parallax', 1, [
        'title'    => '',
        'subtitle' => '',
    ]);

    $contact = create_seed_page('contact', 'Contact', 'Contact', 4, false, true);
    add_block($contact, 'pagehero', 0, [
        'eyebrow'  => 'Contact',
        'title'    => 'Talk to us',
        'subtitle' => 'Tell us your substrate, shade and volume — we will come back within a day.',
    ]);
    add_block($contact, 'contact', 1, [
        'title' => 'Send us a message',
        'text'  => 'Our technical team reads every enquiry.',
    ]);
}

function create_seed_page(
    string $slug,
    string $title,
    string $navLabel,
    int $order,
    bool $isHome,
    bool $inNav
): int {
    $stmt = db()->prepare(
        'INSERT INTO pages (slug, title, nav_label, nav_order, in_nav, is_home, status, meta_title)
         VALUES (?, ?, ?, ?, ?, ?, "published", ?)'
    );
    $stmt->execute([$slug, $title, $navLabel, $order, $inNav ? 1 : 0, $isHome ? 1 : 0, $title]);
    return (int) db()->lastInsertId();
}

function add_block(int $pageId, string $type, int $order, array $data): void
{
    $stmt = db()->prepare(
        'INSERT INTO blocks (page_id, type, sort_order, visible, data) VALUES (?, ?, ?, 1, ?)'
    );
    $stmt->execute([$pageId, $type, $order, json_col($data)]);
}
