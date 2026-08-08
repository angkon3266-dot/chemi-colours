import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { Category } from '../lib/types'

/**
 * One category row. Each row owns its own scroll hooks — the original snippet
 * called useRef/useScroll inside a .map(), which breaks the rules of hooks as
 * soon as the list length changes (and ours is loaded from the API).
 */
function ParallaxRow({ category, index }: { category: Category; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reverse = index % 2 === 1

  // Reveal as the row enters the viewport rather than when its centre reaches
  // the top — the original offset meant scrolling most of a screen on mobile
  // before anything appeared.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.7], [0, 1])
  const clipPath = useTransform(
    scrollYProgress,
    [0, 0.7],
    ['inset(0 100% 0 0)', 'inset(0 0% 0 0)']
  )
  const y = useTransform(scrollYProgress, [0, 1], [-40, 0])

  return (
    <div
      ref={ref}
      className={`flex ${
        reverse ? 'flex-row-reverse' : 'flex-row'
      } items-center justify-center gap-5 sm:gap-10 md:gap-20 lg:gap-32 py-8 sm:py-14 md:py-24 md:min-h-[80vh]`}
    >
      <motion.div style={{ y }} className="flex-1 min-w-0 md:max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
          {String(index + 1).padStart(2, '0')}
        </p>
        <h3 className="mt-2 sm:mt-3 text-2xl sm:text-4xl lg:text-5xl font-medium text-black leading-tight break-words">
          {category.name}
        </h3>
        {category.summary && (
          // break-words: a long unbroken string would otherwise run past the
          // column and slide under the image.
          <p className="mt-4 sm:mt-5 text-sm sm:text-base text-gray-500 leading-relaxed break-words line-clamp-4">
            {category.summary}
          </p>
        )}
        <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-400">
          {category.childCount
            ? `${category.childCount} sub-categor${category.childCount === 1 ? 'y' : 'ies'}`
            : `${category.productCount} product${category.productCount === 1 ? '' : 's'}`}
        </p>
        <Link
          to={`/category/${category.slug}`}
          className="mt-4 sm:mt-6 inline-flex items-center gap-2 bg-black text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl hover:bg-gray-800 transition-colors"
        >
          Explore <ArrowRight size={15} />
        </Link>
      </motion.div>

      <motion.div style={{ opacity, clipPath }} className="relative shrink-0">
        <Link to={`/category/${category.slug}`} className="block">
          {category.image ? (
            <img
              src={category.image}
              alt={category.name}
              loading="lazy"
              className="w-32 sm:w-56 md:w-80 lg:w-96 aspect-square object-cover rounded-2xl"
            />
          ) : (
            <div className="w-32 sm:w-56 md:w-80 lg:w-96 aspect-square rounded-2xl bg-gray-100 flex items-center justify-center">
              <span className="text-gray-300 text-xs sm:text-sm text-center px-2">No image yet</span>
            </div>
          )}
        </Link>
      </motion.div>
    </div>
  )
}

export default function ParallaxCategories({
  categories,
  title,
  subtitle,
}: {
  categories: Category[]
  title?: string
  subtitle?: string
}) {
  if (categories.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-12">
        No categories yet. Add them from the admin panel.
      </p>
    )
  }

  return (
    <div className="px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {(title || subtitle) && (
          <div className="pt-8 pb-2 text-center">
            {title && (
              <h2 className="text-2xl sm:text-3xl font-medium text-black">{title}</h2>
            )}
            {subtitle && <p className="mt-2 text-gray-500">{subtitle}</p>}
          </div>
        )}
        {categories.map((c, i) => (
          <ParallaxRow key={c.id} category={c} index={i} />
        ))}
      </div>
    </div>
  )
}
