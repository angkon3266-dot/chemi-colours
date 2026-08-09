import { useEffect, useState } from 'react'
import { Users, Eye, Globe, Smartphone } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from './ui'

interface Summary {
  days: number
  views: number
  visitors: number
  direct: number
  byDay: { day: string; views: number; visitors: number }[]
  topPages: { path: string; views: number; visitors: number }[]
  referrers: { host: string; views: number }[]
  devices: { device: string; views: number }[]
}

const RANGES = [
  { v: 7, l: '7 days' },
  { v: 30, l: '30 days' },
  { v: 90, l: '90 days' },
  { v: 365, l: '1 year' },
]

/** Simple bar chart — no charting library for a handful of daily totals. */
function DailyChart({ data }: { data: Summary['byDay'] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No visits recorded yet.</p>
  }
  const max = Math.max(...data.map((d) => d.views), 1)

  return (
    <div className="flex items-end gap-[3px] h-40" role="img" aria-label="Daily visits">
      {data.map((d) => (
        <div key={d.day} className="flex-1 min-w-0 group relative flex flex-col justify-end h-full">
          <div
            className="w-full bg-gray-900 rounded-t group-hover:bg-blue-600 transition-colors"
            style={{ height: `${Math.max((d.views / max) * 100, 2)}%` }}
          />
          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap bg-black text-white text-[11px] rounded-md px-2 py-1 z-10">
            {d.day}: {d.views} views · {d.visitors} visitors
          </div>
        </div>
      ))}
    </div>
  )
}

function Bars({
  rows,
  labelOf,
  total,
  empty,
}: {
  rows: { key: string; label: string; value: number }[]
  labelOf?: (k: string) => string
  total: number
  empty: string
}) {
  if (rows.length === 0) return <p className="text-sm text-gray-500">{empty}</p>
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-gray-700 truncate">{labelOf ? labelOf(r.key) : r.label}</span>
            <span className="text-gray-400 shrink-0 tabular-nums">{r.value}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full"
              style={{ width: `${total > 0 ? (r.value / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null)
    api
      .get<Summary>(`/admin/analytics?days=${days}`)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [days])

  const tiles = [
    { label: 'Visitors', value: data?.visitors, Icon: Users, hint: 'Unique people' },
    { label: 'Page views', value: data?.views, Icon: Eye, hint: 'Pages opened' },
    {
      label: 'Direct',
      value: data?.direct,
      Icon: Globe,
      hint: 'Typed the address or used a bookmark',
    },
    {
      label: 'Mobile',
      value: data?.devices.find((d) => d.device === 'mobile')?.views,
      Icon: Smartphone,
      hint: 'Views from a phone',
    },
  ]

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-black">Visitors</h1>
          <p className="text-sm text-gray-500 mt-1">
            Counted on your own server — no cookies, and ad-blockers cannot hide it.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RANGES.map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => setDays(v)}
              className={`text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                days === v
                  ? 'bg-gray-100 text-black border-black'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(({ label, value, Icon, hint }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
            <Icon size={18} className="text-gray-400" />
            <div className="mt-3 text-2xl font-semibold text-black tabular-nums">
              {value ?? <span className="text-gray-200">–</span>}
            </div>
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{hint}</div>
          </div>
        ))}
      </div>

      <Card className="mt-4">
        <h2 className="text-base font-semibold text-black mb-4">Visits per day</h2>
        {data ? <DailyChart data={data.byDay} /> : <p className="text-sm text-gray-500">Loading…</p>}
      </Card>

      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-base font-semibold text-black mb-1">Most viewed pages</h2>
          <p className="text-xs text-gray-400 mb-4">Which pages people actually open.</p>
          {data ? (
            <Bars
              rows={data.topPages.map((p) => ({ key: p.path, label: p.path, value: p.views }))}
              labelOf={(k) => (k === '/' ? '/ (home)' : k)}
              total={data.topPages[0]?.views ?? 0}
              empty="No page views yet."
            />
          ) : (
            <p className="text-sm text-gray-500">Loading…</p>
          )}
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-black mb-1">Where they come from</h2>
          <p className="text-xs text-gray-400 mb-4">
            The site that linked to you. Direct visits are counted above.
          </p>
          {data ? (
            <Bars
              rows={data.referrers.map((r) => ({ key: r.host, label: r.host, value: r.views }))}
              total={data.referrers[0]?.views ?? 0}
              empty="No referrals yet — everyone arrived directly."
            />
          ) : (
            <p className="text-sm text-gray-500">Loading…</p>
          )}
        </Card>
      </div>
    </div>
  )
}
