import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import type { AdminUser } from '../lib/types'
import { Button, Card, Field, Input, Modal } from './ui'

/** Everyone who can sign in to the admin panel. */
export default function UsersCard() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => {
    api
      .get<AdminUser[]>('/admin/users')
      .then(setUsers)
      .catch((e) => setError(e.message))
  }
  useEffect(load, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.post('/admin/users', { name, email, password })
      setAdding(false)
      setName('')
      setEmail('')
      setPassword('')
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (u: AdminUser) => {
    if (!confirm(`Remove ${u.email}? They will lose access immediately.`)) return
    try {
      await api.del(`/admin/users/${u.id}`)
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <Card className="mt-4">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-base font-semibold text-black">Who can sign in</h2>
        <Button variant="ghost" onClick={() => setAdding(true)}>
          <span className="inline-flex items-center gap-1.5">
            <Plus size={15} /> Add person
          </span>
        </Button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Everyone here has full access. Give each person their own login rather than sharing one.
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-black truncate">
                  {u.name || u.email}
                </span>
                {u.isYou && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">
                {u.email}
                {u.lastLoginAt ? ` · last signed in ${u.lastLoginAt.slice(0, 10)}` : ' · never signed in'}
              </p>
            </div>
            {!u.isYou && (
              <button
                type="button"
                onClick={() => remove(u)}
                className="w-8 h-8 shrink-0 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                aria-label={`Remove ${u.email}`}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <Modal title="Add a person" onClose={() => setAdding(false)}>
          <form onSubmit={add} className="flex flex-col gap-4">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field
              label="Temporary password"
              hint="At least 10 characters. Ask them to change it after their first sign-in."
            >
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  )
}
