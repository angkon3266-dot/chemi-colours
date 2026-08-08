import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { Bootstrap, Page, Settings, NavItem } from './types'

export const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260602_150901_c45b90ec-18d7-42ff-90e2-b95d7109e330.mp4'

/**
 * Rendered when the API cannot be reached (offline, dev without proxy, or an
 * outage). The site degrades to a working landing page rather than a blank screen.
 */
const FALLBACK: Bootstrap = {
  settings: {
    site_name: 'Chemi Colours',
    logo_text: 'Chemi Colours',
    hero_video_url: VIDEO_URL,
    contact_email: 'hello@chemicolours.com',
    cta_label: 'Start a project',
    cta_href: '/contact',
    footer_tagline: 'Dyestuff and textile chemicals for mills that cannot afford a bad batch.',
    footer_note: `© ${new Date().getFullYear()} Chemi Colours. All rights reserved.`,
    form_heading: 'Say hello! 👋',
    form_intro: 'Tell us about your requirement',
    form_success_title: "You're all set!",
    form_success_text: 'Expect a reply within 24 hours.',
    form_services: [
      'Reactive Dyes', 'Disperse Dyes', 'Acid Dyes', 'Vat Dyes',
      'Textile Auxiliaries', 'Pigment Dispersions', 'Bulk Supply',
      'Custom Formulation', 'Other',
    ],
    footer_columns: [],
  },
  nav: [
    { label: 'Our story', href: '/our-story' },
    { label: 'Expertise', href: '/expertise' },
    { label: 'Products', href: '/products' },
    { label: 'Contact', href: '/contact' },
  ],
  home: {
    slug: 'home',
    title: 'Home',
    blocks: [
      {
        type: 'hero',
        data: {
          headline: "We colour the world's fabric",
          headline2: 'with dependable',
          accent: 'dyestuff',
          useSiteVideo: true,
          showForm: true,
        },
      },
    ],
  },
}

interface SiteValue {
  settings: Settings
  nav: NavItem[]
  home: Page | null
  loading: boolean
  offline: boolean
  refresh: () => void
}

const SiteContext = createContext<SiteValue>({
  ...FALLBACK,
  loading: true,
  offline: false,
  refresh: () => {},
})

export function SiteProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap>(FALLBACK)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<Bootstrap>('/bootstrap')
      .then((b) => {
        if (cancelled) return
        setData({
          settings: { ...FALLBACK.settings, ...(b.settings || {}) },
          nav: b.nav?.length ? b.nav : FALLBACK.nav,
          home: b.home ?? FALLBACK.home,
        })
        setOffline(false)
      })
      .catch(() => {
        if (!cancelled) setOffline(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  return (
    <SiteContext.Provider
      value={{ ...data, loading, offline, refresh: () => setTick((t) => t + 1) }}
    >
      {children}
    </SiteContext.Provider>
  )
}

export function useSite() {
  return useContext(SiteContext)
}
