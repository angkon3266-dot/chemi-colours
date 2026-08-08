import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { Bootstrap, Page, Settings, NavItem } from './types'

/**
 * Rendered when the API cannot be reached (offline, dev without proxy, or an
 * outage). The site degrades to a working landing page rather than a blank screen.
 *
 * Deliberately no hero_video_url: hard-coding one meant the old default video
 * painted for a moment on every load before the real one replaced it.
 */
const FALLBACK: Bootstrap = {
  settings: {
    site_name: 'Chemi Colours',
    logo_text: 'Chemi Colours',
    hero_video_url: '',
    contact_email: 'hello@chemicolours.com',
    cta_label: 'Get in touch',
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

/**
 * The starting state. Deliberately blank: seeding state with FALLBACK meant
 * every visitor saw the built-in menu, button label and footer text for a
 * moment before their real content replaced it. Components treat missing
 * values as "not known yet" and render nothing, so there is no flash of
 * content that was never theirs.
 */
const EMPTY: Bootstrap = { settings: {}, nav: [], home: null }

interface SiteValue {
  settings: Settings
  nav: NavItem[]
  home: Page | null
  loading: boolean
  offline: boolean
  refresh: () => void
}

const SiteContext = createContext<SiteValue>({
  ...EMPTY,
  loading: true,
  offline: false,
  refresh: () => {},
})

export function SiteProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap>(EMPTY)
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
        // Live settings only — merging the built-ins underneath would quietly
        // reintroduce stock copy for anything the owner had cleared.
        const settings = b.settings || {}

        // A hand-built menu wins; otherwise the menu is derived from pages.
        const custom = Array.isArray(settings.nav_items) ? settings.nav_items : []
        const usable = custom.filter((i: NavItem) => i?.label?.trim() && i?.href?.trim())

        setData({
          settings,
          // An empty menu means the owner emptied it, not that we should
          // resurrect the built-in one.
          nav: usable.length ? usable : (b.nav ?? []),
          home: b.home ?? null,
        })
        setOffline(false)
      })
      .catch(() => {
        // Only now is the built-in content the best we can do.
        if (cancelled) return
        setData(FALLBACK)
        setOffline(true)
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
