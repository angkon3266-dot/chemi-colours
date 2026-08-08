import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Twitter, Circle, Instagram, Linkedin, ChevronDown } from 'lucide-react'
import { api } from '../lib/api'
import { useSite } from '../lib/site'

function SocialBtn({
  href,
  className,
  label,
  children,
}: {
  href: string
  className: string
  label: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`w-8 h-8 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity ${className}`}
    >
      {children}
    </a>
  )
}

const INPUT =
  'flex-1 min-w-0 text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-transparent placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition'

export default function ContactForm({
  collapsible = true,
  defaultOpen,
}: {
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const { settings } = useSite()

  // Below lg the form starts collapsed so the headline and video stay visible.
  const [open, setOpen] = useState(() => {
    if (defaultOpen !== undefined) return defaultOpen
    if (!collapsible) return true
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  })

  const [selected, setSelected] = useState<string[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const services: string[] = Array.isArray(settings.form_services) ? settings.form_services : []

  const socials = [
    { key: 'social_twitter', Icon: Twitter, cls: 'bg-gray-100 text-gray-800', label: 'Twitter' },
    { key: 'social_facebook', Icon: Circle, cls: 'bg-pink-100 text-pink-500', label: 'Facebook' },
    { key: 'social_instagram', Icon: Instagram, cls: 'bg-orange-100 text-orange-400', label: 'Instagram' },
    { key: 'social_linkedin', Icon: Linkedin, cls: 'bg-blue-100 text-blue-600', label: 'LinkedIn' },
  ].filter((s) => (settings[s.key] || '').trim() !== '')

  useEffect(() => {
    if (sent) setOpen(true)
  }, [sent])

  const toggleService = (service: string) => {
    setSelected((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await api.post('/leads', { name, email, company, message, services: selected, website })
      setSent(true)
    } catch (err: any) {
      setError(err?.message || 'Could not send your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const contactEmail = settings.contact_email || 'hello@chemicolours.com'

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
      <div className="p-4 sm:p-6 flex flex-col gap-4">
        {/* Header — doubles as the collapse toggle */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-semibold text-black tracking-tight">
            {settings.form_heading || 'Say hello! 👋'}
          </h2>
          {collapsible && !sent && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="contact-form-body"
              className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ChevronDown
                size={18}
                className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>

        {/* Email + socials: always visible, even when collapsed */}
        <div className="flex flex-row items-center justify-between gap-3 bg-gray-50 rounded-2xl px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Drop us a line</p>
            <a
              href={`mailto:${contactEmail}`}
              className="text-blue-600 font-semibold hover:underline truncate block"
            >
              {contactEmail}
            </a>
          </div>
          {socials.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              {socials.map(({ key, Icon, cls, label }) => (
                <SocialBtn key={key} href={settings[key]} className={cls} label={label}>
                  <Icon size={13} />
                </SocialBtn>
              ))}
            </div>
          )}
        </div>

        {/* Collapsible body. Conditionally rendered rather than height-animated:
            the grid 0fr/1fr trick collapsed to zero inside this flex layout. */}
        {open && (
          <div id="contact-form-body" className="collapse-in">
            {sent ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-xl">
                  ✓
                </div>
                <h3 className="text-base font-semibold text-gray-900">
                  {settings.form_success_title || "You're all set!"}
                </h3>
                <p className="text-sm text-gray-500">
                  {settings.form_success_text || 'Expect a reply within 24 hours.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-gray-400 font-medium text-sm">OR</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <label className="text-sm font-medium text-black">
                    {settings.form_intro || 'Tell us about your requirement'}
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={INPUT}
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={INPUT}
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Company / mill name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className={INPUT}
                  />

                  {/* Honeypot: hidden from humans, catches naive bots */}
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="hidden"
                  />

                  <textarea
                    rows={4}
                    placeholder="Substrate, shade and volume you're looking for..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={`${INPUT} resize-none`}
                  />

                  {services.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-black">I need help with...</label>
                      <div className="flex flex-wrap gap-1.5">
                        {services.map((service) => {
                          const active = selected.includes(service)
                          return (
                            <button
                              key={service}
                              type="button"
                              onClick={() => toggleService(service)}
                              aria-pressed={active}
                              className={`text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                                active
                                  ? 'bg-gray-100 text-black border-black'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              {service}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-black text-white text-sm font-semibold py-3 rounded-2xl hover:bg-gray-800 transition-colors disabled:opacity-60"
                  >
                    {sending ? 'Sending...' : 'Send my message'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
