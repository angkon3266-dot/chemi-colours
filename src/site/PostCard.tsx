import { Link } from 'react-router-dom'
import type { Post } from '../lib/types'

export function postDate(value: string | null): string {
  if (!value) return ''
  const d = new Date(value.replace(' ', 'T'))
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PostCard({ post }: { post: Post }) {
  return (
    <Link
      to={`/journal/${post.slug}`}
      className="group rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:border-gray-400 transition-colors"
    >
      <div className="aspect-[16/10] bg-gray-50 overflow-hidden">
        {post.cover ? (
          <img
            src={post.cover}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        {post.publishedAt && (
          <span className="text-xs text-gray-400">{postDate(post.publishedAt)}</span>
        )}
        <h3 className="font-semibold text-black leading-snug">{post.title}</h3>
        {post.excerpt && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{post.excerpt}</p>
        )}
        <span className="mt-auto pt-3 text-sm font-semibold text-gray-700 group-hover:text-black">
          Read more →
        </span>
      </div>
    </Link>
  )
}
