import { MessageCircle, Phone, Mail, Send } from 'lucide-react'
import { useSite } from '../lib/site'
import { whatsappHref, callHref, emailHref } from '../lib/contact'

/**
 * WhatsApp / call / email / enquire buttons.
 * Anything without a configured number or address is simply not rendered.
 */
export default function ContactActions({
  subject,
  onEnquire,
  size = 'md',
}: {
  subject?: string
  onEnquire?: () => void
  size?: 'sm' | 'md'
}) {
  const { settings } = useSite()

  const wa = whatsappHref(settings, subject)
  const tel = callHref(settings)
  const mail = emailHref(settings, subject)

  const pad = size === 'sm' ? 'px-3.5 py-2 text-xs' : 'px-5 py-3 text-sm'
  const base = `inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors ${pad}`

  return (
    <div className="flex flex-wrap gap-2">
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} bg-[#25D366] text-white hover:bg-[#1eb855]`}
        >
          <MessageCircle size={size === 'sm' ? 14 : 16} /> WhatsApp
        </a>
      )}
      {tel && (
        <a href={tel} className={`${base} bg-black text-white hover:bg-gray-800`}>
          <Phone size={size === 'sm' ? 14 : 16} /> Call
        </a>
      )}
      {mail && (
        <a
          href={mail}
          className={`${base} bg-white text-black border border-gray-200 hover:border-gray-400`}
        >
          <Mail size={size === 'sm' ? 14 : 16} /> Email
        </a>
      )}
      {onEnquire && (
        <button
          type="button"
          onClick={onEnquire}
          className={`${base} bg-white text-black border border-gray-200 hover:border-gray-400`}
        >
          <Send size={size === 'sm' ? 14 : 16} /> Send enquiry
        </button>
      )}
    </div>
  )
}
