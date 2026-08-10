import { useEffect, useRef, useState } from 'react'
import { Trash2, Upload, Link2, Copy, Check } from 'lucide-react'
import { api } from '../lib/api'
import type { MediaItem } from '../lib/types'
import { Button, Card, Input, INPUT_CLS, MediaThumb } from './ui'

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkKind, setLinkKind] = useState<'image' | 'video' | 'doc'>('video')
  const [filter, setFilter] = useState<'' | 'image' | 'video' | 'doc'>('')
  const [copied, setCopied] = useState<number | null>(null)
  const [optimising, setOptimising] = useState(false)
  const [optimiseMsg, setOptimiseMsg] = useState('')

  // Tracks the most recently issued request so an older, slower response
  // (e.g. from switching filter tabs quickly) can't land after a newer one
  // and show media that doesn't match the currently-selected tab.
  const requestId = useRef(0)
  const load = () => {
    const id = ++requestId.current
    setLoading(true)
    api
      .get<MediaItem[]>(`/admin/media${filter ? `?kind=${filter}` : ''}`)
      .then((r) => {
        if (id === requestId.current) setItems(r)
      })
      .catch((e) => {
        if (id === requestId.current) setError(e.message)
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
  }
  useEffect(load, [filter])

  const upload = async (file: File) => {
    setError('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await api.upload('/admin/media/upload', form)
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const addLink = async () => {
    setError('')
    try {
      await api.post('/admin/media/link', { url: linkUrl, kind: linkKind })
      setLinkUrl('')
      load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const remove = async (m: MediaItem) => {
    if (!confirm('Delete this file? Anything using it will lose the image.')) return
    try {
      await api.del(`/admin/media/${m.id}`)
      setItems((prev) => prev.filter((x) => x.id !== m.id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  /** Converts images uploaded before WebP conversion existed. */
  const optimise = async () => {
    setOptimising(true)
    setOptimiseMsg('')
    try {
      const r = await api.post<{ converted: number; skipped: number; savedBytes: number }>(
        '/admin/optimise'
      )
      const mb = (r.savedBytes / (1024 * 1024)).toFixed(1)
      setOptimiseMsg(
        r.converted === 0
          ? 'Everything is already optimised.'
          : `Converted ${r.converted} image${r.converted === 1 ? '' : 's'} and saved ${mb} MB.`
      )
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setOptimising(false)
    }
  }

  const copy = (m: MediaItem) => {
    const absolute = m.url.startsWith('http') ? m.url : window.location.origin + m.url
    navigator.clipboard?.writeText(absolute)
    setCopied(m.id)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-black">Media</h1>
      <p className="text-sm text-gray-500 mt-1">
        Images, background videos and spec-sheet PDFs.
      </p>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <Card>
          <label className="cursor-pointer block">
            <div className="border-2 border-dashed border-gray-200 rounded-xl px-4 py-6 text-center hover:border-gray-400 transition-colors">
              <Upload size={20} className="mx-auto text-gray-400" />
              <p className="mt-2 text-sm font-medium text-black">
                {uploading ? 'Uploading…' : 'Upload a file'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Images 10 MB · Video 100 MB · PDF 20 MB
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) upload(f)
                e.target.value = ''
              }}
            />
          </label>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-black inline-flex items-center gap-1.5">
            <Link2 size={15} /> Add an external URL
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Best for large background videos hosted on a CDN.
          </p>
          <div className="flex flex-col gap-2 mt-3">
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://cdn.example.com/background.mp4"
            />
            <div className="flex gap-2">
              <select
                value={linkKind}
                onChange={(e) => setLinkKind(e.target.value as any)}
                className={INPUT_CLS}
              >
                <option value="video">Video</option>
                <option value="image">Image</option>
                <option value="doc">Document</option>
              </select>
              <Button onClick={addLink} disabled={!linkUrl.trim()}>
                Add
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-black">Image optimisation</h2>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              New uploads are converted to WebP automatically. Run this once to convert images
              uploaded earlier — originals are kept on disk, so nothing is lost.
            </p>
            {optimiseMsg && <p className="text-sm text-green-700 mt-2">{optimiseMsg}</p>}
          </div>
          <Button type="button" variant="ghost" onClick={optimise} disabled={optimising}>
            {optimising ? 'Converting…' : 'Optimise existing images'}
          </Button>
        </div>
      </Card>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-1.5">
        {[
          { v: '', l: 'All' },
          { v: 'image', l: 'Images' },
          { v: 'video', l: 'Video' },
          { v: 'doc', l: 'Documents' },
        ].map(({ v, l }) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilter(v as any)}
            className={`text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
              filter === v
                ? 'bg-gray-100 text-black border-black'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500 bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
          Nothing uploaded yet.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
                <MediaThumb item={m} />
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-700 truncate" title={m.name}>
                  {m.name}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {m.external ? 'External URL' : `${Math.round(m.size / 1024)} KB`}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <button
                    type="button"
                    onClick={() => copy(m)}
                    className="flex-1 text-xs font-medium text-gray-600 hover:text-black inline-flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    {copied === m.id ? <Check size={12} /> : <Copy size={12} />}
                    {copied === m.id ? 'Copied' : 'Copy URL'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
