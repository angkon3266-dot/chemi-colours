import { useEffect, useState } from 'react'
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react'
import { api } from '../lib/api'
import type { Category, NavItem, PageSummary } from '../lib/types'
import { Button, Field, Input, Select } from './ui'

function move<T>(list: T[], i: number, dir: -1 | 1, commit: (next: T[]) => void) {
  const j = i + dir
  if (j < 0 || j >= list.length) return
  const next = [...list]
  ;[next[i], next[j]] = [next[j], next[i]]
  commit(next)
}

/**
 * Builds the top menu. Each entry is a plain link, a dropdown driven by a
 * category, or a dropdown of hand-written links.
 */
export default function MenuEditor({
  items,
  onChange,
}: {
  items: NavItem[]
  onChange: (next: NavItem[]) => void
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [pages, setPages] = useState<PageSummary[]>([])

  useEffect(() => {
    api.get<Category[]>('/categories').then(setCategories).catch(() => setCategories([]))
    api.get<PageSummary[]>('/admin/pages').then(setPages).catch(() => setPages([]))
  }, [])

  const patch = (i: number, changes: Partial<NavItem>) =>
    onChange(items.map((x, k) => (k === i ? { ...x, ...changes } : x)))

  /** Seed the menu from the pages currently in the automatic navigation. */
  const startFromPages = () => {
    const derived: NavItem[] = pages
      .filter((p) => p.status === 'published' && Number(p.in_nav) === 1)
      .sort((a, b) => Number(a.nav_order) - Number(b.nav_order))
      .map((p) => ({
        label: p.nav_label || p.title,
        href: Number(p.is_home) === 1 ? '/' : `/${p.slug}`,
        type: 'link' as const,
      }))
    onChange(derived)
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center">
        <p className="text-sm text-gray-500">
          The menu is being built automatically from your published pages.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Take control to add dropdowns. You can always empty it again to go back to automatic.
        </p>
        <div className="flex gap-2 justify-center mt-4 flex-wrap">
          <Button type="button" onClick={startFromPages} disabled={pages.length === 0}>
            Start from my pages
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange([{ label: '', href: '/', type: 'link' }])}
          >
            Start empty
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const type = item.type || 'link'
        const children = item.children ?? []
        return (
          <div key={i} className="rounded-xl border border-gray-200 p-3 flex flex-col gap-3">
            <div className="flex gap-2 items-start">
              <div className="flex-1 grid sm:grid-cols-2 gap-2">
                <Input
                  value={item.label}
                  onChange={(e) => patch(i, { label: e.target.value })}
                  placeholder="Menu label"
                />
                <Select
                  value={type}
                  onChange={(e) => {
                    const next = e.target.value as NavItem['type']
                    // Clear the fields the previous type owned, so switching
                    // back and forth never leaves stale data behind.
                    patch(i, {
                      type: next,
                      categorySlug: next === 'category' ? item.categorySlug : undefined,
                      children: next === 'manual' ? item.children : undefined,
                      href: next === 'all-categories' ? '/products' : item.href,
                    })
                  }}
                >
                  <option value="link">Plain link</option>
                  <option value="category">Dropdown from a category</option>
                  <option value="all-categories">Dropdown of all categories</option>
                  <option value="manual">Dropdown of my own links</option>
                </Select>
              </div>
              <div className="flex shrink-0">
                <button
                  type="button"
                  onClick={() => move(items, i, -1, onChange)}
                  className="w-9 h-9 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 flex items-center justify-center"
                  aria-label="Move up"
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => move(items, i, 1, onChange)}
                  className="w-9 h-9 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 flex items-center justify-center"
                  aria-label="Move down"
                >
                  <ChevronDown size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, k) => k !== i))}
                  className="w-9 h-9 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                  aria-label="Remove item"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {type === 'category' ? (
              <Field
                label="Which category"
                hint="Its sub-categories appear in the dropdown; picking one goes to the filtered product list."
              >
                <Select
                  value={item.categorySlug || ''}
                  onChange={(e) => {
                    const slug = e.target.value
                    patch(i, {
                      categorySlug: slug,
                      href: slug ? `/products?categories=${slug}` : '/products',
                    })
                  }}
                >
                  <option value="">Choose a category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : type === 'all-categories' ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5">
                Every category is listed automatically, with its sub-categories in a flyout.
                Nothing to configure here — add or edit categories under{' '}
                <span className="font-medium text-gray-700">Products → Categories</span>.
              </p>
            ) : type === 'manual' ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-black">Dropdown links</span>
                  <span className="text-xs text-gray-400">
                    Clicking the top item goes to {item.href || '/'}
                  </span>
                </div>
                <Input
                  value={item.href}
                  onChange={(e) => patch(i, { href: e.target.value })}
                  placeholder="Top-level link, e.g. /products"
                />
                {children.map((c, j) => (
                  <div key={j} className="flex gap-2 pl-4">
                    <Input
                      value={c.label}
                      onChange={(e) =>
                        patch(i, {
                          children: children.map((x, k) =>
                            k === j ? { ...x, label: e.target.value } : x
                          ),
                        })
                      }
                      placeholder="Label"
                    />
                    <Input
                      value={c.href}
                      onChange={(e) =>
                        patch(i, {
                          children: children.map((x, k) =>
                            k === j ? { ...x, href: e.target.value } : x
                          ),
                        })
                      }
                      placeholder="/link"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patch(i, { children: children.filter((_, k) => k !== j) })
                      }
                      className="w-9 h-9 shrink-0 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                      aria-label="Remove link"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  className="self-start ml-4"
                  onClick={() => patch(i, { children: [...children, { label: '', href: '' }] })}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Plus size={14} /> Add dropdown link
                  </span>
                </Button>
              </div>
            ) : (
              <Field label="Link target">
                <Input
                  value={item.href}
                  onChange={(e) => patch(i, { href: e.target.value })}
                  placeholder="/products"
                />
              </Field>
            )}
          </div>
        )
      })}

      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onChange([...items, { label: '', href: '/', type: 'link' }])}
        >
          <span className="inline-flex items-center gap-1.5">
            <Plus size={15} /> Add menu item
          </span>
        </Button>
        <Button type="button" variant="ghost" onClick={() => onChange([])}>
          Back to automatic menu
        </Button>
      </div>
    </div>
  )
}
