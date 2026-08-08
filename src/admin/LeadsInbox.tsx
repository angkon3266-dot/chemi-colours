import { useEffect, useState } from 'react'
import { Trash2, Mail, Archive, MailOpen } from 'lucide-react'
import { api } from '../lib/api'
import type { Lead } from '../lib/types'

const TABS = [
  { v: 'new', l: 'New' },
  { v: 'read', l: 'Read' },
  { v: 'archived', l: 'Archived' },
  { v: '', l: 'All' },
] as const

export default function LeadsInbox() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<string>('new')

  useEffect(() => {
    api
      .get<Lead[]>('/admin/leads')
      .then(setLeads)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const setStatus = async (l: Lead, status: Lead['status']) => {
    try {
      await api.patch(`/admin/leads/${l.id}`, { status })
      setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, status } : x)))
    } catch (e: any) {
      setError(e.message)
    }
  }

  const remove = async (l: Lead) => {
    if (!confirm('Delete this enquiry permanently?')) return
    try {
      await api.del(`/admin/leads/${l.id}`)
      setLeads((prev) => prev.filter((x) => x.id !== l.id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  const visible = tab ? leads.filter((l) => l.status === tab) : leads

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-black">Enquiries</h1>
      <p className="text-sm text-gray-500 mt-1">
        Every message sent through the website contact form.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-1.5">
        {TABS.map(({ v, l }) => {
          const count = v ? leads.filter((x) => x.status === v).length : leads.length
          return (
            <button
              key={v}
              type="button"
              onClick={() => setTab(v)}
              className={`text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                tab === v
                  ? 'bg-gray-100 text-black border-black'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              {l} ({count})
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500 bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
          Nothing here.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {visible.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-black">{l.name || 'Someone'}</h2>
                    {l.status === 'new' && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        New
                      </span>
                    )}
                  </div>
                  <a
                    href={`mailto:${l.email}`}
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {l.email}
                  </a>
                  {l.company && <p className="text-sm text-gray-500">{l.company}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`mailto:${l.email}`}
                    className="w-9 h-9 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 flex items-center justify-center"
                    aria-label="Reply by email"
                  >
                    <Mail size={16} />
                  </a>
                  {l.status !== 'read' && (
                    <button
                      type="button"
                      onClick={() => setStatus(l, 'read')}
                      className="w-9 h-9 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 flex items-center justify-center"
                      aria-label="Mark as read"
                    >
                      <MailOpen size={16} />
                    </button>
                  )}
                  {l.status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => setStatus(l, 'archived')}
                      className="w-9 h-9 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 flex items-center justify-center"
                      aria-label="Archive"
                    >
                      <Archive size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(l)}
                    className="w-9 h-9 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {l.message && (
                <p className="mt-3 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {l.message}
                </p>
              )}

              {l.services?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.services.map((s) => (
                    <span
                      key={s}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-3 text-xs text-gray-400">
                {new Date(l.createdAt.replace(' ', 'T')).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
