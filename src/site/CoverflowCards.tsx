import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CARD_ICONS, isExternalHref } from './blockShared'

export interface CoverflowItem {
  image?: string
  icon?: string
  title?: string
  text?: string
  href?: string
}

// Tuned for this site's cards rather than exposed as block-editor fields —
// an admin picking a "falloff exponent" is a support ticket waiting to
// happen. These are the values worth touching if the effect ever needs a
// different feel; everything else on the physics side follows from them.
const ROTATE = 40 // degrees the first neighbour tilts
const DEPTH = 0.55 // how far the first neighbour recedes, as a fraction of card width
const PERSPECTIVE = 2.6 // viewer distance as a multiple of card width — smaller is a wider lens
const FALLOFF = 0.56 // exponent on distance; below 1 the rake eases off as cards travel out
const FADE = 0.12 // opacity lost per step from the centre
const GAP = 0.08 // space between cards, as a fraction of card width
const CARD_WIDTH = 'clamp(200px, 62vw, 320px)'

/**
 * Coverflow-style carousel: drag, click, or arrow-key through a ring of
 * cards that tilt and recede in 3D toward the centre. Ported from a
 * shadcn-style reference component and adapted to this codebase (no
 * "use client", no cn()/@/lib/utils — this project doesn't use shadcn) and
 * to this site's actual card content (photo, icon badge, title, divider,
 * description) instead of the reference's plain album-cover image.
 *
 * The animation runs by writing transforms straight to the DOM on every
 * frame rather than through React state — at 60fps that's the difference
 * between smooth and janky, and React never needs to know the in-between
 * positions, only which card is currently centred.
 */
export default function CoverflowCards({ items }: { items: CoverflowItem[] }) {
  const count = items.length
  const navigate = useNavigate()

  const frameRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  /** Fractional card index at the centre. The single source of truth. */
  const posRef = useRef(0)
  /** Where the current settle is headed. Stepping off `pos` instead would
      swallow a keypress that lands mid-flight, before the round-off moves. */
  const targetRef = useRef(0)
  const widthRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const dragRef = useRef<{ id: number; x: number; pos: number; v: number; t: number; moved: boolean } | null>(null)

  const [selected, setSelected] = useState(0)

  /** Nearest whole card, folded back into 0..count-1. */
  const indexAt = useCallback((pos: number) => ((Math.round(pos) % count) + count) % count, [count])

  const paint = useCallback(() => {
    const width = widthRef.current
    if (!width) return
    const pitch = width * (1 + GAP)
    const pos = posRef.current

    cardRefs.current.forEach((card, index) => {
      if (!card) return

      // Fold the distance into the shorter way round the ring. This is the
      // whole looping mechanism — no cloned nodes, no shuffling the DOM.
      let offset = index - pos
      offset = ((offset % count) + count) % count
      if (offset > count / 2) offset -= count

      const distance = Math.abs(offset)
      // Both the tilt and the recession ease off as cards travel out —
      // doubling the distance adds only about half again as much of each.
      // A linear ramp folds the second card shut; this keeps it readable.
      const ramp = Math.pow(distance, FALLOFF)
      const tilt = Math.min(ROTATE * ramp, 82) * Math.sign(offset)

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-DEPTH * width * ramp}px) rotateY(${-tilt}deg)`

      // A card is teleported across the ring at exactly half a turn out, so
      // it has to be gone by then or the jump is visible.
      const edge = Math.min(1, Math.max(0, count / 2 - distance))
      card.style.opacity = String(Math.max(0, 1 - FADE * distance) * edge)
      card.style.zIndex = String(100 - Math.round(distance))
    })
  }, [count])

  const settle = useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      targetRef.current = target
      setSelected(indexAt(target))

      const step = () => {
        const remaining = target - posRef.current
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target
          paint()
          rafRef.current = null
          return
        }
        posRef.current += remaining * 0.16
        paint()
        rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    },
    [indexAt, paint]
  )

  const goTo = useCallback(
    (index: number) => {
      // Take the shorter way round rather than unwinding the whole ring.
      const target = index + Math.round((targetRef.current - index) / count) * count
      settle(target)
    },
    [count, settle]
  )

  const nudge = useCallback((by: number) => settle(Math.round(targetRef.current) + by), [settle])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    targetRef.current = posRef.current
    dragRef.current = { id: event.pointerId, x: event.clientX, pos: posRef.current, v: 0, t: performance.now(), moved: false }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return

    const pitch = widthRef.current * (1 + GAP)
    if (!pitch) return

    const now = performance.now()
    const previous = posRef.current
    const dx = event.clientX - drag.x
    if (Math.abs(dx) > 4) drag.moved = true
    posRef.current = drag.pos - dx / pitch
    // Cards per second, for the throw.
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000
    drag.t = now

    const index = indexAt(posRef.current)
    if (index !== selected) setSelected(index)
    paint()
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    dragRef.current = null
    // Let a flick carry, but never more than two cards.
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18))
    settle(Math.round(posRef.current + carried))
  }

  const onCardClick = (index: number, href?: string) => {
    // Mid-drag clicks are a throw, not a tap — the pointerup above already
    // handled where that lands.
    if (dragRef.current?.moved) return
    if (index !== selected) {
      goTo(index)
      return
    }
    if (!href) return
    if (isExternalHref(href)) {
      window.open(href, '_blank', 'noopener,noreferrer')
    } else {
      navigate(href.startsWith('/') ? href : `/${href}`)
    }
  }

  // Card width drives pitch, depth and perspective, so it is the only thing
  // worth measuring — and only when the box actually changes.
  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    const measure = () => {
      const card = cardRefs.current[0]
      if (!card) return
      widthRef.current = card.offsetWidth
      paint()
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [paint])

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    []
  )

  if (count === 0) return null

  return (
    <div className="w-full" style={{ ['--cf-card' as string]: CARD_WIDTH }}>
      <div className="relative">
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              nudge(-1)
            } else if (event.key === 'ArrowRight') {
              event.preventDefault()
              nudge(1)
            }
          }}
          role="region"
          aria-roledescription="carousel"
          aria-label="Applications we serve"
          // Vertical padding keeps the drop shadows clear of the overflow clip.
          className="cursor-grab overflow-hidden py-6 sm:py-10 outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing"
          style={{ perspective: `calc(var(--cf-card) * ${PERSPECTIVE})`, touchAction: 'pan-y' }}
        >
          <div className="relative select-none" style={{ height: 'var(--cf-card)', transformStyle: 'preserve-3d' }}>
            {items.map((item, index) => {
              const Icon = CARD_ICONS[item.icon as string]
              return (
                <div
                  key={index}
                  ref={(node) => {
                    cardRefs.current[index] = node
                  }}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${count}${item.title ? `: ${item.title}` : ''}`}
                  onClick={() => onCardClick(index, item.href)}
                  className="group absolute left-1/2 top-0 aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-xl will-change-transform cursor-pointer"
                  style={{ width: 'var(--cf-card)' }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 h-full w-full select-none object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(135deg, rgb(var(--c-primary)), rgb(var(--c-gray-900)))' }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

                  <div className="relative h-full flex flex-col p-5 pointer-events-none">
                    {Icon && (
                      <span className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center shadow-sm">
                        <Icon size={20} className="text-accent" strokeWidth={1.75} />
                      </span>
                    )}
                    <div className="mt-auto">
                      <h3 className="text-white text-lg sm:text-xl font-semibold leading-snug drop-shadow-sm">
                        {item.title}
                      </h3>
                      {item.text && (
                        <>
                          <span className="block w-8 h-px bg-white/60 my-2.5" />
                          <p className="text-white/85 text-sm leading-relaxed line-clamp-3">{item.text}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => nudge(-1)}
              className="absolute left-1 sm:left-3 top-1/2 z-[200] -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-black flex items-center justify-center hover:bg-white transition-colors shadow"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => nudge(1)}
              className="absolute right-1 sm:right-3 top-1/2 z-[200] -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 text-black flex items-center justify-center hover:bg-white transition-colors shadow"
            >
              <ChevronRight size={17} />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-2 -mt-1 sm:mt-1">
          {items.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to ${index + 1}`}
              aria-current={index === selected}
              className={`h-1.5 rounded-full transition-all ${
                index === selected ? 'w-6 bg-black' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
