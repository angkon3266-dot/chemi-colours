import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useSite } from '../lib/site'
import Navbar from './Navbar'
import Footer from './Footer'
import FloatingContact from './FloatingContact'

/** Horizontal placement of the floating menu bar. */
const NAV_ALIGN: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
}

/** Neutral holding screen: no chrome, so nothing renders half-empty. */
function Booting() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg viewBox="0 0 256 256" className="w-9 h-9 animate-pulse" aria-hidden="true">
          <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z" fill="#111827" />
          <path d="M 256 128 L 128 128 L 0 0 L 128 0 Z" fill="#111827" />
        </svg>
        <span className="sr-only">Loading</span>
      </div>
    </div>
  )
}

/** Shown when the API is unreachable. Says so plainly instead of inventing a site. */
function Offline({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold text-black">This site is not loading</h1>
        <p className="mt-2 text-sm text-gray-500">
          We could not reach the server. Please check your connection and try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-2xl hover:bg-gray-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

export default function SiteLayout() {
  const { pathname } = useLocation()
  const { loading, offline, refresh, settings } = useSite()
  const isHome = pathname === '/'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Hold the chrome back until there is real content for it. Rendering an
  // empty menu and footer first made a working site look broken.
  if (loading) return <Booting />
  if (offline) return <Offline onRetry={refresh} />

  return (
    <div className="min-h-screen bg-white p-3 sm:p-4 md:p-6">
      {/* Fixed so the menu stays reachable all the way down the page. The
          padding mirrors the page gutter so the bar lines up with content. */}
      <div
        className={`fixed inset-x-0 top-0 z-30 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pointer-events-none flex ${
          NAV_ALIGN[settings.nav_align || 'left'] ?? NAV_ALIGN.left
        }`}
      >
        <div className="pointer-events-auto w-full sm:w-auto">
          <Navbar variant={isHome ? 'overlay' : 'solid'} />
        </div>
      </div>

      <div className="relative">
        {/* The hero fills the screen and sits under the floating bar, so only
            inner pages need to reserve room for it. */}
        <div className={isHome ? '' : 'pt-16 sm:pt-20'}>
          <Outlet />
        </div>
      </div>

      <Footer />
      <FloatingContact />
    </div>
  )
}
