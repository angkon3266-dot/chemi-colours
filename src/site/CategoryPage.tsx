import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import { useSite } from '../lib/site'
import type { Category, CategoryView } from '../lib/types'
import ProductCard from './ProductCard'
import { NotFound } from './pages'

function CategoryTile({ category, base }: { category: Category; base: string }) {
  return (
    <Link
      to={`${base}/${category.slug}`}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-gray-400 hover:shadow-lg transition-all"
    >
      <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
            No image
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <h3 className="text-base font-semibold text-black">{category.name}</h3>
        {category.summary && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{category.summary}</p>
        )}
        <span className="mt-auto pt-3 text-sm font-medium text-black inline-flex items-center gap-1">
          {category.childCount
            ? `${category.childCount} sub-categor${category.childCount === 1 ? "y" : "ies"}`
            : `${category.productCount} products`}
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  )
}

export default function CategoryPage() {
  const { slug, sub } = useParams()
  const { settings } = useSite()
  const [data, setData] = useState<CategoryView | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    api
      .get<CategoryView>(`/category/${slug}${sub ? `/${sub}` : ''}`)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [slug, sub])

  const active = data?.subcategory || data?.category

  useEffect(() => {
    const site = settings.site_name || ''
    document.title = active ? `${active.name} — ${site}` : site
  }, [active, settings.site_name])

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-20 max-w-6xl mx-auto space-y-4">
        <div className="h-8 w-56 bg-gray-100 rounded animate-pulse" />
        <div className="h-64 w-full bg-gray-50 rounded-2xl animate-pulse" />
      </div>
    )
  }
  if (notFound || !data || !active) return <NotFound />

  const showChildren = !data.subcategory && data.children.length > 0

  return (
    <div className="px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 flex-wrap">
          <Link to="/products" className="inline-flex items-center gap-1.5 hover:text-black transition-colors">
            <ArrowLeft size={15} /> All categories
          </Link>
          {data.subcategory && (
            <>
              <ChevronRight size={14} className="text-gray-300" />
              <Link
                to={`/category/${data.category.slug}`}
                className="hover:text-black transition-colors"
              >
                {data.category.name}
              </Link>
            </>
          )}
        </nav>

        <header className="mt-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-5xl font-medium text-black leading-tight">
              {active.name}
            </h1>
            {active.summary && (
              <p className="mt-4 text-base sm:text-lg text-gray-500 leading-relaxed">
                {active.summary}
              </p>
            )}
          </div>
          {active.image && (
            <img
              src={active.image}
              alt={active.name}
              className="w-full lg:w-64 aspect-[4/3] object-cover rounded-2xl shrink-0"
            />
          )}
        </header>

        {active.description && (
          <div
            className="prose-chemi mt-8 text-gray-600 leading-relaxed max-w-3xl"
            dangerouslySetInnerHTML={{ __html: active.description }}
          />
        )}

        {showChildren && (
          <section className="mt-12">
            <h2 className="text-xl font-medium text-black mb-5">Browse by type</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {data.children.map((c) => (
                <CategoryTile key={c.id} category={c} base={`/category/${data.category.slug}`} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-12">
          {showChildren && data.products.length > 0 && (
            <h2 className="text-xl font-medium text-black mb-5">All products in this category</h2>
          )}
          {data.products.length === 0 ? (
            !showChildren && (
              <p className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                No products in this category yet.
              </p>
            )
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {data.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
