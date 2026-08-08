import { useEffect, useState } from 'react'
import { api, setCsrf } from '../lib/api'
import type { AuthStatus } from '../lib/types'
import { Button, Card, Field, Input } from './ui'

/**
 * Sign-in details. Both changes require the current password so that an
 * unattended session cannot be used to take the account over.
 */
export default function AccountCard() {
  const [me, setMe] = useState<AuthStatus['user']>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailPw, setEmailPw] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    api
      .get<AuthStatus>('/auth/status')
      .then((s) => {
        setCsrf(s.csrf)
        setMe(s.user)
        setName(s.user?.name || '')
        setEmail(s.user?.email || '')
      })
      .catch(() => {})
  }, [])

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailErr('')
    setEmailMsg('')
    setEmailBusy(true)
    try {
      await api.post('/auth/email', { email, name, currentPassword: emailPw })
      setEmailMsg('Sign-in email updated.')
      setEmailPw('')
    } catch (err: any) {
      setEmailErr(err.message)
    } finally {
      setEmailBusy(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwErr('')
    setPwMsg('')
    if (newPw !== confirmPw) return setPwErr('The two new passwords do not match.')
    if (newPw.length < 10) return setPwErr('Use at least 10 characters.')
    setPwBusy(true)
    try {
      await api.post('/auth/password', { currentPassword: currentPw, newPassword: newPw })
      setPwMsg('Password updated.')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err: any) {
      setPwErr(err.message)
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <Card className="mt-4">
      <h2 className="text-base font-semibold text-black mb-1">Your admin account</h2>
      <p className="text-sm text-gray-500 mb-5">
        {me?.email ? `Signed in as ${me.email}.` : 'Sign-in details.'} Both changes need your
        current password.
      </p>

      <form onSubmit={saveEmail} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Your name">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Sign-in email">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </Field>
          <Field label="Current password" hint="Confirms it is really you.">
            <Input
              type="password"
              required
              value={emailPw}
              onChange={(e) => setEmailPw(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
        </div>
        {emailErr && <p className="text-sm text-red-600">{emailErr}</p>}
        {emailMsg && <p className="text-sm text-green-700">{emailMsg}</p>}
        <Button type="submit" disabled={emailBusy} className="self-start">
          {emailBusy ? 'Saving…' : 'Update email'}
        </Button>
      </form>

      <div className="my-6 h-px bg-gray-100" />

      <form onSubmit={savePassword} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Current password">
            <Input
              type="password"
              required
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <div className="hidden sm:block" />
          <Field label="New password" hint="At least 10 characters.">
            <Input
              type="password"
              required
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              required
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </div>
        {pwErr && <p className="text-sm text-red-600">{pwErr}</p>}
        {pwMsg && <p className="text-sm text-green-700">{pwMsg}</p>}
        <Button type="submit" disabled={pwBusy} className="self-start">
          {pwBusy ? 'Saving…' : 'Change password'}
        </Button>
      </form>
    </Card>
  )
}
