import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import type { Category, NavItem } from '../lib/types'

/**
 * Category tree plus a few products each, fetched once and shared.
 * `children` is optional on Category but always present here, so it is
 * narrowed rather than left possibly-undefined at every use.
 */
export interface MenuCategory extends Omit<Category, 'children'> {
  children: Category[]
  products: { slug: string; name: string; image: string }[]
}

let menuPromise: Promise<MenuCategory[]> | null = null

export function fetchMenuTree(): Promise<MenuCategory[]> {
  if (!menuPromise) {
    menuPromise = api
      .get<MenuCategory[]>('/menu')
      .then((t) => t.map((c) => ({ ...c, children: c.children ?? [], products: c.products ?? [] })))
      .catch(() => {
        menuPromise = null
        return [] as MenuCategory[]
      })
  }
  return menuPromise
}

export function useMenuTree(enabled: boolean) {
  const [tree, setTree] = useState<MenuCategory[]>([])
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetchMenuTree().then((t) => !cancelled && setTree(t))
    return () => {
      cancelled = true
    }
  }, [enabled])
  return tree
}

function isExternal(href: string) {
  return /^https?:\/\//i.test(href)
}

/** Where a category (or sub-category) row sends a visitor: the filterable list. */
function categoryHref(slug: string) {
  return `/products?categories=${encodeURIComponent(slug)}`
}

function Anchor({
  href,
  className,
  color,
  onClick,
  children,
}: {
  href: string
  className?: string
  color?: string
  onClick?: () => void
  children: React.ReactNode
}) {
  if (isExternal(href)) {
    return (
      <a
        href={href}
        className={className}
        style={color ? { color } : undefined}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {children}
      </a>
    )
  }
  return (
    <Link to={href} className={className} style={color ? { color } : undefined} onClick={onClick}>
      {children}
    </Link>
  )
}

/** One category's sub-categories, each linking straight to the filtered list. */
function SubCategoryList({
  category,
  onNavigate,
}: {
  category: MenuCategory
  onNavigate: () => void
}) {
  return (
    <>
      {category.children.length > 0 ? (
        <div className="flex flex-col">
          {category.children.map((sub) => (
            <Link
              key={sub.id}
              to={categoryHref(sub.slug)}
              onClick={onNavigate}
              className="text-sm text-gray-700 hover:text-black py-1.5 whitespace-nowrap"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No sub-categories yet.</p>
      )}
      <Link
        to={categoryHref(category.slug)}
        onClick={onNavigate}
        className="mt-3 pt-3 border-t border-gray-100 block text-sm font-semibold text-gray-700 hover:text-black"
      >
        View all {category.name} →
      </Link>
    </>
  )
}

/**
 * Every top-level category on the left; hovering (or clicking, for touch and
 * keyboard) one shows its sub-categories on the right. Picking a sub-category
 * is what actually leaves the menu — the category itself is just a switch.
 */
function AllCategoriesPanel({
  tree,
  onNavigate,
}: {
  tree: MenuCategory[]
  onNavigate: () => void
}) {
  const [activeSlug, setActiveSlug] = useState(tree[0]?.slug ?? '')
  const active = tree.find((c) => c.slug === activeSlug) ?? tree[0]

  if (tree.length === 0) {
    return <p className="text-sm text-gray-400 min-w-[200px]">No categories yet.</p>
  }

  return (
    <div className="flex">
      <div className="min-w-[180px] pr-4 border-r border-gray-100 flex flex-col">
        {tree.map((c) => (
          <button
            key={c.id}
            type="button"
            onMouseEnter={() => setActiveSlug(c.slug)}
            onClick={() => setActiveSlug(c.slug)}
            aria-current={c.slug === active?.slug}
            className={`flex items-center justify-between gap-2 text-left text-sm px-2.5 py-2 rounded-lg whitespace-nowrap transition-colors ${
              c.slug === active?.slug
                ? 'bg-gray-100 text-black font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {c.name}
            <ChevronRight size={13} className="text-gray-300 shrink-0" />
          </button>
        ))}
      </div>

      <div className="min-w-[200px] pl-4">
        {active && <SubCategoryList category={active} onNavigate={onNavigate} />}
      </div>
    </div>
  )
}

/**
 * A single top-level menu entry. Plain links render as links; entries tied to
 * one category expand into its sub-categories; "all categories" expands into
 * every category with a drill-down; entries with their own child list expand
 * into those.
 */
export default function MenuItem({
  item,
  tree,
  textColor,
  panelBg,
}: {
  item: NavItem
  tree: MenuCategory[]
  textColor: string
  panelBg: string
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)

  const category =
    item.type === 'category' ? tree.find((c) => c.slug === item.categorySlug) : undefined
  const manual = item.type === 'manual' ? item.children ?? [] : []
  const showAll = item.type === 'all-categories'
  const hasPanel = !!category || manual.length > 0 || (showAll && tree.length > 0)

  // Close on outside click and on Escape — a hover-only menu is unusable
  // by keyboard and on touch.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const linkCls = 'text-sm font-medium hover:opacity-60 transition-opacity whitespace-nowrap'

  if (!hasPanel) {
    return (
      <Anchor href={item.href} className={linkCls} color={textColor}>
        {item.label}
      </Anchor>
    )
  }

  return (
    <div
      ref={wrap}
      className="relative"
      onMouseEnter={() => {
        window.clearTimeout(closeTimer.current)
        setOpen(true)
      }}
      onMouseLeave={() => {
        // Small delay so the pointer can cross the gap to the panel.
        closeTimer.current = window.setTimeout(() => setOpen(false), 120)
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`${linkCls} inline-flex items-center gap-1`}
        style={{ color: textColor }}
      >
        {item.label}
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          style={{ backgroundColor: panelBg }}
          className="collapse-in absolute left-1/2 -translate-x-1/2 top-full mt-3 z-40 rounded-2xl shadow-xl border border-black/10 p-4 min-w-[260px] max-w-[92vw]"
        >
          {showAll ? (
            <AllCategoriesPanel tree={tree} onNavigate={() => setOpen(false)} />
          ) : category ? (
            <div className="min-w-[200px]">
              <SubCategoryList category={category} onNavigate={() => setOpen(false)} />
            </div>
          ) : (
            <div className="flex flex-col min-w-[180px]">
              {manual.map((c, i) => (
                <Anchor
                  key={i}
                  href={c.href}
                  onClick={() => setOpen(false)}
                  className="text-sm text-gray-700 hover:text-black py-1.5 whitespace-nowrap"
                >
                  {c.label}
                </Anchor>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
