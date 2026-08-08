import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import FloatingContact from './FloatingContact'

export default function SiteLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-screen bg-white p-3 sm:p-4 md:p-6">
      {/* Fixed so the menu stays reachable all the way down the page. The
          padding mirrors the page gutter so the bar lines up with content. */}
      <div className="fixed inset-x-0 top-0 z-30 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pointer-events-none">
        <div className="pointer-events-auto">
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
