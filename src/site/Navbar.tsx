import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'
import { useSite } from '../lib/site'
import MenuItem, { useMenuTree } from './MegaMenu'
import type { MenuCategory } from './MegaMenu'
import type { NavItem } from '../lib/types'

/** Uploaded logo when one is set, otherwise the built-in mark. */
function Logo({ url, name, color }: { url?: string; name?: string; color: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name || 'Logo'}
        className="h-8 w-auto max-w-[160px] object-contain shrink-0"
      />
    )
  }
  return (
    <svg viewBox="0 0 256 256" className="w-8 h-8 shrink-0" aria-hidden="true">
      <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z" fill={color} />
      <path d="M 256 128 L 128 128 L 0 0 L 128 0 Z" fill={color} />
    </svg>
  )
}

function NavLink({
  href,
  label,
  color,
  onClick,
}: {
  href: string
  label: string
  color: string
  onClick?: () => void
}) {
  const cls = 'text-sm font-medium hover:opacity-60 transition-opacity whitespace-nowrap'
  if (/^https?:\/\//i.test(href)) {
    return (
      <a
        href={href}
        className={cls}
        style={{ color }}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {label}
      </a>
    )
  }
  return (
    <Link to={href} className={cls} style={{ color }} onClick={onClick}>
      {label}
    </Link>
  )
}

/** A category's sub-categories all link straight to the filtered product list. */
function categoryHref(slug: string) {
  return `/products?categories=${encodeURIComponent(slug)}`
}

/** One expandable category row for the "all categories" mobile accordion. */
function MobileCategoryRow({
  category,
  onNavigate,
}: {
  category: MenuCategory
  onNavigate: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Link
          to={categoryHref(category.slug)}
          onClick={onNavigate}
          className="flex-1 text-sm text-gray-700 hover:text-black py-2 px-3"
        >
          {category.name}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${category.name} sub-categories`}
          className="shrink-0 p-2 text-gray-400 hover:text-black"
        >
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="pl-4 pb-1 flex flex-col">
          {category.children.map((sub) => (
            <Link
              key={sub.id}
              to={categoryHref(sub.slug)}
              onClick={onNavigate}
              className="text-sm text-gray-500 hover:text-black py-1.5 px-3"
            >
              {sub.name}
            </Link>
          ))}
          <Link
            to={categoryHref(category.slug)}
            onClick={onNavigate}
            className="text-sm font-medium text-gray-700 hover:text-black py-1.5 px-3"
          >
            View all {category.name}
          </Link>
        </div>
      )}
    </div>
  )
}

/** Mobile menu row: a link, or a tap-to-expand list of children. */
function MobileNavEntry({
  item,
  tree,
  textColor,
  onNavigate,
}: {
  item: NavItem
  tree: MenuCategory[]
  textColor: string
  onNavigate: () => void
}) {
  const [open, setOpen] = useState(false)
  const category = item.type === 'category' ? tree.find((c) => c.slug === item.categorySlug) : undefined
  const manual = item.type === 'manual' ? item.children ?? [] : []
  const showAll = item.type === 'all-categories' && tree.length > 0

  // "All categories" needs its own nested accordion, not a flat link list.
  if (showAll) {
    return (
      <div className="rounded-xl">
        <div className="flex items-center justify-between gap-2 rounded-xl hover:bg-black/5">
          <span className="flex-1 px-3 py-2">
            <NavLink href={item.href} label={item.label} color={textColor} onClick={onNavigate} />
          </span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={`${item.label} categories`}
            className="shrink-0 p-2 mr-1"
            style={{ color: textColor }}
          >
            <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {open && (
          <div className="flex flex-col">
            {tree.map((c) => (
              <MobileCategoryRow key={c.id} category={c} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const links: { label: string; href: string }[] = category
    ? [
        ...category.children.map((sub) => ({ label: sub.name, href: categoryHref(sub.slug) })),
        { label: `View all ${category.name}`, href: categoryHref(category.slug) },
      ]
    : manual

  if (links.length === 0) {
    return (
      <div className="px-3 py-2 rounded-xl hover:bg-black/5">
        <NavLink href={item.href} label={item.label} color={textColor} onClick={onNavigate} />
      </div>
    )
  }

  return (
    <div className="rounded-xl">
      <div className="flex items-center justify-between gap-2 rounded-xl hover:bg-black/5">
        <span className="flex-1 px-3 py-2">
          <NavLink href={item.href} label={item.label} color={textColor} onClick={onNavigate} />
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${item.label} submenu`}
          className="shrink-0 p-2 mr-1"
          style={{ color: textColor }}
        >
          <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="pl-3 pb-1 flex flex-col">
          {links.map((l, i) => (
            <Link
              key={i}
              to={l.href}
              onClick={onNavigate}
              className="text-sm text-gray-600 hover:text-black py-1.5 px-3"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar({ variant = 'overlay' }: { variant?: 'overlay' | 'solid' }) {
  const { nav, settings } = useSite()
  const [menuOpen, setMenuOpen] = useState(false)
  // Only fetch the category tree when a menu entry actually needs it.
  const needsTree = nav.some((i) => i.type === 'category' || i.type === 'all-categories')
  const tree = useMenuTree(needsTree)
  const location = useLocation()

  const ctaHref = settings.cta_href || '/contact'
  const ctaLabel = settings.cta_label || ''

  const textColor = settings.nav_text_color || '#1f2937'
  // Solid, not translucent: showing the video through the bar read as a
  // gradient and made the menu text hard to place.
  const bg = settings.nav_bg_color || '#ffffff'

  return (
    <div className="relative">
      <nav
        style={{ backgroundColor: bg }}
        className={`shadow-sm ${
          variant === 'solid' ? 'border border-gray-200' : ''
        } rounded-2xl pl-3 sm:pl-4 pr-2 py-2 w-full sm:w-auto sm:inline-flex flex items-center gap-3 sm:gap-6`}
      >
        <Link to="/" aria-label={settings.site_name || 'Home'} className="shrink-0">
          <Logo url={settings.logo_url} name={settings.site_name} color={textColor} />
        </Link>

        <div className="hidden sm:flex items-center gap-6">
          {nav.map((item, i) => (
            <MenuItem
              key={`${item.label}-${i}`}
              item={item}
              tree={tree}
              textColor={textColor}
              panelBg={bg}
            />
          ))}
        </div>

        {ctaLabel && (
          <Link
            to={ctaHref}
            className="ml-auto sm:ml-0 bg-black text-white text-sm font-medium px-4 sm:px-5 py-2 rounded-xl hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            {ctaLabel}
          </Link>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="sm:hidden w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center hover:bg-black/20 transition-colors"
          style={{ color: textColor }}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {menuOpen && (
        <div
          style={{ backgroundColor: bg }}
          className="sm:hidden absolute left-0 right-0 mt-2 z-30 rounded-2xl shadow-xl border border-black/10 p-3 flex flex-col gap-1"
        >
          {nav.map((item, i) => (
            <MobileNavEntry
              key={`${item.label}-${i}`}
              item={item}
              tree={tree}
              textColor={textColor}
              onNavigate={() => setMenuOpen(false)}
            />
          ))}
          {ctaLabel && location.pathname !== ctaHref && (
            <Link
              to={ctaHref}
              onClick={() => setMenuOpen(false)}
              className="mt-1 bg-black text-white text-sm font-medium px-4 py-2.5 rounded-xl text-center hover:bg-gray-800 transition-colors"
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
