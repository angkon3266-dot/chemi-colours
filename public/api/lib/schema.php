<?php
declare(strict_types=1);

/**
 * Idempotent schema creation + first-run seed content.
 * Safe to run repeatedly: every statement is CREATE TABLE IF NOT EXISTS,
 * and seeding only happens when a table is empty.
 */

/** Bump whenever the statements below change, to re-run them once. */
const SCHEMA_VERSION = 13;

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

    // First-party traffic log. No cookies and no third party: the visitor is
    // identified only by a salted daily hash, which cannot be reversed to an IP
    // and cannot follow anyone between days.
    $pdo->exec("CREATE TABLE IF NOT EXISTS pageviews (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        path VARCHAR(300) NOT NULL DEFAULT '',
        referrer_host VARCHAR(190) NOT NULL DEFAULT '',
        visitor_hash CHAR(64) NOT NULL DEFAULT '',
        device VARCHAR(20) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX created (created_at),
        INDEX path_created (path, created_at),
        INDEX visitor (visitor_hash)
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
    add_products_faq_once();
    add_journal_once();
    add_products_filter_grid_once();
    split_products_pages_once();
    seed_journal_examples_once();
    rebuild_home_archroma_once();
    setting_default('palette_preset', 'brand');
    setting_default('palette_primary', '');
    setting_default('palette_accent', '');
    setting_default('palette_page', '');
    setting_default('palette_body', '');
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
    $allowed = ['categories', 'products', 'leads', 'pages', 'media', 'blocks', 'posts', 'pageviews'];
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
    setting_default('related_count', '8');
    setting_default('category_grid_columns', '3');
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

/**
 * FAQ on the Products page, where a buyer is already weighing up an order.
 *
 * Seeded hidden and with placeholder answers on purpose: MOQ, lead time and
 * payment terms are commercial facts only the owner knows, and inventing them
 * on a live trading site would be worse than having no FAQ at all. Fill the
 * answers in, then switch the block on.
 */
function add_products_faq_once(): void
{
    if (db()->query("SELECT `value` FROM settings WHERE `key` = 'products_faq_v1'")->fetchColumn() !== false) {
        return;
    }
    db()->prepare('INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)')
        ->execute(['products_faq_v1', '1']);

    $pageId = db()->query("SELECT id FROM pages WHERE slug = 'products' LIMIT 1")->fetchColumn();
    if ($pageId === false) {
        return;
    }
    $pageId = (int) $pageId;

    $exists = db()->prepare("SELECT COUNT(*) FROM blocks WHERE page_id = ? AND type = 'faq'");
    $exists->execute([$pageId]);
    if ((int) $exists->fetchColumn() > 0) {
        return;
    }

    $next = (int) db()->query("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM blocks WHERE page_id = $pageId")
        ->fetchColumn();

    $answer = 'Write your answer here, then switch this block on.';
    db()->prepare(
        'INSERT INTO blocks (page_id, type, sort_order, visible, data) VALUES (?, ?, ?, 0, ?)'
    )->execute([
        $pageId,
        'faq',
        $next,
        json_col([
            'title' => 'Frequently asked questions',
            'items' => [
                ['q' => 'What is your minimum order quantity?', 'a' => $answer],
                ['q' => 'What packaging sizes do you supply?', 'a' => $answer],
                ['q' => 'Do you provide TDS and MSDS documents?', 'a' => $answer],
                ['q' => 'What is your typical lead time?', 'a' => $answer],
                ['q' => 'Can I get a sample before ordering in bulk?', 'a' => $answer],
                ['q' => 'What are your payment terms?', 'a' => $answer],
                ['q' => 'Do you deliver outside Dhaka?', 'a' => $answer],
            ],
        ]),
    ]);
}

/**
 * Puts the journal in the menu. It is registered as a published page purely so
 * it joins the page-derived navigation; the /journal route renders the article
 * list, and render.php picks up this row for the page title and description.
 */
function add_journal_once(): void
{
    if (db()->query("SELECT `value` FROM settings WHERE `key` = 'journal_nav_v1'")->fetchColumn() !== false) {
        return;
    }
    db()->prepare('INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)')
        ->execute(['journal_nav_v1', '1']);

    if (db()->query("SELECT id FROM pages WHERE slug = 'journal' LIMIT 1")->fetchColumn() === false) {
        $order = (int) db()->query('SELECT COALESCE(MAX(nav_order), 0) + 1 FROM pages')->fetchColumn();
        db()->prepare(
            "INSERT INTO pages (slug, title, nav_label, nav_order, in_nav, status, meta_title,
                                meta_description)
             VALUES ('journal', 'Journal', 'Journal', ?, 1, 'published', 'Journal', ?)"
        )->execute([$order, 'Articles and updates from our team.']);
    }

    // Latest posts on the home page. The block renders nothing until something
    // is published, so it is safe to switch on now.
    $homeId = db()->query('SELECT id FROM pages WHERE is_home = 1 LIMIT 1')->fetchColumn();
    if ($homeId === false) {
        return;
    }
    $homeId = (int) $homeId;
    $has = db()->prepare("SELECT COUNT(*) FROM blocks WHERE page_id = ? AND type = 'posts'");
    $has->execute([$homeId]);
    if ((int) $has->fetchColumn() > 0) {
        return;
    }
    $next = (int) db()->query("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM blocks WHERE page_id = $homeId")
        ->fetchColumn();
    db()->prepare(
        'INSERT INTO blocks (page_id, type, sort_order, visible, data) VALUES (?, ?, ?, 1, ?)'
    )->execute([
        $homeId,
        'posts',
        $next,
        json_col(['title' => 'From the journal', 'subtitle' => '', 'limit' => 3]),
    ]);
}

/**
 * A filterable product grid on the Products page.
 *
 * That page browses by category (the parallax section), which is good for
 * discovery but gives no way to narrow a list. This adds the grid with the
 * category sidebar switched on, placed after the category browser and before
 * the FAQ.
 */
function add_products_filter_grid_once(): void
{
    if (db()->query("SELECT `value` FROM settings WHERE `key` = 'products_filter_v1'")->fetchColumn() !== false) {
        return;
    }
    db()->prepare('INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)')
        ->execute(['products_filter_v1', '1']);

    $pageId = db()->query("SELECT id FROM pages WHERE slug = 'products' LIMIT 1")->fetchColumn();
    if ($pageId === false) {
        return;
    }
    $pageId = (int) $pageId;

    $has = db()->prepare("SELECT COUNT(*) FROM blocks WHERE page_id = ? AND type = 'product_grid'");
    $has->execute([$pageId]);
    if ((int) $has->fetchColumn() > 0) {
        return;
    }

    // Sit just above the FAQ if there is one, otherwise at the end.
    $faqOrder = db()->prepare("SELECT sort_order FROM blocks WHERE page_id = ? AND type = 'faq' LIMIT 1");
    $faqOrder->execute([$pageId]);
    $at = $faqOrder->fetchColumn();
    if ($at === false) {
        $at = (int) db()->query("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM blocks WHERE page_id = $pageId")
            ->fetchColumn();
    } else {
        $at = (int) $at;
        db()->prepare('UPDATE blocks SET sort_order = sort_order + 1 WHERE page_id = ? AND sort_order >= ?')
            ->execute([$pageId, $at]);
    }

    db()->prepare(
        'INSERT INTO blocks (page_id, type, sort_order, visible, data) VALUES (?, ?, ?, 1, ?)'
    )->execute([
        $pageId,
        'product_grid',
        $at,
        json_col([
            'title'      => 'All products',
            'subtitle'   => 'Filter by category to narrow the list.',
            'mode'       => 'all',
            'showFilter' => true,
            'limit'      => 0,
        ]),
    ]);
}

/**
 * Splits browsing from listing.
 *
 * /products used to do both: a parallax category browser AND a product grid.
 * The grid moves to /products on its own ("All Products", with the category
 * filter), and the browser moves to a new /explore-category page. /products
 * keeps its URL because that is what people and search engines already have,
 * and it is the one they expect to hold a product list.
 */
function split_products_pages_once(): void
{
    if (db()->query("SELECT `value` FROM settings WHERE `key` = 'split_products_v1'")->fetchColumn() !== false) {
        return;
    }
    db()->prepare('INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)')
        ->execute(['split_products_v1', '1']);

    $productsId = db()->query("SELECT id FROM pages WHERE slug = 'products' LIMIT 1")->fetchColumn();
    if ($productsId === false) {
        return;
    }
    $productsId = (int) $productsId;

    // The browser page, sitting right after the products page in the menu.
    $exploreId = db()->query("SELECT id FROM pages WHERE slug = 'explore-category' LIMIT 1")->fetchColumn();
    if ($exploreId === false) {
        $order = (int) db()->query("SELECT nav_order FROM pages WHERE id = $productsId")->fetchColumn();
        db()->prepare(
            "INSERT INTO pages (slug, title, nav_label, nav_order, in_nav, status, meta_title,
                                meta_description)
             VALUES ('explore-category', 'Explore category', 'Explore category', ?, 1,
                     'published', 'Explore category', ?)"
        )->execute([$order + 1, 'Browse our range by dye class and type.']);
        $exploreId = (int) db()->lastInsertId();
    } else {
        $exploreId = (int) $exploreId;
    }

    // Move the category browser across, and give it a heading of its own.
    db()->prepare("UPDATE blocks SET page_id = ?, sort_order = 1 WHERE page_id = ? AND type = 'parallax'")
        ->execute([$exploreId, $productsId]);

    $hasHero = db()->prepare("SELECT COUNT(*) FROM blocks WHERE page_id = ? AND type = 'pagehero'");
    $hasHero->execute([$exploreId]);
    if ((int) $hasHero->fetchColumn() === 0) {
        db()->prepare(
            'INSERT INTO blocks (page_id, type, sort_order, visible, data) VALUES (?, ?, 0, 1, ?)'
        )->execute([
            $exploreId,
            'pagehero',
            json_col([
                'eyebrow'  => 'Our range',
                'title'    => 'Explore category',
                'subtitle' => 'Pick a dye class to see its types and products.',
            ]),
        ]);
    }

    // Rename the remaining page and retitle its header block.
    db()->prepare("UPDATE pages SET title = 'All Products', nav_label = 'All Products',
                          meta_title = 'All Products' WHERE id = ?")
        ->execute([$productsId]);

    $hero = db()->prepare("SELECT id, data FROM blocks WHERE page_id = ? AND type = 'pagehero' LIMIT 1");
    $hero->execute([$productsId]);
    if ($row = $hero->fetch()) {
        $data = decode_json_col($row['data']);
        $data['title'] = 'All Products';
        $data['subtitle'] = 'Every product we supply. Use the filter to narrow by category.';
        db()->prepare('UPDATE blocks SET data = ? WHERE id = ?')
            ->execute([json_col($data), $row['id']]);
    }

    // Close the gap left by the moved block.
    $i = 0;
    foreach (db()->query("SELECT id FROM blocks WHERE page_id = $productsId ORDER BY sort_order ASC")->fetchAll() as $b) {
        db()->prepare('UPDATE blocks SET sort_order = ? WHERE id = ?')->execute([$i++, $b['id']]);
    }
}

/**
 * A handful of example journal posts so the section isn't empty while the
 * owner writes their own. Deliberately generic, industry-standard
 * information — nothing about Chemi Colours' own history, performance or
 * certifications, since that would be inventing claims for a live trading
 * site. Saved as DRAFTS: nothing here goes public without the owner
 * reviewing and publishing it themselves.
 */
function seed_journal_examples_once(): void
{
    if (db()->query("SELECT `value` FROM settings WHERE `key` = 'journal_examples_v1'")->fetchColumn() !== false) {
        return;
    }
    db()->prepare('INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)')
        ->execute(['journal_examples_v1', '1']);

    if ((int) db()->query('SELECT COUNT(*) FROM posts')->fetchColumn() > 0) {
        return;
    }

    $posts = [
        [
            'title'   => 'Reactive, Disperse and Acid Dyes: What Sets Them Apart',
            'excerpt' => 'A quick guide to the three dye classes you will see most often, and which substrates each one is actually built for.',
            'body'    => '<p>Choosing the right dye class starts with the fibre, not the shade. Getting this wrong is the single most common reason a batch fails at the lab-dip stage.</p>'
                . '<h3>Reactive dyes</h3>'
                . '<p>Form a covalent bond with the fibre itself, which is why they hold up so well to washing. Used almost exclusively on cellulosic fibres — cotton, viscose, linen.</p>'
                . '<h3>Disperse dyes</h3>'
                . '<p>Applied as a fine aqueous dispersion rather than a true solution, since the dye itself has very low water solubility. Built for synthetic fibres, most commonly polyester.</p>'
                . '<h3>Acid dyes</h3>'
                . '<p>Applied from an acidic dyebath and bond to fibres with basic sites in their structure — wool, silk and nylon. Generally give brighter shades than reactive dyes but with different fastness characteristics.</p>'
                . '<p><strong>The practical takeaway:</strong> confirm your substrate before requesting a lab dip. A dye class matched to the wrong fibre will not fix itself with more dosing.</p>',
            'author'  => '',
        ],
        [
            'title'   => 'Understanding Colour Fastness Ratings',
            'excerpt' => 'Light, wash and rub fastness are graded on standard scales — here is what the numbers on a technical data sheet actually mean.',
            'body'    => '<p>Fastness ratings describe how well a dyed fabric resists fading or transferring colour under a specific kind of stress. They are not a single "quality score" — a shade can be excellent on one scale and weak on another, which is exactly why buyers ask for all three.</p>'
                . '<h3>Wash and rub fastness</h3>'
                . '<p>Graded 1 to 5 under ISO 105 test methods, where 5 is the best result (negligible colour change or staining) and 1 is the weakest. Most commercial apparel work targets 4 or better.</p>'
                . '<h3>Light fastness</h3>'
                . '<p>Graded on a wider 1 to 8 "blue wool" scale, where each step represents roughly double the light exposure needed to produce a noticeable fade. Outdoor and upholstery fabrics generally need a higher rating than garments worn indoors.</p>'
                . '<ul><li>Ask for fastness figures alongside the shade, not after.</li>'
                . '<li>Match the rating to the end use — a curtain and a t-shirt do not need the same light fastness.</li>'
                . '<li>A documented rating from a test report is worth more than a verbal assurance.</li></ul>',
            'author'  => '',
        ],
        [
            'title'   => 'Storing Reactive Dyes in Humid Climates',
            'excerpt' => 'Reactive dye powders absorb moisture readily, and a damp store room is one of the most common causes of inconsistent shade from one batch to the next.',
            'body'    => '<p>Reactive dyes are, by design, chemically reactive — that is what lets them bond to the fibre. The same reactivity means they can slowly hydrolyse (react with atmospheric moisture) while still sitting in the drum, which quietly reduces dye strength before it ever reaches the dyebath.</p>'
                . '<h3>What actually helps</h3>'
                . '<ul><li>Keep drums sealed until the moment of weighing — do not leave them open on the shop floor.</li>'
                . '<li>Store below roughly 30°C and away from direct sunlight; heat speeds up hydrolysis.</li>'
                . '<li>Aim for a dry storage area — a dehumidifier is a reasonable investment where ambient humidity is consistently high.</li>'
                . '<li>Use older stock first. Dye strength drifts over time even under good conditions, so first-in-first-out matters.</li></ul>'
                . '<p>If a shade that used to match suddenly needs a higher dosage to reach the same depth, ageing or moisture-affected stock is one of the first things worth checking.</p>',
            'author'  => '',
        ],
        [
            'title'   => 'What to Check Before Placing a Bulk Dyestuff Order',
            'excerpt' => 'A short checklist for the questions worth asking before committing to a large order, not after the drums have arrived.',
            'body'    => '<p>A bulk order is much harder to unwind than a small one, so it is worth a few extra questions up front.</p>'
                . '<ul><li><strong>Lab dip first.</strong> Confirm the shade against your own substrate and dyeing process, not just a swatch card.</li>'
                . '<li><strong>Ask for the technical data sheet.</strong> Strength, recommended dosing range and application conditions should be documented, not verbal.</li>'
                . '<li><strong>Confirm packaging and shelf life.</strong> Drum size affects storage and handling; shelf life affects how much you should realistically hold in stock.</li>'
                . '<li><strong>Check the batch-to-batch consistency policy.</strong> Ask how a reorder is matched against your original approved lab dip.</li>'
                . '<li><strong>Clarify lead time in writing.</strong> Especially for anything outside a supplier\'s standard stocked range.</li></ul>'
                . '<p>None of this adds much time to the process, and it is far cheaper than discovering a mismatch after a production run.</p>',
            'author'  => '',
        ],
    ];

    $ins = db()->prepare(
        'INSERT INTO posts (slug, title, excerpt, body, author, status) VALUES (?,?,?,?,?,"draft")'
    );
    foreach ($posts as $p) {
        $ins->execute([
            unique_slug('posts', slugify($p['title'], 'post')),
            $p['title'],
            $p['excerpt'],
            $p['body'],
            $p['author'],
        ]);
    }
}

/**
 * Restructure the home page along the lines the owner asked for: hero, a
 * featured carousel, a "who we are" introduction, then the applications we
 * serve, before the existing certification / showcase / enquiry sections.
 *
 * Nothing is deleted — the blocks already on the page keep their content and
 * simply move down. The carousel is seeded from the owner's own categories
 * (their images, their words) rather than invented copy, and the introduction
 * reuses the site's own meta description. Figures and the intro image are left
 * empty on purpose: those are claims only the owner can make.
 */
function rebuild_home_archroma_once(): void
{
    if (db()->query("SELECT `value` FROM settings WHERE `key` = 'home_archroma_v1'")->fetchColumn() !== false) {
        return;
    }
    db()->prepare('INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)')
        ->execute(['home_archroma_v1', '1']);

    $home = (int) db()->query('SELECT id FROM pages WHERE is_home = 1 LIMIT 1')->fetchColumn();
    if (!$home) {
        return;
    }

    // Re-running the page builder must not stack duplicates if this install
    // already picked the blocks up some other way.
    $existing = db()->prepare(
        "SELECT COUNT(*) FROM blocks WHERE page_id = ? AND type IN ('carousel','intro','cards')"
    );
    $existing->execute([$home]);
    if ((int) $existing->fetchColumn() > 0) {
        return;
    }

    // Everything except the hero slides down to make room for the new sections.
    db()->prepare("UPDATE blocks SET sort_order = sort_order + 20 WHERE page_id = ? AND type <> 'hero'")
        ->execute([$home]);

    $categories = db()->query(
        "SELECT c.name, c.slug, c.summary, m.filename, m.external_url
           FROM categories c
           LEFT JOIN media m ON m.id = c.image_id
          WHERE c.parent_id IS NULL
          ORDER BY c.sort_order, c.id
          LIMIT 4"
    )->fetchAll();

    $slides = [];
    foreach ($categories as $c) {
        $image = ($c['external_url'] ?? '') !== ''
            ? $c['external_url']
            : (($c['filename'] ?? '') !== '' ? '/uploads/' . $c['filename'] : '');
        $slides[] = [
            'eyebrow'   => 'Our range',
            'title'     => $c['name'],
            'text'      => (string) ($c['summary'] ?? ''),
            'image'     => $image,
            'linkLabel' => 'Explore ' . $c['name'],
            'linkHref'  => '/category/' . $c['slug'],
        ];
    }

    if ($slides) {
        add_block($home, 'carousel', 1, ['autoplay' => true, 'items' => $slides]);
    }

    $description = (string) db()->query(
        "SELECT `value` FROM settings WHERE `key` = 'meta_description'"
    )->fetchColumn();
    $siteName = (string) db()->query(
        "SELECT `value` FROM settings WHERE `key` = 'site_name'"
    )->fetchColumn();

    add_block($home, 'intro', 2, [
        'eyebrow'   => 'Who we are',
        'title'     => 'We are ' . ($siteName !== '' ? $siteName : 'Chemi Colours'),
        // The owner's own description of the business, not a new claim.
        'html'      => $description !== ''
            ? '<p>' . htmlspecialchars($description, ENT_QUOTES, 'UTF-8') . '</p>'
            : '',
        'image'     => '',
        'imageSide' => 'left',
        // Deliberately empty: only the owner can stand behind a number.
        'figures'   => [],
        'buttons'   => [
            ['label' => 'Explore our products', 'href' => '/products', 'style' => 'accent'],
            ['label' => 'Talk to us', 'href' => '/contact', 'style' => 'outline'],
        ],
    ]);

    // Application segments are ordinary textile-industry vocabulary, not
    // claims about this business, so they are safe to seed. Images are left
    // for the owner — the cards render as text-only until then.
    add_block($home, 'cards', 3, [
        'title'    => 'Applications we serve',
        'subtitle' => 'Dyes and auxiliaries selected for the substrate and the process they are run on.',
        'columns'  => '3',
        'items'    => [
            ['title' => 'Denim Jeans', 'text' => 'Indigo and sulphur dyeing, plus the wash processes.', 'image' => '', 'href' => '', 'icon' => 'shirt'],
            ['title' => 'Knit Fabrics', 'text' => 'Exhaust dyeing of cotton and blended knits.', 'image' => '', 'href' => '', 'icon' => 'layers'],
            ['title' => 'Woven Fabrics', 'text' => 'Continuous and pad-batch routes for wovens.', 'image' => '', 'href' => '', 'icon' => 'weave'],
            ['title' => 'Home Textiles', 'text' => 'Bed linen, curtains and upholstery.', 'image' => '', 'href' => '', 'icon' => 'sofa'],
            ['title' => 'Terry Fabrics', 'text' => 'High-liquor-ratio dyeing on absorbent fabrics.', 'image' => '', 'href' => '', 'icon' => 'waves'],
            ['title' => 'Performance Wear', 'text' => 'Disperse dyeing of polyester and its blends.', 'image' => '', 'href' => '', 'icon' => 'zap'],
        ],
    ]);
}
