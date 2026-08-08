# Chemi Colours

Marketing site + content management for a dyestuff supplier.
Live at **https://chemicolours.noychoy.com**

## Stack

| Layer     | Choice                                              |
| --------- | --------------------------------------------------- |
| Front end | React 19 + TypeScript + Vite + Tailwind CSS 3        |
| Routing   | react-router-dom (SPA, `.htaccess` rewrites to it)   |
| API       | PHP 8.3 (no framework) on cPanel/LiteSpeed           |
| Database  | MySQL / MariaDB 10.11                                |
| Icons     | lucide-react                                         |

## Layout

```
src/
  lib/        API client, types, site-wide content provider
  site/       Public website (layout, nav, footer, blocks, product pages)
  admin/      Admin panel (/admin)
public/
  api/        PHP API — copied verbatim into the build output
    lib/      bootstrap (config + PDO), auth, sanitiser, schema/migrations
    routes/   public, auth, admin
  .htaccess   SPA rewrites, security headers, cache policy
  uploads/    User uploads (kept across deploys; PHP execution disabled)
```

The database schema is created and seeded automatically on the first API
request — see `public/api/lib/schema.php`. It is idempotent, so it is safe to
run on every request.

## Configuration

Database credentials live **outside the web root**, at
`/home/noycuuae/chemicolours_config.php` on the server. It is deliberately not
in git. If the account is ever rebuilt, recreate it:

```php
<?php
return [
    'db' => ['host' => 'localhost', 'name' => '…', 'user' => '…', 'pass' => '…'],
    'uploads_dir' => '/home/noycuuae/chemicolours.noychoy/uploads',
    'debug' => false,
];
```

## Admin panel

`/admin`. The first visit asks you to create the administrator account; after
that it is an email + password login. Passwords are hashed with
`password_hash()`. Login is rate-limited to 8 failed attempts per IP per 15
minutes, and every write requires a CSRF token.

From the panel you can manage:

- **Settings** — background video (upload or URL), poster image, contact
  details, social links, contact-form copy and tags, footer columns.
- **Pages** — build any page from blocks (hero, page header, text, features,
  stats, timeline, product grid, gallery, CTA, contact, FAQ, logos). Reorder,
  hide, publish/draft, set menu label and order, SEO title/description.
- **Products** — full technical spec: category, C.I. name, CAS number, shade
  swatch, light/wash/rub fastness, suitable fibres, image gallery and a
  spec-sheet PDF.
- **Media** — upload images (10 MB), video (100 MB) and PDFs (20 MB), or
  register an external CDN URL.
- **Enquiries** — every contact-form submission, with reply/read/archive.

## Development

```bash
npm install
npm run dev
```

PHP cannot run under the Vite dev server, so `/api` and `/uploads` are proxied
to the live site (see `vite.config.ts`). **Local development therefore reads and
writes production data.** The front end also falls back to built-in default
content if the API is unreachable, so the page still renders offline.

## Deployment

Every push to `master` triggers `.github/workflows/deploy.yml`, which builds the
site and copies `dist/` to the server over SSH, then checks that the homepage
and API both return 200.

The deploy key is restricted on the server: `authorized_keys` forces
`scp -r -t <docroot>`, so it can only write files into the site directory — it
cannot open a shell or touch anything else. The private half is stored in the
GitHub repository secret `DEPLOY_SSH_KEY`.

Uploads survive deploys because `scp` only overwrites the files it ships and
`uploads/` is not part of the build.
