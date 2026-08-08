import { useEffect, useState } from 'react'
import { MessageCircle, Phone, Mail, X } from 'lucide-react'
import { useSite } from '../lib/site'
import { whatsappHref, callHref, emailHref } from '../lib/contact'

/**
 * Corner button that fans out WhatsApp / Call / Email.
 * Renders nothing when no contact route is configured.
 */
export default function FloatingContact() {
  const { settings } = useSite()
  const [open, setOpen] = useState(false)

  const actions = [
    {
      key: 'whatsapp',
      href: whatsappHref(settings),
      label: 'WhatsApp',
      Icon: MessageCircle,
      cls: 'bg-[#25D366] text-white hover:bg-[#1eb855]',
      external: true,
    },
    {
      key: 'call',
      href: callHref(settings),
      label: 'Call us',
      Icon: Phone,
      cls: 'bg-black text-white hover:bg-gray-800',
      external: false,
    },
    {
      key: 'email',
      href: emailHref(settings),
      label: 'Email us',
      Icon: Mail,
      cls: 'bg-white text-black border border-gray-200 hover:border-gray-400',
      external: false,
    },
  ].filter((a) => a.href)

  // Escape closes the fan, matching the rest of the site's overlays.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (actions.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2 print:hidden">
      {open &&
        actions.map(({ key, href, label, Icon, cls, external }, i) => (
          <a
            key={key}
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            onClick={() => setOpen(false)}
            style={{ animationDelay: `${i * 40}ms` }}
            className={`collapse-in inline-flex items-center gap-2 rounded-2xl shadow-lg text-sm font-semibold px-4 py-3 transition-colors ${cls}`}
          >
            <Icon size={16} /> {label}
          </a>
        ))}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close contact options' : 'Contact us'}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors ${
          open ? 'bg-gray-900 text-white' : 'bg-[#25D366] text-white hover:bg-[#1eb855]'
        }`}
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
    </div>
  )
}
