import type { Settings } from './types'

/** Strips spaces, dashes and brackets so tel:/wa.me links are always valid. */
export function cleanNumber(raw?: string): string {
  return (raw || '').replace(/[^\d+]/g, '').replace(/^\+/, '')
}

export function whatsappHref(settings: Settings, subject?: string): string {
  const num = cleanNumber(settings.whatsapp_number)
  if (!num) return ''
  const base = (settings.whatsapp_message || '').trim()
  const text = [base, subject].filter(Boolean).join(' ').trim()
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function callHref(settings: Settings): string {
  // Fall back to the general contact phone when no dedicated call number is set.
  const num = (settings.call_number || '').trim() || (settings.contact_phone || '').trim()
  return num ? `tel:${num.replace(/[^\d+]/g, '')}` : ''
}

export function emailHref(settings: Settings, subject?: string): string {
  const to = (settings.contact_email || '').trim()
  if (!to) return ''
  return `mailto:${to}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`
}

/**
 * Turns whatever a user pastes from Google Maps into an embeddable URL.
 * Accepts a full <iframe> snippet, an existing /embed URL, a share link or a
 * plain address, so the admin never has to know which one is "right".
 */
export function mapEmbedUrl(raw?: string): string {
  const v = (raw || '').trim()
  if (!v) return ''

  // Pasted iframe markup: pull the src out.
  const iframeSrc = v.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)
  if (iframeSrc) return iframeSrc[1]

  if (/^https?:\/\/(www\.)?google\.[^/]+\/maps\/embed/i.test(v)) return v

  // Any other Google Maps or short link, or a plain address: let Maps resolve
  // it through the keyless embed endpoint.
  return `https://maps.google.com/maps?q=${encodeURIComponent(v)}&output=embed`
}

/** A link a visitor can open in the Maps app. */
export function mapLinkUrl(raw?: string): string {
  const v = (raw || '').trim()
  if (!v) return ''
  const iframeSrc = v.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)
  const url = iframeSrc ? iframeSrc[1] : v
  if (/^https?:\/\//i.test(url) && !/\/maps\/embed/i.test(url)) return url
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`
}

export type CtaAction = 'link' | 'whatsapp' | 'call' | 'email' | 'form'

/**
 * Resolves a configurable CTA into something renderable.
 * `scroll` means "jump to the contact form on this page" rather than navigate.
 */
export function resolveCta(
  settings: Settings,
  action: CtaAction | undefined,
  value: string | undefined,
  subject?: string
): { href: string; external: boolean; scroll: boolean } {
  switch (action) {
    case 'whatsapp':
      return { href: whatsappHref(settings, subject), external: true, scroll: false }
    case 'call':
      return { href: callHref(settings), external: true, scroll: false }
    case 'email':
      return { href: emailHref(settings, subject), external: true, scroll: false }
    case 'form':
      return { href: '#enquiry', external: false, scroll: true }
    default: {
      const href = (value || '').trim() || '/contact'
      return { href, external: /^https?:\/\//i.test(href), scroll: false }
    }
  }
}
