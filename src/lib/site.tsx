import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { Bootstrap, Page, Settings, NavItem } from './types'

/**
 * There is no built-in copy of the site any more. Every headline, menu item,
 * address and label comes from the database, so nothing can be shown that the
 * owner did not write. If the API cannot be reached the site says so rather
 * than inventing content.
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
        // Stay empty and flag it: an honest "cannot load" beats invented copy.
        if (cancelled) return
        setData(EMPTY)
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
