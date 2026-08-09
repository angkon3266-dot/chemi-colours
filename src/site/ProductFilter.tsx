import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { Category } from '../lib/types'

/**
 * Checkbox filter over categories and their sub-categories.
 * Sidebar on desktop, slide-up drawer on mobile.
 */
export default function ProductFilter({
  categories,
  selected,
  onChange,
  resultCount,
}: {
  categories: Category[]
  selected: string[]
  onChange: (next: string[]) => void
  resultCount: number
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const toggle = (slug: string) =>
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug])

  const body = (
    <div className="flex flex-col gap-5">
      {categories.map((cat) => (
        <div key={cat.id}>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={selected.includes(cat.slug)}
              onChange={() => toggle(cat.slug)}
              className="w-4 h-4 rounded border-gray-300 text-black focus:ring-gray-900 cursor-pointer"
            />
            <span className="text-sm font-semibold text-black group-hover:opacity-70">
              {cat.name}
            </span>
            <span className="ml-auto text-xs text-gray-400 tabular-nums">
              {cat.productCount}
            </span>
          </label>

          {(cat.children?.length ?? 0) > 0 && (
            <div className="mt-2 ml-6 flex flex-col gap-2">
              {cat.children!.map((sub) => (
                <label key={sub.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selected.includes(sub.slug)}
                    onChange={() => toggle(sub.slug)}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-gray-900 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-black">{sub.name}</span>
                  <span className="ml-auto text-xs text-gray-400 tabular-nums">
                    {sub.productCount}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="self-start text-sm font-medium text-gray-500 hover:text-black underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-24">
          <h3 className="text-sm font-semibold text-black mb-4">Filter by category</h3>
          {body}
        </div>
      </aside>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="lg:hidden inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-400 transition-colors"
      >
        <SlidersHorizontal size={15} />
        Filter
        {selected.length > 0 && (
          <span className="ml-1 bg-black text-white text-xs rounded-full px-2 py-0.5">
            {selected.length}
          </span>
        )}
      </button>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative w-full max-h-[80vh] overflow-y-auto bg-white rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-black">Filter by category</h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {body}
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="mt-6 w-full bg-black text-white text-sm font-semibold py-3 rounded-2xl hover:bg-gray-800 transition-colors"
            >
              Show {resultCount} product{resultCount === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
