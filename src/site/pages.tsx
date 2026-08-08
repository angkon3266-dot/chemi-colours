import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useSite } from '../lib/site'
import type { Page, Product } from '../lib/types'
import { Blocks } from './Blocks'
import ContactForm from './ContactForm'
import ContactActions from './ContactActions'

function useDocTitle(title?: string) {
  const { settings } = useSite()
  useEffect(() => {
    const site = settings.site_name || ''
    document.title = title ? `${title} — ${site}` : site
  }, [title, settings.site_name])
}

function Loading() {
  return (
    <div className="px-4 sm:px-6 py-20">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="h-8 w-56 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-80 bg-gray-100 rounded animate-pulse" />
        <div className="h-64 w-full bg-gray-50 rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}

export function NotFound() {
  useDocTitle('Page not found')
  return (
    <div className="px-4 sm:px-6 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">404</p>
      <h1 className="mt-3 text-3xl sm:text-4xl font-medium text-black">
        We couldn't find that page
      </h1>
      <p className="mt-3 text-gray-500">It may have been moved or renamed.</p>
      <Link
        to="/"
        className="inline-block mt-7 bg-black text-white text-sm font-semibold px-6 py-3 rounded-2xl hover:bg-gray-800 transition-colors"
      >
        Back to home
      </Link>
    </div>
  )
}

/** Renders any CMS page, including the home page. */
export function DynamicPage() {
  const { slug } = useParams()
  const { home, loading: siteLoading } = useSite()
  const isHome = !slug

  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(!isHome)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (isHome) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    api
      .get<Page>(`/page/${slug}`)
      .then((p) => !cancelled && setPage(p))
      .catch((e) => {
        if (cancelled) return
        if (e instanceof ApiError && e.status === 404) setNotFound(true)
        else setNotFound(true)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [slug, isHome])

  const active = isHome ? home : page
  useDocTitle(active?.metaTitle || active?.title)

  if (isHome ? siteLoading && !home : loading) return <Loading />
  if (notFound || !active) return <NotFound />

  return <Blocks blocks={active.blocks || []} />
}

/** Product detail page: /products/:slug */
export function ProductDetail() {
  const { slug } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [enquirySignal, setEnquirySignal] = useState(0)

  /** Opens the enquiry form and brings it into view. */
  const openEnquiry = () => {
    setEnquirySignal((n) => n + 1)
    requestAnimationFrame(() =>
      document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth' })
    )
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<Product>(`/product/${slug}`)
      .then((p) => !cancelled && setProduct(p))
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [slug])

  useDocTitle(product?.name)

  if (loading) return <Loading />
  if (notFound || !product) return <NotFound />

  const specs: [string, string][] = [
    ['Category', product.category],
    ['C.I. name', product.ciName],
    ['CAS number', product.casNo],
    ['Shade', product.shadeName],
    ['Light fastness', product.fastness.light],
    ['Wash fastness', product.fastness.wash],
    ['Rub fastness', product.fastness.rub],
  ].filter(([, v]) => (v || '').trim() !== '') as [string, string][]

  return (
    <div className="px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors"
        >
          <ArrowLeft size={15} /> All products
        </Link>

        <div className="mt-6 grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-50 aspect-[4/3]">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: product.shadeHex || '#f3f4f6' }}
                />
              )}
            </div>
            {product.gallery.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {product.gallery.map((g, i) => (
                  <div key={i} className="rounded-xl overflow-hidden bg-gray-50 aspect-square">
                    <img src={g} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            {product.category && (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                {product.category}
              </p>
            )}
            <h1 className="mt-2 text-3xl sm:text-4xl font-medium text-black leading-tight">
              {product.name}
            </h1>

            {product.shadeHex && (
              <div className="mt-4 flex items-center gap-2.5">
                <span
                  className="w-9 h-9 rounded-full border-2 border-white shadow ring-1 ring-gray-200"
                  style={{ backgroundColor: product.shadeHex }}
                />
                <span className="text-sm text-gray-500">
                  {product.shadeName || product.shadeHex}
                </span>
              </div>
            )}

            {product.summary && (
              <p className="mt-5 text-gray-600 leading-relaxed">{product.summary}</p>
            )}

            {specs.length > 0 && (
              <dl className="mt-7 rounded-2xl border border-gray-200 divide-y divide-gray-100">
                {specs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-sm text-gray-500">{k}</dt>
                    <dd className="text-sm font-medium text-black text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            {product.fibres.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-black mb-2">Suitable for</h2>
                <div className="flex flex-wrap gap-1.5">
                  {product.fibres.map((f) => (
                    <span
                      key={f}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Direct contact routes, so a buyer never has to hunt for a form. */}
            <div className="mt-7">
              <ContactActions subject={product.name} onEnquire={openEnquiry} />
            </div>

            {product.specSheet && (
              <a
                href={product.specSheet}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-black transition-colors"
              >
                <FileText size={16} /> Download spec sheet
              </a>
            )}
          </div>
        </div>

        {(product.description || product.application) && (
          <div className="mt-12 grid lg:grid-cols-2 gap-8 lg:gap-12">
            {product.description && (
              <div>
                <h2 className="text-xl font-medium text-black mb-3">Description</h2>
                <div
                  className="prose-chemi text-gray-600 leading-relaxed space-y-3"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
            {product.application && (
              <div>
                <h2 className="text-xl font-medium text-black mb-3">Application notes</h2>
                <div
                  className="prose-chemi text-gray-600 leading-relaxed space-y-3"
                  dangerouslySetInnerHTML={{ __html: product.application }}
                />
              </div>
            )}
          </div>
        )}

        {/* Collapsed by default: the buttons above are the primary route, and
            the form should not dominate the page. */}
        <div id="enquiry" className="mt-14 grid lg:grid-cols-2 gap-8 items-start scroll-mt-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-medium text-black">
              Enquire about {product.name}
            </h2>
            <p className="mt-3 text-gray-500 leading-relaxed">
              Tell us your substrate and volume — we'll send pricing and a technical data sheet.
            </p>
            <div className="mt-6">
              <ContactActions subject={product.name} size="sm" />
            </div>
          </div>
          <ContactForm
            collapsible
            defaultOpen={false}
            subject={product.name}
            openSignal={enquirySignal}
          />
        </div>
      </div>
    </div>
  )
}
