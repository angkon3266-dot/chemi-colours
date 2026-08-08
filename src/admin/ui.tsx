import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { X, Upload, Link2, Trash2, Check } from 'lucide-react'
import { api } from '../lib/api'
import type { MediaItem } from '../lib/types'

export const INPUT_CLS =
  'w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition'

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-black">{label}</span>
      {children}
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </label>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT_CLS} ${props.className || ''}`} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={`${INPUT_CLS} resize-y ${props.className || ''}`} />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${INPUT_CLS} ${props.className || ''}`} />
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'subtle'
}) {
  const styles = {
    primary: 'bg-black text-white hover:bg-gray-800',
    ghost: 'bg-white text-gray-800 border border-gray-200 hover:border-gray-400',
    subtle: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  }[variant]
  return (
    <button
      {...props}
      className={`text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 ${styles} ${className}`}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5"
    >
      <span
        className={`w-10 h-6 rounded-full transition-colors relative ${
          checked ? 'bg-black' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
            checked ? 'left-5' : 'left-1'
          }`}
        />
      </span>
      <span className="text-sm text-gray-800">{label}</span>
    </button>
  )
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto bg-black/40">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${
          wide ? 'max-w-4xl' : 'max-w-lg'
        } my-auto`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

/** Small inline status line used by every editor screen. */
export function useSaveState() {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const saved = () => {
    setState('saved')
    setMessage('')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 2500)
  }
  const failed = (m: string) => {
    setState('error')
    setMessage(m)
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const node =
    state === 'saving' ? (
      <span className="text-sm text-gray-500">Saving…</span>
    ) : state === 'saved' ? (
      <span className="text-sm text-green-600 inline-flex items-center gap-1">
        <Check size={15} /> Saved
      </span>
    ) : state === 'error' ? (
      <span className="text-sm text-red-600">{message}</span>
    ) : null

  return { state, setState, saved, failed, node }
}

/* ------------------------------------------------------------ media picker */

export function MediaPicker({
  kind,
  valueId,
  valueUrl,
  onPick,
  label,
}: {
  kind: 'image' | 'video' | 'doc'
  valueId: number | null
  valueUrl?: string
  onPick: (id: number | null, url: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-black">{label}</span>
      <div className="flex items-center gap-3">
        <div className="w-20 h-16 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
          {valueUrl ? (
            kind === 'image' ? (
              <img src={valueUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-gray-500 px-1 text-center break-all">
                {kind === 'video' ? 'Video' : 'PDF'}
              </span>
            )
          ) : (
            <span className="text-xs text-gray-300">None</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
            Choose {kind}
          </Button>
          {valueId && (
            <button
              type="button"
              onClick={() => onPick(null, '')}
              className="text-xs text-gray-400 hover:text-red-600 transition-colors text-left"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {open && (
        <MediaLibraryModal
          kind={kind}
          onClose={() => setOpen(false)}
          onPick={(m) => {
            onPick(m.id, m.url)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

export function MediaLibraryModal({
  kind,
  onClose,
  onPick,
}: {
  kind?: 'image' | 'video' | 'doc'
  onClose: () => void
  onPick: (m: MediaItem) => void
}) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  const load = () => {
    setLoading(true)
    api
      .get<MediaItem[]>(`/admin/media${kind ? `?kind=${kind}` : ''}`)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [kind])

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
      await api.post('/admin/media/link', { url: linkUrl, kind: kind || 'image' })
      setLinkUrl('')
      load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this file permanently?')) return
    try {
      await api.del(`/admin/media/${id}`)
      setItems((prev) => prev.filter((m) => m.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <Modal title="Media library" onClose={onClose} wide>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 cursor-pointer">
            <div className="border-2 border-dashed border-gray-200 rounded-xl px-4 py-4 text-center hover:border-gray-400 transition-colors">
              <Upload size={18} className="mx-auto text-gray-400" />
              <p className="mt-1.5 text-sm font-medium text-black">
                {uploading ? 'Uploading…' : 'Upload a file'}
              </p>
              <p className="text-xs text-gray-400">
                Images up to 10 MB · Video up to 100 MB · PDF up to 20 MB
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

          <div className="flex-1 border border-gray-200 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-sm font-medium text-black inline-flex items-center gap-1.5">
              <Link2 size={15} /> Use an external URL
            </span>
            <div className="flex gap-2">
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://cdn.example.com/video.mp4"
                className={INPUT_CLS}
              />
              <Button type="button" onClick={addLink} disabled={!linkUrl.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-gray-500 py-6 text-center">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            Nothing here yet. Upload a file or add a URL above.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto">
            {items.map((m) => (
              <div
                key={m.id}
                className="group relative rounded-xl border border-gray-200 overflow-hidden hover:border-gray-900 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onPick(m)}
                  className="block w-full text-left"
                >
                  <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden">
                    {m.kind === 'image' ? (
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-500 uppercase">{m.kind}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600 px-2 py-1.5 truncate">{m.name}</p>
                </button>
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  aria-label="Delete file"
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-white/90 text-gray-500 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
