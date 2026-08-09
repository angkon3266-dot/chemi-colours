/**
 * Fills the space where a product photo would go, for products that have none
 * yet. Shows the product name (and category, if known) on a soft colour
 * derived from the name itself, so every card still looks distinct and
 * identifiable rather than a row of identical grey boxes.
 */

/** Deterministic hash → hue, so the same product always gets the same colour. */
function hueFromName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0
  }
  return h % 360
}

export default function ProductPlaceholder({
  name,
  category,
  className = '',
}: {
  name: string
  category?: string
  className?: string
}) {
  const hue = hueFromName(name || 'product')

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center text-center px-4 gap-1 ${className}`}
      style={{ backgroundColor: `hsl(${hue}, 42%, 93%)` }}
      aria-hidden="true"
    >
      <span
        className="font-semibold leading-snug line-clamp-3 text-sm sm:text-base"
        style={{ color: `hsl(${hue}, 45%, 28%)` }}
      >
        {name}
      </span>
      {category && (
        <span
          className="text-[11px] sm:text-xs font-medium uppercase tracking-wide opacity-80 line-clamp-1"
          style={{ color: `hsl(${hue}, 35%, 38%)` }}
        >
          {category}
        </span>
      )}
    </div>
  )
}
