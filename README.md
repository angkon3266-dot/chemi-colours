# Chemi Colours

Marketing site + content management for a dyestuff supplier.
Live at **https://chemicolours.com**

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
  site/       Public website (layout, nav, footer, blocks, product pages, journal)
  admin/      Admin panel (/admin)
public/
  api/        PHP API — copied verbatim into the build output
    lib/      bootstrap (config + PDO), auth, sanitiser, schema/migrations, analytics, images
    routes/   public, auth, admin
  render.php  Serves index.html with real per-page <title>/OG tags for crawlers and link previews
  sitemap.php Generated XML sitemap from published pages/categories/products/posts
  .htaccess   SPA rewrites (via render.php), security headers, cache policy
  uploads/    User uploads (kept across deploys; PHP execution disabled)
```

The database schema is created and seeded automatically on the first API
request — see `public/api/lib/schema.php`. It is idempotent and gated behind a
stored `schema_version`, so it costs nothing on requests after the first.

## Configuration

Database credentials live **outside the web root**, at
`/home/noycuuae/chemicolours_config.php` on the server, shared by every
sibling docroot under `/home/noycuuae/` (see `public/api/lib/bootstrap.php`,
which resolves the config path via `dirname(DOCROOT)`). It is deliberately not
in git. If the account is ever rebuilt, recreate it:

```php
<?php
return [
    'db' => ['host' => 'localhost', 'name' => '…', 'user' => '…', 'pass' => '…'],
    'uploads_dir' => '/home/noycuuae/chemicolours.com/uploads',
    'debug' => false,
];
```

## Admin panel

`/admin`. The first visit asks you to create the administrator account; after
that it is an email + password login, and more admins can be added under
Settings. Passwords are hashed with `password_hash()`. Login is rate-limited
to 8 failed attempts per IP per 15 minutes, and every write requires a CSRF
token.

From the panel you can manage:

- **Settings** — background video (upload or URL), poster image, logo,
  contact/WhatsApp/call details, social links, menu (plain links, a dropdown
  driven by one category, an all-categories mega menu, or hand-written
  dropdown links), menu bar colour/position, footer, Google map, SEO
  defaults (share image, description, GA measurement ID, Search Console
  token), and admin accounts.
- **Pages** — build any page from blocks (hero, page header, text, features,
  stats, timeline, product/category grid with filtering, gallery, CTA,
  contact, FAQ, logos, testimonials, latest journal posts, map, parallax
  category browser, director message). Reorder, hide, publish/draft, set menu
  label/order, SEO title/description.
- **Products** — supply-chemical spec: category (with sub-categories), C.I.
  name, CAS number, form, strength, packaging, MOQ, HS code, shelf life,
  storage, owner-defined spec rows, image gallery, spec-sheet PDF.
- **Journal** — blog-style posts with a cover image, excerpt and body.
- **Media** — upload images (10 MB, auto-converted to WebP), video (100 MB)
  and PDFs (20 MB), or register an external CDN URL.
- **Enquiries** — every contact-form submission, with reply/read/archive.
- **Visitors** — first-party page-view analytics (no cookies, salted daily
  visitor hash), independent of the optional Google Analytics ID.

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
`command="scp -r -t /home/noycuuae/chemicolours.com/"`, so it can only write
files into that one directory — it cannot open a shell or touch anything else,
including the sibling `chemicolours.noychoy` docroot or the git repository at
`/home/noycuuae/repositories/chemi-colours`. The private half is stored in the
GitHub repository secret `DEPLOY_SSH_KEY`.

Uploads survive deploys because `scp` only overwrites the files it ships and
`uploads/` is not part of the build.

### Manual deploy (if CI is ever unavailable)

```bash
npm run build
scp -O -P 2036 -r dist/* <ssh-alias-or-user@host>:/home/noycuuae/chemicolours.com/
```

Requires an SSH key with normal (non-restricted) access to the account, since
the CI key above can only be used from GitHub Actions' own scp invocation.
