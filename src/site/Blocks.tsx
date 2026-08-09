import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { api } from '../lib/api'
import { useSite } from '../lib/site'
import { resolveCta, mapEmbedUrl, mapLinkUrl } from '../lib/contact'
import type { CtaAction } from '../lib/contact'
import type { Block, Category, Post, Product } from '../lib/types'
import PostCard from './PostCard'
import ContactForm from './ContactForm'
import ProductCard from './ProductCard'
import ParallaxCategories from './ParallaxCategories'
import ProductFilter from './ProductFilter'
import { gridColsClass } from '../lib/grid'

const SECTION = 'py-12 sm:py-16 px-4 sm:px-6'
const INNER = 'max-w-6xl mx-auto'

/** Where the hero button sits when it is not tucked under the headline. */
const CTA_POSITIONS: Record<string, string> = {
  center: 'inset-0 flex items-center justify-center',
  'top-left': 'top-24 sm:top-28 left-0',
  'top-right': 'top-24 sm:top-28 right-0',
  'bottom-center': 'bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2',
}

/* ------------------------------------------------------------------ hero -- */
function Hero({ data }: { data: Record<string, any> }) {
  const { settings, loading } = useSite()
  // A custom clip only wins when one is actually set. Switching the toggle off
  // without picking a video used to leave the hero with no video at all, which
  // looked like the background had vanished.
  const custom = ((data.videoUrl as string) || '').trim()
  const videoUrl = data.useSiteVideo === false && custom ? custom : settings.hero_video_url
  const poster = settings.hero_poster_url || undefined
  // Wait for the real settings before mounting any <video>, so the configured
  // clip is the only one that ever appears.
  const showVideo = !loading && !!videoUrl

  const showCta = !!data.ctaEnabled && !!data.ctaLabel
  const ctaPosition = (data.ctaPosition as string) || 'headline'

  return (
    // Viewport height is a MINIMUM, not a lock: with the contact form expanded
    // a hard height squashed the card to nothing on short screens.
    <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden min-h-[calc(100vh-24px)] sm:min-h-[calc(100vh-32px)] md:min-h-[calc(100vh-48px)]">
      {showVideo ? (
        <video
          key={videoUrl}
          src={videoUrl}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-900" />
      )}
      <div className="absolute inset-0 bg-black/20" />

      {/* Free-floating placements. `top-*` clears the fixed menu bar.
          pointer-events-none is essential: the centred variant is a full-size
          `inset-0` layer above the content, and without it the wrapper
          swallowed every click in the hero — form toggle, inputs and all. */}
      {showCta && ctaPosition !== 'headline' && (
        <div
          className={`absolute z-20 px-4 sm:px-6 md:px-8 pointer-events-none ${
            CTA_POSITIONS[ctaPosition] ?? CTA_POSITIONS.center
          }`}
        >
          <HeroCta data={data} />
        </div>
      )}

      <div className="relative z-10 flex flex-col min-h-[calc(100vh-24px)] sm:min-h-[calc(100vh-32px)] md:min-h-[calc(100vh-48px)] p-4 sm:p-6 md:p-8 gap-6">
        <div className="flex-1 min-h-[5rem]" />

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="lg:max-w-lg xl:max-w-2xl shrink-0">
            <p className="text-white text-3xl sm:text-4xl xl:text-5xl font-medium leading-tight drop-shadow-lg">
              {data.headline}
              <br />
              {data.headline2}{' '}
              {data.accent && (
                <span
                  style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontStyle: 'italic',
                    fontWeight: 400,
                  }}
                >
                  {data.accent}
                </span>
              )}
            </p>
            {showCta && ctaPosition === 'headline' && <HeroCta data={data} />}
          </div>

          {data.showForm !== false && (
            <div className="w-full lg:w-[min(480px,45%)] shrink-0">
              <ContactForm collapsible />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

const CTA_STYLES: Record<string, string> = {
  white: 'bg-white text-black hover:bg-gray-100',
  black: 'bg-black text-white hover:bg-gray-800',
  outline: 'bg-transparent text-white border-2 border-white hover:bg-white hover:text-black',
}

/** Configurable button over the hero video: link, WhatsApp, call, email or form. */
function HeroCta({ data }: { data: Record<string, any> }) {
  const { settings } = useSite()
  const { href, external, scroll } = resolveCta(
    settings,
    data.ctaAction as CtaAction,
    data.ctaHref
  )
  if (!href) return null

  const style = CTA_STYLES[data.ctaStyle as string] || CTA_STYLES.white
  // Only the in-flow placement needs the gap under the headline.
  const spacing = (data.ctaPosition || 'headline') === 'headline' ? 'mt-7' : ''
  // pointer-events-auto re-enables clicks on the button itself, since the
  // free-floating wrapper deliberately lets clicks pass through.
  const cls = `${spacing} pointer-events-auto inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-2xl transition-colors shadow-lg ${style}`

  if (scroll) {
    return (
      <button
        type="button"
        onClick={() =>
          document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth' })
        }
        className={cls}
      >
        {data.ctaLabel}
      </button>
    )
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {data.ctaLabel}
      </a>
    )
  }
  return (
    <Link to={href} className={cls}>
      {data.ctaLabel}
    </Link>
  )
}

/* -------------------------------------------------------------- pagehero -- */
function PageHero({ data }: { data: Record<string, any> }) {
  return (
    <section className="px-4 sm:px-6 pt-8 pb-6 sm:pt-14 sm:pb-10">
      <div className={INNER}>
        {data.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 mb-3">
            {data.eyebrow}
          </p>
        )}
        <h1 className="text-3xl sm:text-5xl font-medium text-black leading-tight max-w-3xl">
          {data.title}
        </h1>
        {data.subtitle && (
          <p className="mt-4 text-base sm:text-lg text-gray-500 leading-relaxed max-w-2xl">
            {data.subtitle}
          </p>
        )}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- richtext -- */
function RichText({ data }: { data: Record<string, any> }) {
  return (
    <section className={SECTION}>
      <div className={`${INNER} max-w-3xl`}>
        {data.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 mb-3">
            {data.eyebrow}
          </p>
        )}
        {data.title && (
          <h2 className="text-2xl sm:text-3xl font-medium text-black mb-5 leading-snug">
            {data.title}
          </h2>
        )}
        {data.html && (
          <div
            className="prose-chemi text-gray-600 leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ __html: data.html }}
          />
        )}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- features -- */
function Features({ data }: { data: Record<string, any> }) {
  const items: any[] = Array.isArray(data.items) ? data.items : []
  return (
    <section className={SECTION}>
      <div className={INNER}>
        {data.title && (
          <h2 className="text-2xl sm:text-3xl font-medium text-black mb-8">{data.title}</h2>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {items.map((it, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 p-5 sm:p-6 hover:border-gray-400 transition-colors"
            >
              <h3 className="text-base font-semibold text-black mb-2">{it.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{it.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------- stats -- */
function Stats({ data }: { data: Record<string, any> }) {
  const items: any[] = Array.isArray(data.items) ? data.items : []
  return (
    <section className={SECTION}>
      <div className={INNER}>
        {data.title && (
          <h2 className="text-2xl sm:text-3xl font-medium text-black mb-8">{data.title}</h2>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl bg-gray-50 border border-gray-100 p-5 sm:p-6">
              <div className="text-2xl sm:text-4xl font-medium text-black">{it.value}</div>
              <div className="mt-1.5 text-sm text-gray-500 leading-snug">{it.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- timeline -- */
function Timeline({ data }: { data: Record<string, any> }) {
  const items: any[] = Array.isArray(data.items) ? data.items : []
  return (
    <section className={SECTION}>
      <div className={`${INNER} max-w-3xl`}>
        {data.title && (
          <h2 className="text-2xl sm:text-3xl font-medium text-black mb-8">{data.title}</h2>
        )}
        <div className="flex flex-col">
          {items.map((it, i) => (
            <div key={i} className="flex gap-5 sm:gap-8">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-black mt-2 shrink-0" />
                {i < items.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
              </div>
              <div className="pb-8">
                <div className="text-sm font-semibold text-gray-400">{it.year}</div>
                <h3 className="text-base font-semibold text-black mt-1">{it.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mt-1">{it.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- product grid -- */
function ProductGrid({ data }: { data: Record<string, any> }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const showFilter = !!data.showFilter

  // The mega menu and category dropdowns link straight here with
  // ?categories=slug, so the filter has to read the URL, not just local
  // clicks — and write back to it so the selection survives a refresh,
  // the back button, and is shareable.
  const [searchParams, setSearchParams] = useSearchParams()
  const [selected, setSelectedState] = useState<string[]>(() =>
    showFilter ? (searchParams.get('categories')?.split(',').filter(Boolean) ?? []) : []
  )
  const urlCategories = searchParams.get('categories')

  useEffect(() => {
    if (!showFilter) return
    const next = urlCategories ? urlCategories.split(',').filter(Boolean) : []
    setSelectedState((prev) => (prev.join(',') === next.join(',') ? prev : next))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCategories, showFilter])

  const setSelected = (next: string[]) => {
    setSelectedState(next)
    if (!showFilter) return
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next.length) p.set('categories', next.join(','))
        else p.delete('categories')
        return p
      },
      { replace: true }
    )
  }

  useEffect(() => {
    const params = new URLSearchParams()
    if (data.mode === 'featured') params.set('featured', '1')
    if (selected.length) params.set('categories', selected.join(','))
    if (data.limit) params.set('limit', String(data.limit))

    setLoading(true)
    let cancelled = false
    api
      .get<Product[]>(`/products?${params.toString()}`)
      .then((p) => !cancelled && setProducts(p))
      .catch(() => !cancelled && setProducts([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [data.mode, data.limit, selected])

  useEffect(() => {
    if (!showFilter) return
    let cancelled = false
    fetchCategories().then((c) => !cancelled && setCategories(c))
    return () => {
      cancelled = true
    }
  }, [showFilter])

  // Admin picks the desktop column count; mobile/tablet scale down using the
  // same sensible rule the category tiles use, rather than a hard-coded
  // single column that made the grid look oversized on phones.
  const cols = gridColsClass(data.columns, '3')

  const grid = loading ? (
    <div className={`grid ${cols} gap-4 sm:gap-5`}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  ) : products.length === 0 ? (
    <p className="text-gray-500 text-sm">
      {selected.length > 0
        ? 'No products match these filters.'
        : 'No products to show yet. Add them from the admin panel.'}
    </p>
  ) : (
    <div className={`grid ${cols} gap-4 sm:gap-5`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )

  return (
    <section className={SECTION}>
      <div className={INNER}>
        {(data.title || data.subtitle) && (
          <div className="mb-8">
            {data.title && (
              <h2 className="text-2xl sm:text-3xl font-medium text-black">{data.title}</h2>
            )}
            {data.subtitle && <p className="mt-2 text-gray-500">{data.subtitle}</p>}
          </div>
        )}

        {showFilter && categories.length > 0 && (
          <div className="mb-6">
            <ProductFilter
              categories={categories}
              selected={selected}
              onChange={setSelected}
              resultCount={products.length}
            />
          </div>
        )}
        <p className="text-sm text-gray-400 mb-4">
          {loading ? 'Loading…' : `${products.length} product${products.length === 1 ? '' : 's'}`}
        </p>
        {grid}
      </div>
    </section>
  )
}

/* --------------------------------------------------- categories / parallax -- */
/**
 * One in-flight request shared by every block on the page. Several blocks want
 * the category tree, and each was firing its own identical request.
 */
let categoriesPromise: Promise<Category[]> | null = null

function fetchCategories(): Promise<Category[]> {
  if (!categoriesPromise) {
    categoriesPromise = api.get<Category[]>('/categories').catch(() => {
      categoriesPromise = null // let a later mount retry
      return [] as Category[]
    })
  }
  return categoriesPromise
}

function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((c) => !cancelled && setCategories(c))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])
  return { categories, loading }
}

/** Grid of main categories, sub-categories, or products — with images. */
function CategoryGrid({ data }: { data: Record<string, any> }) {
  const { categories, loading } = useCategories()
  const [products, setProducts] = useState<Product[]>([])
  const source = data.source || 'main'
  const cols = gridColsClass(data.columns, '4')

  useEffect(() => {
    if (source !== 'products') return
    const params = new URLSearchParams()
    if (data.limit) params.set('limit', String(data.limit))
    api
      .get<Product[]>(`/products?${params}`)
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [source, data.limit])

  let tiles: { key: string; name: string; image: string; sub: string; to: string }[] = []

  if (source === 'products') {
    tiles = products.map((p) => ({
      key: `p${p.id}`,
      name: p.name,
      image: p.image,
      sub: p.category,
      to: `/products/${p.slug}`,
    }))
  } else if (source === 'sub') {
    tiles = categories
      .flatMap((c) => (c.children || []).map((s) => ({ parent: c, sub: s })))
      .map(({ parent, sub }) => ({
        key: `s${sub.id}`,
        name: sub.name,
        image: sub.image || '',
        sub: `${sub.productCount ?? 0} products`,
        to: `/category/${parent.slug}/${sub.slug}`,
      }))
  } else {
    tiles = categories.map((c) => ({
      key: `c${c.id}`,
      name: c.name,
      image: c.image || '',
      sub: c.childCount
        ? `${c.childCount} sub-categor${c.childCount === 1 ? "y" : "ies"}`
        : `${c.productCount ?? 0} products`,
      to: `/category/${c.slug}`,
    }))
  }

  if (data.limit && source !== 'products') tiles = tiles.slice(0, Number(data.limit))

  return (
    <section className={SECTION}>
      <div className={INNER}>
        {(data.title || data.subtitle) && (
          <div className="mb-8">
            {data.title && (
              <h2 className="text-2xl sm:text-3xl font-medium text-black">{data.title}</h2>
            )}
            {data.subtitle && <p className="mt-2 text-gray-500">{data.subtitle}</p>}
          </div>
        )}

        {loading && source !== 'products' ? (
          <div className={`grid ${cols} gap-4 sm:gap-5`}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
                <div className="p-4 h-16" />
              </div>
            ))}
          </div>
        ) : tiles.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing to show yet. Add items in the admin panel.</p>
        ) : (
          <div className={`grid ${cols} gap-4 sm:gap-5`}>
            {tiles.map((t) => (
              <Link
                key={t.key}
                to={t.to}
                className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-gray-400 hover:shadow-lg transition-all"
              >
                <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                  {t.image ? (
                    <img
                      src={t.image}
                      alt={t.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-base font-semibold text-black">{t.name}</h3>
                  {t.sub && <p className="text-sm text-gray-500 mt-0.5">{t.sub}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/** Alternating scroll-reveal list of main categories. */
function Parallax({ data }: { data: Record<string, any> }) {
  const { categories, loading } = useCategories()
  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-16 max-w-6xl mx-auto">
        <div className="h-72 bg-gray-50 rounded-2xl animate-pulse" />
      </div>
    )
  }
  return (
    <ParallaxCategories categories={categories} title={data.title} subtitle={data.subtitle} />
  )
}

/* -------------------------------------------------- director's message --- */
function Director({ data }: { data: Record<string, any> }) {
  return (
    <section className={SECTION}>
      <div className={`${INNER} grid lg:grid-cols-[320px_1fr] gap-8 lg:gap-14 items-start`}>
        <div className="flex flex-col gap-4">
          {data.image ? (
            <img
              src={data.image}
              alt={data.name || ''}
              className="w-full aspect-[3/4] object-cover rounded-2xl"
            />
          ) : (
            <div className="w-full aspect-[3/4] rounded-2xl bg-gray-100 flex items-center justify-center text-gray-300 text-sm">
              No photo
            </div>
          )}
          {(data.name || data.role) && (
            <div>
              {data.name && <p className="font-semibold text-black">{data.name}</p>}
              {data.role && <p className="text-sm text-gray-500">{data.role}</p>}
            </div>
          )}
        </div>

        <div>
          {data.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 mb-3">
              {data.eyebrow}
            </p>
          )}
          {data.title && (
            <h2 className="text-2xl sm:text-3xl font-medium text-black mb-5 leading-snug">
              {data.title}
            </h2>
          )}
          {data.html && (
            <div
              className="prose-chemi text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: data.html }}
            />
          )}
          {data.signature && (
            <img src={data.signature} alt="" className="mt-6 h-14 object-contain" />
          )}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- gallery -- */
function Gallery({ data }: { data: Record<string, any> }) {
  const images: any[] = Array.isArray(data.images) ? data.images : []
  return (
    <section className={SECTION}>
      <div className={INNER}>
        {data.title && (
          <h2 className="text-2xl sm:text-3xl font-medium text-black mb-8">{data.title}</h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {images.map((img, i) => {
            const item = typeof img === 'string' ? { url: img } : img
            const hasCaption = item.title || item.description
            return (
              <figure key={i} className="flex flex-col">
                <div className="rounded-2xl overflow-hidden bg-gray-50 aspect-[4/3]">
                  <img
                    src={item.url}
                    alt={item.alt || item.title || ''}
                    loading="lazy"
                    className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
                {hasCaption && (
                  <figcaption className="mt-3">
                    {item.title && (
                      <h3 className="text-base font-semibold text-black">{item.title}</h3>
                    )}
                    {item.description && (
                      <p className="text-sm text-gray-500 leading-relaxed mt-1">
                        {item.description}
                      </p>
                    )}
                  </figcaption>
                )}
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------- cta -- */
const CTA_BUTTON_SIZE: Record<string, string> = {
  sm: 'text-xs px-4 py-2.5 rounded-xl',
  md: 'text-sm px-6 py-3.5 rounded-2xl',
  lg: 'text-base px-8 py-4 rounded-2xl',
}

function Cta({ data }: { data: Record<string, any> }) {
  const bg = data.bgColor || '#000000'
  const text = data.textColor || '#ffffff'
  const btnBg = data.buttonBgColor || '#ffffff'
  const btnText = data.buttonTextColor || '#000000'
  const size = CTA_BUTTON_SIZE[data.size as string] || CTA_BUTTON_SIZE.md
  const centered = data.layout === 'centered'

  const button = data.buttonText && (
    <Link
      to={data.buttonHref || '/contact'}
      style={{ backgroundColor: btnBg, color: btnText }}
      className={`shrink-0 font-semibold text-center transition-opacity hover:opacity-85 ${size}`}
    >
      {data.buttonText}
    </Link>
  )

  return (
    <section className="px-4 sm:px-6 py-8 sm:py-12">
      <div
        style={{ backgroundColor: bg, color: text }}
        className={`${INNER} rounded-2xl sm:rounded-3xl px-6 sm:px-10 py-10 sm:py-14 flex gap-6 ${
          centered
            ? 'flex-col items-center text-center'
            : 'flex-col lg:flex-row lg:items-center lg:justify-between'
        }`}
      >
        <div className={centered ? 'max-w-xl' : 'max-w-xl'}>
          <h2 className="text-2xl sm:text-3xl font-medium leading-snug">{data.title}</h2>
          {data.text && (
            <p className="mt-3 leading-relaxed" style={{ opacity: 0.75 }}>
              {data.text}
            </p>
          )}
        </div>
        {button}
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- contact -- */
function ContactBlock({ data }: { data: Record<string, any> }) {
  return (
    <section id="enquiry" className={SECTION}>
      <div className={`${INNER} grid lg:grid-cols-2 gap-8 items-start`}>
        <div>
          {data.title && (
            <h2 className="text-2xl sm:text-3xl font-medium text-black">{data.title}</h2>
          )}
          {data.text && <p className="mt-3 text-gray-500 leading-relaxed">{data.text}</p>}
        </div>
        <ContactForm collapsible={false} defaultOpen />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------- faq -- */
function Faq({ data }: { data: Record<string, any> }) {
  const items: any[] = Array.isArray(data.items) ? data.items : []
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className={SECTION}>
      <div className={`${INNER} max-w-3xl`}>
        {data.title && (
          <h2 className="text-2xl sm:text-3xl font-medium text-black mb-8">{data.title}</h2>
        )}
        <div className="flex flex-col gap-2">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm sm:text-base font-medium text-black">{it.q}</span>
                <span className="text-gray-400 text-xl leading-none shrink-0">
                  {open === i ? '−' : '+'}
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{it.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------- logos -- */
function Logos({ data }: { data: Record<string, any> }) {
  const items: any[] = Array.isArray(data.items) ? data.items : []
  return (
    <section className="px-4 sm:px-6 py-10">
      <div className={INNER}>
        {data.title && (
          <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 mb-6">
            {data.title}
          </p>
        )}
        {/* Certification/partner marks need to actually be legible — the old
            h-7/h-9 size plus grayscale + 60% opacity made them nearly
            invisible, which defeats the point of showing them at all. */}
        <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16">
          {items.map((it, i) => (
            <img
              key={i}
              src={typeof it === 'string' ? it : it.url}
              alt={typeof it === 'string' ? '' : it.alt || ''}
              loading="lazy"
              className="h-14 sm:h-20 object-contain"
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------- map -- */
function MapBlock({ data }: { data: Record<string, any> }) {
  const embed = mapEmbedUrl(data.mapUrl)
  const link = mapLinkUrl(data.mapUrl)
  if (!embed) return null

  return (
    <section className={SECTION}>
      <div className={INNER}>
        {(data.title || data.address) && (
          <div className="mb-6">
            {data.title && (
              <h2 className="text-2xl sm:text-3xl font-medium text-black">{data.title}</h2>
            )}
            {data.address && (
              <p className="mt-2 text-gray-500 whitespace-pre-line">{data.address}</p>
            )}
          </div>
        )}
        <div className="rounded-2xl overflow-hidden border border-gray-200">
          <iframe
            src={embed}
            title={data.title || 'Location map'}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="w-full h-[300px] sm:h-[420px] border-0"
          />
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-black transition-colors"
          >
            <MapPin size={15} /> Get directions
          </a>
        )}
      </div>
    </section>
  )
}


/* ---------------------------------------------------------- testimonials -- */
function Testimonials({ data }: { data: Record<string, any> }) {
  const items: any[] = Array.isArray(data.items) ? data.items : []
  if (items.length === 0) return null
  return (
    <section className={SECTION}>
      <div className={INNER}>
        {data.title && (
          <h2 className="text-2xl sm:text-3xl font-medium text-black mb-8">{data.title}</h2>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {items.map((t, i) => (
            <figure
              key={i}
              className="rounded-2xl border border-gray-200 p-5 sm:p-6 flex flex-col gap-4"
            >
              <blockquote className="text-gray-700 leading-relaxed">“{t.quote}”</blockquote>
              <figcaption className="mt-auto flex items-center gap-3">
                {t.logo && (
                  <img src={t.logo} alt="" className="w-9 h-9 rounded-lg object-contain bg-gray-50" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-black truncate">{t.name}</div>
                  {t.role && <div className="text-xs text-gray-500 truncate">{t.role}</div>}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- latest posts -- */
function PostsBlock({ data }: { data: Record<string, any> }) {
  const [posts, setPosts] = useState<Post[]>([])
  useEffect(() => {
    api
      .get<Post[]>(`/posts?limit=${Number(data.limit) || 3}`)
      .then(setPosts)
      .catch(() => setPosts([]))
  }, [data.limit])

  if (posts.length === 0) return null
  return (
    <section className={SECTION}>
      <div className={INNER}>
        <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            {data.title && (
              <h2 className="text-2xl sm:text-3xl font-medium text-black">{data.title}</h2>
            )}
            {data.subtitle && <p className="mt-2 text-gray-500">{data.subtitle}</p>}
          </div>
          <Link to="/journal" className="text-sm font-semibold text-gray-700 hover:text-black">
            All posts →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- renderer -- */
export function BlockRenderer({ block }: { block: Block }) {
  const d = block.data || {}
  switch (block.type) {
    case 'hero':
      return <Hero data={d} />
    case 'pagehero':
      return <PageHero data={d} />
    case 'richtext':
      return <RichText data={d} />
    case 'features':
      return <Features data={d} />
    case 'stats':
      return <Stats data={d} />
    case 'timeline':
      return <Timeline data={d} />
    case 'product_grid':
      return <ProductGrid data={d} />
    case 'gallery':
      return <Gallery data={d} />
    case 'cta':
      return <Cta data={d} />
    case 'contact':
      return <ContactBlock data={d} />
    case 'faq':
      return <Faq data={d} />
    case 'logos':
      return <Logos data={d} />
    case 'category_grid':
      return <CategoryGrid data={d} />
    case 'parallax':
      return <Parallax data={d} />
    case 'director':
      return <Director data={d} />
    case 'map':
      return <MapBlock data={d} />
    case 'testimonials':
      return <Testimonials data={d} />
    case 'posts':
      return <PostsBlock data={d} />
    default:
      return null
  }
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockRenderer key={b.id ?? i} block={b} />
      ))}
    </>
  )
}
