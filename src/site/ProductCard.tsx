import { Link } from 'react-router-dom'
import type { Product } from '../lib/types'

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to={`/products/${product.slug}`}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:border-gray-400 hover:shadow-lg transition-all"
    >
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: '#f3f4f6' }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="p-4 flex flex-col gap-1.5 flex-1">
        {product.category && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            {product.category}
          </span>
        )}
        <h3 className="text-base font-semibold text-black leading-snug">{product.name}</h3>
        {product.ciName && <p className="text-xs text-gray-500">C.I. {product.ciName}</p>}
        {product.summary && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mt-0.5">
            {product.summary}
          </p>
        )}
        <span className="mt-auto pt-3 text-sm font-medium text-black group-hover:underline">
          View details →
        </span>
      </div>
    </Link>
  )
}
