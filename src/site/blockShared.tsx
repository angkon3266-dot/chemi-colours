import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Shirt, Layers, LayoutGrid, Sofa, Waves, Zap,
  Droplet, Droplets, Package, Sparkles, Palette, Home, Scissors, Umbrella,
} from 'lucide-react'

/**
 * Shared between Blocks.tsx and CoverflowCards.tsx — pulled out rather than
 * exported from Blocks.tsx so neither file has to import the other back.
 */

export const SECTION = 'py-12 sm:py-16 px-4 sm:px-6'
export const INNER = 'max-w-6xl mx-auto'

/** Kept intentionally small — a handful of shapes that read cleanly at 20px
    inside a badge, covering the textile/apparel vocabulary this site's cards
    actually use, rather than exposing the whole lucide set as raw text keys
    admins would have to spell correctly. */
export const CARD_ICONS: Record<string, typeof Shirt> = {
  shirt: Shirt,
  layers: Layers,
  weave: LayoutGrid,
  sofa: Sofa,
  waves: Waves,
  zap: Zap,
  droplet: Droplet,
  droplets: Droplets,
  package: Package,
  sparkles: Sparkles,
  palette: Palette,
  home: Home,
  scissors: Scissors,
  umbrella: Umbrella,
}

/**
 * Link fields in the block editor accept anything the owner types. An absolute
 * URL leaves the site and needs a real anchor; everything else is an in-app
 * route and has to go through the router, or it forces a full page reload.
 */
export function SmartLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  if (/^(https?:)?\/\//i.test(href) || /^(mailto:|tel:)/i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link to={href.startsWith('/') ? href : `/${href}`} className={className}>
      {children}
    </Link>
  )
}

/** Same routing rule as SmartLink, for places (like a draggable coverflow
    card) where a nested <a> is fragile and a programmatic navigate reads
    more reliably against pointer-drag handling on an ancestor. */
export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//i.test(href) || /^(mailto:|tel:)/i.test(href)
}
