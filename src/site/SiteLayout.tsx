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
      <div className="relative">
        {/* On the home page the bar floats over the video, exactly as designed. */}
        <div
          className={
            isHome
              ? 'absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 md:p-8'
              : 'mb-4 sm:mb-6'
          }
        >
          <Navbar variant={isHome ? 'overlay' : 'solid'} />
        </div>
        <Outlet />
      </div>
      <Footer />
      <FloatingContact />
    </div>
  )
}
