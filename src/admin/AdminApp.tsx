import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileStack, Package, Image, Settings as SettingsIcon,
  Inbox, LogOut, ExternalLink, Menu, X,
} from 'lucide-react'
import { api, setCsrf } from '../lib/api'
import type { AuthStatus } from '../lib/types'
import { Button, Card, Field, Input } from './ui'
import Dashboard from './Dashboard'
import { PagesList, PageEditor } from './PagesEditor'
import { ProductsList, ProductEditor } from './ProductsEditor'
import MediaPage from './MediaPage'
import SettingsEditor from './SettingsEditor'
import LeadsInbox from './LeadsInbox'

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <svg viewBox="0 0 256 256" className="w-8 h-8" aria-hidden="true">
            <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z" fill="black" />
            <path d="M 256 128 L 128 128 L 0 0 L 128 0 Z" fill="black" />
          </svg>
          <span className="font-semibold text-black">Chemi Colours</span>
        </div>
        <Card>
          <h1 className="text-lg font-semibold text-black">{title}</h1>
          <p className="text-sm text-gray-500 mt-1 mb-5">{subtitle}</p>
          {children}
        </Card>
      </div>
    </div>
  )
}

function Setup({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError('The two passwords do not match.')
    if (password.length < 10) return setError('Use at least 10 characters.')
    setBusy(true)
    try {
      const r = await api.post<{ csrf: string }>('/auth/setup', { name, email, password })
      setCsrf(r.csrf)
      onDone()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Create your admin account"
      subtitle="This is a one-time step. Choose a password only you know."
    >
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Your name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </Field>
        <Field label="Password" hint="At least 10 characters.">
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const r = await api.post<{ csrf: string }>('/auth/login', { email, password })
      setCsrf(r.csrf)
      onDone()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Manage your website content.">
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Email">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 text-center">
          ← Back to website
        </Link>
      </form>
    </AuthShell>
  )
}

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/admin/pages', label: 'Pages', Icon: FileStack },
  { to: '/admin/products', label: 'Products', Icon: Package },
  { to: '/admin/media', label: 'Media', Icon: Image },
  { to: '/admin/leads', label: 'Enquiries', Icon: Inbox },
  { to: '/admin/settings', label: 'Settings', Icon: SettingsIcon },
]

function AdminLayout({ user, onLogout }: { user: AuthStatus['user']; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {})
    onLogout()
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link to="/admin" className="flex items-center gap-2">
            <svg viewBox="0 0 256 256" className="w-6 h-6" aria-hidden="true">
              <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z" fill="black" />
              <path d="M 256 128 L 128 128 L 0 0 L 128 0 Z" fill="black" />
            </svg>
            <span className="font-semibold text-sm text-black">Admin</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-black transition-colors inline-flex items-center gap-1.5"
            >
              View site <ExternalLink size={14} />
            </a>
            <span className="hidden sm:inline text-sm text-gray-300">|</span>
            <span className="hidden sm:inline text-sm text-gray-500">{user?.email}</span>
            <button
              type="button"
              onClick={logout}
              className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-600 transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`${
            open ? 'block' : 'hidden'
          } lg:block w-full lg:w-56 shrink-0 bg-white lg:bg-transparent border-b lg:border-b-0 border-gray-200`}
        >
          <nav className="p-3 flex flex-col gap-0.5 lg:sticky lg:top-14">
            {NAV.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2.5 transition-colors ${
                    isActive
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                  }`
                }
              >
                <Icon size={16} /> {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 p-4 sm:p-6">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="pages" element={<PagesList />} />
            <Route path="pages/:id" element={<PageEditor />} />
            <Route path="products" element={<ProductsList />} />
            <Route path="products/:id" element={<ProductEditor />} />
            <Route path="media" element={<MediaPage />} />
            <Route path="leads" element={<LeadsInbox />} />
            <Route path="settings" element={<SettingsEditor />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api
      .get<AuthStatus>('/auth/status')
      .then((s) => {
        setCsrf(s.csrf)
        setStatus(s)
      })
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  if (!status) {
    return (
      <AuthShell title="Cannot reach the server" subtitle="The admin API did not respond.">
        <Button onClick={load}>Retry</Button>
      </AuthShell>
    )
  }

  if (status.needsSetup) return <Setup onDone={load} />
  if (!status.user) return <Login onDone={load} />

  return <AdminLayout user={status.user} onLogout={load} />
}
