import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'
import type { MediaItem, Post } from '../lib/types'
import RichTextEditor from './RichTextEditor'
import {
  Button, Card, Field, Input, Modal, Select, Textarea, useSaveState, MediaPicker,
} from './ui'

/* --------------------------------------------------------------- the list */

export function PostsList() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    api
      .get<Post[]>('/admin/posts')
      .then(setPosts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const create = async () => {
    try {
      const r = await api.post<{ id: number }>('/admin/posts', {
        title: newTitle,
        status: 'draft',
      })
      navigate(`/admin/journal/${r.id}`)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const remove = async (p: Post) => {
    if (!confirm(`Delete "${p.title}"?`)) return
    try {
      await api.del(`/admin/posts/${p.id}`)
      setPosts((prev) => prev.filter((x) => x.id !== p.id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-black">Journal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Articles help you show up in Google for the problems your buyers search.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <span className="inline-flex items-center gap-1.5">
            <Plus size={16} /> New post
          </span>
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500 bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
          No posts yet.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {posts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-gray-200 px-4 py-3.5 flex items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/admin/journal/${p.id}`}
                    className="font-medium text-black hover:underline"
                  >
                    {p.title}
                  </Link>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                      p.status === 'published'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">/journal/{p.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(p)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                aria-label="Delete post"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="New post" onClose={() => setCreating(false)}>
          <div className="flex flex-col gap-4">
            <Field label="Post title">
              <Input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. How to store reactive dyes in humid weather"
              />
            </Field>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button onClick={create} disabled={!newTitle.trim()}>
                Create
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ------------------------------------------------------------- the editor */

export function PostEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const save = useSaveState()
  const [post, setPost] = useState<Post | null>(null)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<Post>(`/admin/posts/${id}`),
      api.get<MediaItem[]>('/admin/media?kind=image'),
    ])
      .then(([p, m]) => {
        setPost(p)
        setMedia(m)
      })
      .catch((e) => save.failed(e.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const set = (k: keyof Post, v: any) => setPost((prev) => (prev ? { ...prev, [k]: v } : prev))

  const submit = async () => {
    if (!post) return
    save.setState('saving')
    try {
      await api.put(`/admin/posts/${id}`, post)
      save.saved()
    } catch (e: any) {
      save.failed(e.message)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>
  if (!post) return <p className="text-sm text-red-600">Could not load this post.</p>

  const coverUrl = post.coverId
    ? media.find((m) => Number(m.id) === Number(post.coverId))?.url || ''
    : ''

  return (
    <div className="max-w-3xl pb-24">
      <Link
        to="/admin/journal"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black"
      >
        <ArrowLeft size={15} /> All posts
      </Link>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold text-black">{post.title || 'Untitled post'}</h1>
        <div className="flex items-center gap-3">
          {save.node}
          <Button onClick={submit} disabled={save.state === 'saving'}>
            Save
          </Button>
        </div>
      </div>

      <Card className="mt-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Title">
              <Input value={post.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
          </div>
          <Field label="Status">
            <Select value={post.status} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published</option>
            </Select>
          </Field>
          <Field label="Author">
            <Input value={post.author} onChange={(e) => set('author', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="Excerpt"
              hint="Shown on cards and used as the description when the link is shared."
            >
              <Textarea
                rows={2}
                value={post.excerpt}
                onChange={(e) => set('excerpt', e.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <MediaPicker
              kind="image"
              label="Cover image"
              valueId={post.coverId ?? null}
              valueUrl={coverUrl}
              onPick={(mid) => set('coverId', mid)}
            />
          </div>
          <div className="sm:col-span-2">
            <span className="text-sm font-medium text-black">Body</span>
            <p className="text-xs text-gray-400 mt-0.5 mb-2">
              Headings, bold/italic/underline, lists, quotes, links, and images — drag an
              image in, paste one, or use the image button to upload or pick from your library.
            </p>
            <RichTextEditor
              value={post.body}
              onChange={(html) => set('body', html)}
              placeholder="Write the post…"
            />
          </div>
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-3 lg:pl-64">
        {save.node}
        <Button variant="ghost" onClick={() => navigate('/admin/journal')}>
          Back
        </Button>
        <Button onClick={submit} disabled={save.state === 'saving'}>
          Save
        </Button>
      </div>
    </div>
  )
}
