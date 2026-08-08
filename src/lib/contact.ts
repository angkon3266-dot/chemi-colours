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
