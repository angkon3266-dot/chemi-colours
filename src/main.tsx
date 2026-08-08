import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { SiteProvider } from './lib/site'
import SiteLayout from './site/SiteLayout'
import { DynamicPage, NotFound, ProductDetail } from './site/pages'
import AdminApp from './admin/AdminApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SiteProvider>
        <Routes>
          {/* The admin panel has its own chrome, so it sits outside SiteLayout. */}
          <Route path="/admin/*" element={<AdminApp />} />

          <Route element={<SiteLayout />}>
            <Route path="/" element={<DynamicPage />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/:slug" element={<DynamicPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SiteProvider>
    </BrowserRouter>
  </StrictMode>
)
