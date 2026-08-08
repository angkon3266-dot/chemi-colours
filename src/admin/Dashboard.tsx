import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileStack, Package, Image, Inbox } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from './ui'

interface Overview {
  products: number
  pages: number
  media: number
  newLeads: number
  leads: number
}

export default function Dashboard() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Overview>('/admin/overview').then(setData).catch((e) => setError(e.message))
  }, [])

  const tiles = [
    { label: 'Pages', value: data?.pages, to: '/admin/pages', Icon: FileStack },
    { label: 'Products', value: data?.products, to: '/admin/products', Icon: Package },
    { label: 'Media files', value: data?.media, to: '/admin/media', Icon: Image },
    { label: 'New enquiries', value: data?.newLeads, to: '/admin/leads', Icon: Inbox },
  ]

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-black">Dashboard</h1>
      <p className="text-sm text-gray-500 mt-1">Everything on your website, in one place.</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(({ label, value, to, Icon }) => (
          <Link
            key={label}
            to={to}
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-400 transition-colors"
          >
            <Icon size={18} className="text-gray-400" />
            <div className="mt-3 text-2xl font-semibold text-black">
              {value ?? <span className="text-gray-200">–</span>}
            </div>
            <div className="text-sm text-gray-500">{label}</div>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="text-base font-semibold text-black">Quick start</h2>
        <ul className="mt-3 space-y-2.5 text-sm text-gray-600">
          <li>
            <Link to="/admin/settings" className="text-blue-600 hover:underline">
              Settings
            </Link>{' '}
            — change the background video, contact details, social links and footer.
          </li>
          <li>
            <Link to="/admin/pages" className="text-blue-600 hover:underline">
              Pages
            </Link>{' '}
            — edit the landing page or build a new page from blocks.
          </li>
          <li>
            <Link to="/admin/products" className="text-blue-600 hover:underline">
              Products
            </Link>{' '}
            — add dyestuff with full technical specs and spec-sheet PDFs.
          </li>
          <li>
            <Link to="/admin/leads" className="text-blue-600 hover:underline">
              Enquiries
            </Link>{' '}
            — every contact-form submission is stored here.
          </li>
        </ul>
      </Card>
    </div>
  )
}
