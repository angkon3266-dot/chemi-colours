import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useSite } from '../lib/site'

/** Uploaded logo when one is set, otherwise the built-in mark. */
function Logo({ url, name }: { url?: string; name?: string }) {
  if (url) {
    return <img src={url} alt={name || 'Logo'} className="h-8 w-auto max-w-[160px] object-contain shrink-0" />
  }
  return (
    <svg viewBox="0 0 256 256" className="w-8 h-8 shrink-0" aria-hidden="true">
      <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z" fill="black" />
      <path d="M 256 128 L 128 128 L 0 0 L 128 0 Z" fill="black" />
    </svg>
  )
}

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const cls =
    'text-gray-800 text-sm font-medium hover:opacity-60 transition-opacity whitespace-nowrap'
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        {label}
      </a>
    )
  }
  return (
    <Link to={href} className={cls} onClick={onClick}>
      {label}
    </Link>
  )
}

export default function Navbar({ variant = 'overlay' }: { variant?: 'overlay' | 'solid' }) {
  const { nav, settings } = useSite()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const ctaHref = settings.cta_href || '/contact'
  const ctaLabel = settings.cta_label || 'Start a project'

  const shell =
    variant === 'overlay'
      ? 'bg-white/60 backdrop-blur-md shadow-sm'
      : 'bg-white/80 backdrop-blur-md border border-gray-200 shadow-sm'

  return (
    <div className="relative">
      <nav
        className={`${shell} rounded-2xl pl-3 sm:pl-4 pr-2 py-2 w-full sm:w-auto sm:inline-flex flex items-center gap-3 sm:gap-6`}
      >
        <Link to="/" aria-label={settings.site_name || 'Home'} className="shrink-0">
          <Logo url={settings.logo_url} name={settings.site_name} />
        </Link>

        <div className="hidden sm:flex items-center gap-6">
          {nav.map((item) => (
            <NavLink key={item.href + item.label} href={item.href} label={item.label} />
          ))}
        </div>

        <Link
          to={ctaHref}
          className="ml-auto sm:ml-0 bg-black text-white text-sm font-medium px-4 sm:px-5 py-2 rounded-xl hover:bg-gray-800 transition-colors whitespace-nowrap"
        >
          {ctaLabel}
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="sm:hidden w-9 h-9 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="sm:hidden absolute left-0 right-0 mt-2 z-30 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 flex flex-col gap-1">
          {nav.map((item) => (
            <div key={item.href + item.label} className="px-3 py-2 rounded-xl hover:bg-gray-50">
              <NavLink href={item.href} label={item.label} onClick={() => setMenuOpen(false)} />
            </div>
          ))}
          {location.pathname !== ctaHref && (
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
