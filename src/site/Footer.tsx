import { Link } from 'react-router-dom'
import { Twitter, Circle, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react'
import { useSite } from '../lib/site'
import type { FooterColumn } from '../lib/types'

function FooterLink({ href, label }: { href: string; label: string }) {
  const cls = 'text-sm text-gray-500 hover:text-black transition-colors'
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    )
  }
  return (
    <Link to={href} className={cls}>
      {label}
    </Link>
  )
}

export default function Footer() {
  const { settings } = useSite()
  const columns: FooterColumn[] = Array.isArray(settings.footer_columns)
    ? settings.footer_columns
    : []
  const extras: { label: string; value: string }[] = Array.isArray(settings.footer_extra)
    ? settings.footer_extra.filter((r) => (r?.value || '').trim() !== '')
    : []

  const socials = [
    { key: 'social_twitter', Icon: Twitter, label: 'Twitter' },
    { key: 'social_facebook', Icon: Circle, label: 'Facebook' },
    { key: 'social_instagram', Icon: Instagram, label: 'Instagram' },
    { key: 'social_linkedin', Icon: Linkedin, label: 'LinkedIn' },
  ].filter((s) => (settings[s.key] || '').trim() !== '')

  return (
    <footer className="mt-6 rounded-2xl sm:rounded-3xl bg-gray-50 border border-gray-100 px-5 sm:px-8 py-8 sm:py-10">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        <div className="lg:max-w-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.site_name || 'Logo'}
                className="h-8 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <>
                <svg viewBox="0 0 256 256" className="w-7 h-7" aria-hidden="true">
                  <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z" fill="black" />
                  <path d="M 256 128 L 128 128 L 0 0 L 128 0 Z" fill="black" />
                </svg>
                <span className="font-semibold text-black">
                  {settings.site_name || 'Chemi Colours'}
                </span>
              </>
            )}
          </div>
          {settings.tagline && (
            <p className="text-sm font-medium text-gray-700">{settings.tagline}</p>
          )}
          {settings.footer_tagline && (
            <p className="text-sm text-gray-500 leading-relaxed">{settings.footer_tagline}</p>
          )}

          <div className="flex flex-col gap-1.5 mt-1">
            {settings.contact_email && (
              <a
                href={`mailto:${settings.contact_email}`}
                className="text-sm text-gray-600 hover:text-black transition-colors inline-flex items-center gap-2"
              >
                <Mail size={14} /> {settings.contact_email}
              </a>
            )}
            {settings.contact_phone && (
              <a
                href={`tel:${settings.contact_phone.replace(/\s+/g, '')}`}
                className="text-sm text-gray-600 hover:text-black transition-colors inline-flex items-center gap-2"
              >
                <Phone size={14} /> {settings.contact_phone}
              </a>
            )}
            {settings.address && (
              <span className="text-sm text-gray-600 inline-flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0" /> {settings.address}
              </span>
            )}
          </div>

          {socials.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {socials.map(({ key, Icon, label }) => (
                <a
                  key={key}
                  href={settings[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-xl bg-white border border-gray-200 text-gray-700 flex items-center justify-center hover:border-gray-400 transition-colors"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-6">
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <h3 className="text-sm font-semibold text-black">{col.title}</h3>
              {(col.links || []).map((l, j) => (
                <FooterLink key={j} href={l.href} label={l.label} />
              ))}
            </div>
          ))}

          {/* Right-hand column: address plus any custom detail rows. */}
          {(settings.footer_address || extras.length > 0) && (
            <div className="flex flex-col gap-2.5 col-span-2 sm:col-span-1">
              <h3 className="text-sm font-semibold text-black">Find us</h3>
              {settings.footer_address && (
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                  {settings.footer_address}
                </p>
              )}
              {extras.map((row, i) => (
                <p key={i} className="text-sm text-gray-500">
                  {row.label && <span className="text-gray-400">{row.label}: </span>}
                  {row.value}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-5 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <p className="text-xs text-gray-400">
          {settings.footer_note || `© ${new Date().getFullYear()} Chemi Colours.`}
        </p>
        <Link to="/admin" className="text-xs text-gray-300 hover:text-gray-500 transition-colors">
          Admin
        </Link>
      </div>
    </footer>
  )
}
