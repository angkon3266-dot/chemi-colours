import { useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { api } from '../lib/api'
import type { FooterColumn, MediaItem, Settings } from '../lib/types'
import {
  Button, Card, Field, Input, Textarea, useSaveState, MediaLibraryModal,
} from './ui'

export default function SettingsEditor() {
  const [s, setS] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [pickingVideo, setPickingVideo] = useState(false)
  const [pickingPoster, setPickingPoster] = useState(false)
  const [serviceInput, setServiceInput] = useState('')
  const save = useSaveState()

  useEffect(() => {
    api
      .get<Settings>('/admin/settings')
      .then(setS)
      .catch((e) => save.failed(e.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k: string, v: any) => setS((prev) => (prev ? { ...prev, [k]: v } : prev))

  const submit = async () => {
    if (!s) return
    save.setState('saving')
    try {
      await api.put('/admin/settings', s)
      save.saved()
    } catch (e: any) {
      save.failed(e.message)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>
  if (!s) return <p className="text-sm text-red-600">Could not load settings.</p>

  const services: string[] = Array.isArray(s.form_services) ? s.form_services : []
  const columns: FooterColumn[] = Array.isArray(s.footer_columns) ? s.footer_columns : []

  const setColumn = (i: number, patch: Partial<FooterColumn>) =>
    set('footer_columns', columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  return (
    <div className="max-w-3xl pb-24">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-black">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Site-wide content and contact details.</p>
        </div>
        <div className="flex items-center gap-3">
          {save.node}
          <Button onClick={submit} disabled={save.state === 'saving'}>
            Save
          </Button>
        </div>
      </div>

      <Card className="mt-5">
        <h2 className="text-base font-semibold text-black mb-4">Background video</h2>
        <p className="text-sm text-gray-500 -mt-2 mb-4">
          Used by the hero block on the landing page.
        </p>
        <div className="flex flex-col gap-4">
          <Field label="Video URL" hint="Paste a URL, or pick from your media library.">
            <div className="flex gap-2">
              <Input
                value={s.hero_video_url || ''}
                onChange={(e) => set('hero_video_url', e.target.value)}
                placeholder="https://…/background.mp4"
              />
              <Button type="button" variant="ghost" onClick={() => setPickingVideo(true)}>
                Browse
              </Button>
            </div>
          </Field>

          {s.hero_video_url && (
            <video
              key={s.hero_video_url}
              src={s.hero_video_url}
              muted
              loop
              autoPlay
              playsInline
              className="w-full max-w-md rounded-xl border border-gray-200 aspect-video object-cover bg-gray-50"
            />
          )}

          <Field
            label="Poster image"
            hint="Shown while the video loads. Optional but recommended."
          >
            <div className="flex gap-2">
              <Input
                value={s.hero_poster_url || ''}
                onChange={(e) => set('hero_poster_url', e.target.value)}
                placeholder="https://…/poster.jpg"
              />
              <Button type="button" variant="ghost" onClick={() => setPickingPoster(true)}>
                Browse
              </Button>
            </div>
          </Field>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-base font-semibold text-black mb-4">Identity & contact</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Site name">
            <Input value={s.site_name || ''} onChange={(e) => set('site_name', e.target.value)} />
          </Field>
          <Field label="Contact email" hint="Enquiries are emailed here.">
            <Input
              type="email"
              value={s.contact_email || ''}
              onChange={(e) => set('contact_email', e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={s.contact_phone || ''}
              onChange={(e) => set('contact_phone', e.target.value)}
            />
          </Field>
          <Field label="Address">
            <Input value={s.address || ''} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label="Header button label">
            <Input value={s.cta_label || ''} onChange={(e) => set('cta_label', e.target.value)} />
          </Field>
          <Field label="Header button link">
            <Input value={s.cta_href || ''} onChange={(e) => set('cta_href', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-base font-semibold text-black mb-4">Social links</h2>
        <p className="text-sm text-gray-500 -mt-2 mb-4">
          Leave blank to hide an icon. Empty links are never shown.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ['social_twitter', 'Twitter / X'],
            ['social_facebook', 'Facebook'],
            ['social_instagram', 'Instagram'],
            ['social_linkedin', 'LinkedIn'],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                value={s[key] || ''}
                onChange={(e) => set(key, e.target.value)}
                placeholder="https://…"
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-base font-semibold text-black mb-4">Contact form</h2>
        <div className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Form heading">
              <Input
                value={s.form_heading || ''}
                onChange={(e) => set('form_heading', e.target.value)}
              />
            </Field>
            <Field label="Field label above the inputs">
              <Input
                value={s.form_intro || ''}
                onChange={(e) => set('form_intro', e.target.value)}
              />
            </Field>
            <Field label="Success heading">
              <Input
                value={s.form_success_title || ''}
                onChange={(e) => set('form_success_title', e.target.value)}
              />
            </Field>
            <Field label="Success message">
              <Input
                value={s.form_success_text || ''}
                onChange={(e) => set('form_success_text', e.target.value)}
              />
            </Field>
          </div>

          <div>
            <span className="text-sm font-medium text-black">Service tags</span>
            <p className="text-xs text-gray-400 mt-0.5">
              The chips visitors can select on the enquiry form.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {services.map((f) => (
                <span
                  key={f}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 inline-flex items-center gap-1.5"
                >
                  {f}
                  <button
                    type="button"
                    onClick={() => set('form_services', services.filter((x) => x !== f))}
                    className="text-gray-400 hover:text-red-600"
                    aria-label={`Remove ${f}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const v = serviceInput.trim()
                    if (v && !services.includes(v)) set('form_services', [...services, v])
                    setServiceInput('')
                  }
                }}
                placeholder="Add a tag and press Enter"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const v = serviceInput.trim()
                  if (v && !services.includes(v)) set('form_services', [...services, v])
                  setServiceInput('')
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-base font-semibold text-black mb-4">Footer</h2>
        <div className="flex flex-col gap-4">
          <Field label="Tagline">
            <Textarea
              rows={2}
              value={s.footer_tagline || ''}
              onChange={(e) => set('footer_tagline', e.target.value)}
            />
          </Field>
          <Field label="Copyright line">
            <Input
              value={s.footer_note || ''}
              onChange={(e) => set('footer_note', e.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-black">Link columns</span>
            {columns.map((col, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-3 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={col.title || ''}
                    onChange={(e) => setColumn(i, { title: e.target.value })}
                    placeholder="Column title"
                  />
                  <button
                    type="button"
                    onClick={() => set('footer_columns', columns.filter((_, idx) => idx !== i))}
                    className="w-9 h-9 shrink-0 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                    aria-label="Remove column"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {(col.links || []).map((l, j) => (
                  <div key={j} className="flex gap-2">
                    <Input
                      value={l.label}
                      onChange={(e) =>
                        setColumn(i, {
                          links: col.links.map((x, k) =>
                            k === j ? { ...x, label: e.target.value } : x
                          ),
                        })
                      }
                      placeholder="Label"
                    />
                    <Input
                      value={l.href}
                      onChange={(e) =>
                        setColumn(i, {
                          links: col.links.map((x, k) =>
                            k === j ? { ...x, href: e.target.value } : x
                          ),
                        })
                      }
                      placeholder="/link"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setColumn(i, { links: col.links.filter((_, k) => k !== j) })
                      }
                      className="w-9 h-9 shrink-0 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                      aria-label="Remove link"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="ghost"
                  className="self-start"
                  onClick={() =>
                    setColumn(i, { links: [...(col.links || []), { label: '', href: '' }] })
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Plus size={14} /> Add link
                  </span>
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              className="self-start"
              onClick={() => set('footer_columns', [...columns, { title: '', links: [] }])}
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus size={15} /> Add column
              </span>
            </Button>
          </div>
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-3 lg:pl-64">
        {save.node}
        <Button onClick={submit} disabled={save.state === 'saving'}>
          Save settings
        </Button>
      </div>

      {pickingVideo && (
        <MediaLibraryModal
          kind="video"
          onClose={() => setPickingVideo(false)}
          onPick={(m: MediaItem) => {
            set('hero_video_url', m.url)
            setPickingVideo(false)
          }}
        />
      )}
      {pickingPoster && (
        <MediaLibraryModal
          kind="image"
          onClose={() => setPickingPoster(false)}
          onPick={(m: MediaItem) => {
            set('hero_poster_url', m.url)
            setPickingPoster(false)
          }}
        />
      )}
    </div>
  )
}
