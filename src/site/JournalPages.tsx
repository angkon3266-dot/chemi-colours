import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useSite } from '../lib/site'
import type { Post } from '../lib/types'
import PostCard, { postDate } from './PostCard'

const SECTION = 'py-10 sm:py-14 px-4 sm:px-6'
const INNER = 'max-w-6xl mx-auto'

function useDocTitle(title?: string) {
  const { settings } = useSite()
  useEffect(() => {
    if (!title) return
    const site = settings.site_name || ''
    document.title = site ? `${title} — ${site}` : title
  }, [title, settings.site_name])
}

export function JournalList() {
  const [posts, setPosts] = useState<Post[] | null>(null)
  useDocTitle('Journal')

  useEffect(() => {
    api
      .get<Post[]>('/posts')
      .then(setPosts)
      .catch(() => setPosts([]))
  }, [])

  return (
    <section className={SECTION}>
      <div className={INNER}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 mb-3">
          Journal
        </p>
        <h1 className="text-3xl sm:text-5xl font-medium text-black leading-tight">
          Notes from the supply floor
        </h1>

        {posts === null ? (
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="aspect-[16/10] bg-gray-100 animate-pulse" />
                <div className="p-5 space-y-2">
                  <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="mt-8 text-gray-500">No posts published yet.</p>
        ) : (
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function PostDetail() {
  const { slug } = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [notFound, setNotFound] = useState(false)
  useDocTitle(post?.title)

  useEffect(() => {
    let cancelled = false
    setNotFound(false)
    api
      .get<Post>(`/post/${slug}`)
      .then((p) => !cancelled && setPost(p))
      .catch((e) => {
        if (cancelled) return
        setNotFound(e instanceof ApiError ? e.status === 404 : true)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (notFound) {
    return (
      <section className={SECTION}>
        <div className={`${INNER} text-center py-16`}>
          <h1 className="text-2xl font-medium text-black">Post not found</h1>
          <Link to="/journal" className="mt-4 inline-block text-blue-600 hover:underline">
            Back to the journal
          </Link>
        </div>
      </section>
    )
  }

  if (!post) {
    return (
      <section className={SECTION}>
        <div className={`${INNER} max-w-3xl`}>
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="mt-4 h-9 w-3/4 bg-gray-100 rounded animate-pulse" />
        </div>
      </section>
    )
  }

  return (
    <article className={SECTION}>
      <div className={`${INNER} max-w-3xl`}>
        <Link
          to="/journal"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black"
        >
          <ArrowLeft size={15} /> Journal
        </Link>

        <h1 className="mt-5 text-3xl sm:text-4xl font-medium text-black leading-tight">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-gray-400">
          {[postDate(post.publishedAt), post.author].filter(Boolean).join(' · ')}
        </p>

        {post.cover && (
          <img
            src={post.cover}
            alt=""
            className="mt-7 w-full rounded-2xl border border-gray-200 object-cover"
          />
        )}

        {post.excerpt && (
          <p className="mt-7 text-lg text-gray-600 leading-relaxed">{post.excerpt}</p>
        )}

        {post.body && (
          <div
            className="prose-chemi mt-6 text-gray-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.body }}
          />
        )}
      </div>
    </article>
  )
}
