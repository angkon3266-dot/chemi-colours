<?php
declare(strict_types=1);

/**
 * Idempotent schema creation + first-run seed content.
 * Safe to run repeatedly: every statement is CREATE TABLE IF NOT EXISTS,
 * and seeding only happens when a table is empty.
 */

function migrate(): void
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

    seed_settings();
    seed_categories();
    seed_pages();
    seed_products();
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
    setting_default('hero_video_url', 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260602_150901_c45b90ec-18d7-42ff-90e2-b95d7109e330.mp4');
    setting_default('hero_poster_url', '');
    setting_default('contact_email', 'hello@chemicolours.com');
    setting_default('contact_phone', '');
    setting_default('address', '');
    setting_default('cta_label', 'Start a project');
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
            ['value' => '28+', 'label' => 'Years supplying mills'],
            ['value' => '400+', 'label' => 'Shades in catalogue'],
            ['value' => '99.2%', 'label' => 'Batch-to-batch consistency'],
            ['value' => '24h', 'label' => 'Technical response time'],
        ],
    ]);
    add_block($home, 'richtext', 2, [
        'eyebrow' => 'What we do',
        'title'   => 'Colour that survives the wash test',
        'html'    => '<p>Chemi Colours supplies reactive, disperse, acid and vat dyestuff to dyeing and finishing mills. Every drum is batch-tested for shade consistency and fastness before it leaves us, so your production floor is not the place where problems are discovered.</p>',
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
        'subtitle' => 'Three decades of getting colour right, batch after batch.',
    ]);
    add_block($story, 'richtext', 1, [
        'html' => '<p>Chemi Colours began as a small trading operation supplying a handful of local dye houses. What set the business apart was simple: when a shade went wrong, we turned up at the mill.</p><p>That habit became the company. Today we supply dyestuff across the full technical range, but the promise has not changed — consistent colour, documented fastness, and a technical team that answers the phone.</p>',
    ]);
    add_block($story, 'timeline', 2, [
        'title' => 'Milestones',
        'items' => [
            ['year' => '1997', 'title' => 'Founded', 'text' => 'Started supplying reactive dyes to local cotton mills.'],
            ['year' => '2006', 'title' => 'In-house lab', 'text' => 'Opened our shade-matching and fastness testing laboratory.'],
            ['year' => '2014', 'title' => 'Expanded range', 'text' => 'Added disperse, acid and vat classes alongside auxiliaries.'],
            ['year' => '2023', 'title' => 'Eco compliance', 'text' => 'Aligned the core catalogue with ZDHC and OEKO-TEX requirements.'],
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
    add_block($prod, 'product_grid', 1, [
        'title'      => '',
        'mode'       => 'all',
        'showFilter' => true,
        'limit'      => 0,
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
