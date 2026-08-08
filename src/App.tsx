import { useState } from 'react'
import type { ReactNode } from 'react'
import { Twitter, Circle, Instagram, Linkedin } from 'lucide-react'

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260602_150901_c45b90ec-18d7-42ff-90e2-b95d7109e330.mp4'

const SERVICES = [
  'Reactive Dyes',
  'Disperse Dyes',
  'Acid Dyes',
  'Vat Dyes',
  'Textile Auxiliaries',
  'Pigment Dispersions',
  'Bulk Supply',
  'Custom Formulation',
  'Other',
]

function SocialBtn({
  href,
  className,
  children,
}: {
  href: string
  className: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`w-8 h-8 rounded-xl flex items-center justify-center hover:opacity-80 transition-opacity ${className}`}
    >
      {children}
    </a>
  )
}

function App() {
  const [selected, setSelected] = useState<string[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const toggleService = (service: string) => {
    setSelected((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    await new Promise((r) => setTimeout(r, 1000))
    setSending(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-white p-3 sm:p-4 md:p-6">
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden min-h-[calc(100vh-24px)] sm:min-h-[calc(100vh-32px)] md:min-h-[calc(100vh-48px)] lg:h-[calc(100vh-48px)]">
        <video
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 flex flex-col min-h-[calc(100vh-24px)] sm:min-h-[calc(100vh-32px)] md:min-h-[calc(100vh-48px)] lg:h-full p-4 sm:p-6 md:p-8 gap-6">
          {/* Navbar */}
          <div className="flex">
            <nav className="bg-white/60 backdrop-blur-md rounded-2xl shadow-sm pl-3 sm:pl-4 pr-2 py-2 w-full sm:w-auto flex items-center gap-3 sm:gap-6">
              <svg viewBox="0 0 256 256" className="w-8 h-8 shrink-0">
                <path
                  d="M 256 256 L 128 256 L 0 128 L 128 128 Z"
                  fill="black"
                />
                <path d="M 256 128 L 128 128 L 0 0 L 128 0 Z" fill="black" />
              </svg>
              <a
                href="#"
                className="hidden sm:inline text-gray-800 text-sm font-medium hover:opacity-60 transition-opacity whitespace-nowrap"
              >
                Our story
              </a>
              <a
                href="#"
                className="hidden sm:inline text-gray-800 text-sm font-medium hover:opacity-60 transition-opacity whitespace-nowrap"
              >
                Expertise
              </a>
              <a
                href="#"
                className="hidden sm:inline text-gray-800 text-sm font-medium hover:opacity-60 transition-opacity whitespace-nowrap"
              >
                Our work
              </a>
              <a
                href="#"
                className="hidden sm:inline text-gray-800 text-sm font-medium hover:opacity-60 transition-opacity whitespace-nowrap"
              >
                Journal
              </a>
              <button
                type="button"
                className="ml-auto bg-black text-white text-sm font-medium px-4 sm:px-5 py-2 rounded-xl hover:bg-gray-800 transition-colors whitespace-nowrap"
              >
                Start a project
              </button>
            </nav>
          </div>

          <div className="flex-1 min-h-[2rem]" />

          {/* Bottom row */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Headline */}
            <p className="text-white text-3xl sm:text-4xl xl:text-5xl font-medium leading-tight drop-shadow-lg lg:max-w-lg xl:max-w-2xl shrink-0">
              We colour the world's fabric
              <br />
              with dependable{' '}
              <span
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                dyestuff
              </span>
            </p>

            {/* Contact form card */}
            <div className="w-full lg:w-[min(480px,45%)] shrink-0">
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden p-4 sm:p-6 flex flex-col gap-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black tracking-tight">
                  Say hello! 👋
                </h2>

                <div className="flex flex-row items-center justify-between gap-3 bg-gray-50 rounded-2xl px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Drop us a line</p>
                    <a
                      href="mailto:hello@chemicolours.com"
                      className="text-blue-600 font-semibold hover:underline truncate block"
                    >
                      hello@chemicolours.com
                    </a>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SocialBtn
                      href="https://twitter.com"
                      className="bg-gray-100 text-gray-800"
                    >
                      <Twitter size={13} />
                    </SocialBtn>
                    <SocialBtn
                      href="https://facebook.com"
                      className="bg-pink-100 text-pink-500"
                    >
                      <Circle size={13} />
                    </SocialBtn>
                    <SocialBtn
                      href="https://instagram.com"
                      className="bg-orange-100 text-orange-400"
                    >
                      <Instagram size={13} />
                    </SocialBtn>
                    <SocialBtn
                      href="https://linkedin.com"
                      className="bg-blue-100 text-blue-600"
                    >
                      <Linkedin size={13} />
                    </SocialBtn>
                  </div>
                </div>

                {sent ? (
                  <div className="flex flex-col items-center py-6 gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-xl">
                      ✓
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">
                      You're all set!
                    </h3>
                    <p className="text-sm text-gray-500">
                      Expect a reply within 24 hours.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-gray-400 font-medium text-sm">
                        OR
                      </span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-4"
                    >
                      <label className="text-sm font-medium text-black">
                        Tell us about your vision
                      </label>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="flex-1 min-w-0 text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-transparent placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="flex-1 min-w-0 text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-transparent placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                        />
                      </div>

                      <textarea
                        rows={4}
                        placeholder="What are you looking to build or improve..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-transparent placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition resize-none"
                      />

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-black">
                          I need help with...
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {SERVICES.map((service) => {
                            const active = selected.includes(service)
                            return (
                              <button
                                key={service}
                                type="button"
                                onClick={() => toggleService(service)}
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

                      <button
                        type="submit"
                        disabled={sending}
                        className="w-full bg-black text-white text-sm font-semibold py-3 rounded-2xl hover:bg-gray-800 transition-colors disabled:opacity-60"
                      >
                        {sending ? 'Sending...' : 'Send my message'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
