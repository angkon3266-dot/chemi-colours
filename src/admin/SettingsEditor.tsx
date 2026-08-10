import { useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { api } from '../lib/api'
import { mapEmbedUrl } from '../lib/contact'
import AccountCard from './AccountCard'
import UsersCard from './UsersCard'
import MenuEditor from './MenuEditor'
import PaletteEditor from './PaletteEditor'
import type { FooterColumn, MediaItem, NavItem, Settings } from '../lib/types'

import {
  Button, Card, Field, Input, Select, Textarea, useSaveState, MediaLibraryModal,
} from './ui'

export default function SettingsEditor() {
  const [s, setS] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [pickingVideo, setPickingVideo] = useState(false)
  const [pickingPoster, setPickingPoster] = useState(false)
  const [pickingLogo, setPickingLogo] = useState(false)
  const [pickingOg, setPickingOg] = useState(false)
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
  const navItems: NavItem[] = Array.isArray(s.nav_items) ? s.nav_items : []
  const extras: { label: string; value: string }[] = Array.isArray(s.footer_extra)
    ? s.footer_extra
    : []

  const mapPreview = mapEmbedUrl(s.footer_map_url)

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
        <h2 className="text-base font-semibold text-black mb-4">Logo & identity</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-black">Logo</span>
              <div className="w-40 h-16 rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                {s.logo_url ? (
                  <img src={s.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-300">No logo</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setPickingLogo(true)}>
                  Choose
                </Button>
                {s.logo_url && (
                  <Button type="button" variant="ghost" onClick={() => set('logo_url', '')}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 grid gap-4">
              <Field label="Site name" hint="Used when no logo image is set.">
                <Input value={s.site_name || ''} onChange={(e) => set('site_name', e.target.value)} />
              </Field>
              <Field
                label="Tagline / slogan"
                hint="Shown beside the logo in the header, and under it in the footer."
              >
                <Input
                  value={s.tagline || ''}
                  onChange={(e) => set('tagline', e.target.value)}
                  placeholder="A short line describing what you do"
                />
              </Field>
            </div>
          </div>
        </div>
      </Card>

      <PaletteEditor s={s} set={set} />

      <Card className="mt-4">
        <h2 className="text-base font-semibold text-black mb-4">Contact & enquiry routes</h2>
        <p className="text-sm text-gray-500 -mt-2 mb-4">
          These power the WhatsApp, Call and Email buttons on product pages. Leave a field blank
          to hide its button.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="WhatsApp number" hint="Include the country code, e.g. 8801700000000">
            <Input
              value={s.whatsapp_number || ''}
              onChange={(e) => set('whatsapp_number', e.target.value)}
              placeholder="8801700000000"
            />
          </Field>
          <Field label="WhatsApp opening message" hint="The product name is appended automatically.">
            <Input
              value={s.whatsapp_message || ''}
              onChange={(e) => set('whatsapp_message', e.target.value)}
            />
          </Field>
          <Field label="Call number" hint="Used by the Call button. Falls back to Phone below.">
            <Input
              value={s.call_number || ''}
              onChange={(e) => set('call_number', e.target.value)}
            />
          </Field>
          <Field label="Contact email" hint="Enquiries are emailed here.">
            <Input
              type="email"
              value={s.contact_email || ''}
              onChange={(e) => set('contact_email', e.target.value)}
            />
          </Field>
          <Field label="Phone (shown in footer)">
            <Input
              value={s.contact_phone || ''}
              onChange={(e) => set('contact_phone', e.target.value)}
            />
          </Field>
          <Field label="Address (footer, left)">
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
        <h2 className="text-base font-semibold text-black mb-4">Menu</h2>
        <p className="text-sm text-gray-500 -mt-2 mb-4">
          Leave this empty to build the menu automatically from your published pages. Add items
          here to take full control, including links to categories or external sites.
        </p>
        <MenuEditor items={navItems} onChange={(v) => set('nav_items', v)} />

        <div className="mt-6 pt-5 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-black mb-1">Menu bar colours</h3>
          <p className="text-xs text-gray-400 mb-4">
            Over the hero video the bar stays semi-transparent so the video shows through.
          </p>
          <Field label="Position" hint="Where the bar sits across the top of the page.">
            <div className="flex flex-wrap gap-1.5">
              {[
                { v: 'left', l: 'Left' },
                { v: 'center', l: 'Middle' },
                { v: 'right', l: 'Right' },
              ].map(({ v, l }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set('nav_align', v)}
                  className={`text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                    (s.nav_align || 'left') === v
                      ? 'bg-gray-100 text-black border-black'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Field label="Background">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={s.nav_bg_color || '#ffffff'}
                  onChange={(e) => set('nav_bg_color', e.target.value)}
                  className="w-12 h-10 rounded-lg border border-gray-200 bg-white cursor-pointer shrink-0"
                />
                <Input
                  value={s.nav_bg_color || ''}
                  onChange={(e) => set('nav_bg_color', e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
            </Field>
            <Field label="Text & logo">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={s.nav_text_color || '#1f2937'}
                  onChange={(e) => set('nav_text_color', e.target.value)}
                  className="w-12 h-10 rounded-lg border border-gray-200 bg-white cursor-pointer shrink-0"
                />
                <Input
                  value={s.nav_text_color || ''}
                  onChange={(e) => set('nav_text_color', e.target.value)}
                  placeholder="#1f2937"
                />
              </div>
            </Field>
          </div>

          <div
            className="mt-4 rounded-xl p-4 bg-gray-100 border border-gray-200"
            aria-label="Menu bar preview"
          >
            <div
              className="rounded-2xl px-4 py-2.5 inline-flex items-center gap-5 shadow-sm"
              style={{ backgroundColor: s.nav_bg_color || '#ffffff' }}
            >
              <svg viewBox="0 0 256 256" className="w-6 h-6" aria-hidden="true">
                <path
                  d="M 256 256 L 128 256 L 0 128 L 128 128 Z"
                  fill={s.nav_text_color || '#1f2937'}
                />
                <path
                  d="M 256 128 L 128 128 L 0 0 L 128 0 Z"
                  fill={s.nav_text_color || '#1f2937'}
                />
              </svg>
              <span
                className="text-sm font-medium"
                style={{ color: s.nav_text_color || '#1f2937' }}
              >
                Our story
              </span>
              <span
                className="text-sm font-medium"
                style={{ color: s.nav_text_color || '#1f2937' }}
              >
                Products
              </span>
              <span className="bg-black text-white text-sm font-medium px-4 py-1.5 rounded-xl">
                {s.cta_label || 'Get in touch'}
              </span>
            </div>
          </div>
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

          <Field
            label="Address (footer, right side)"
            hint="Line breaks are preserved."
          >
            <Textarea
              rows={3}
              value={s.footer_address || ''}
              onChange={(e) => set('footer_address', e.target.value)}
              placeholder={'Plot 12, Industrial Area\nDhaka 1216, Bangladesh'}
            />
          </Field>

          <Field
            label="Google map (footer, right side)"
            hint="Paste the Google Maps share link, the whole <iframe> from “Embed a map”, or just your address — all three work. Leave blank to hide the map."
          >
            <Textarea
              rows={2}
              value={s.footer_map_url || ''}
              onChange={(e) => set('footer_map_url', e.target.value)}
              placeholder="https://maps.app.goo.gl/…"
            />
          </Field>

          {mapPreview && (
            <div className="rounded-xl overflow-hidden border border-gray-200 max-w-md">
              <iframe
                src={mapPreview}
                title="Map preview"
                loading="lazy"
                className="w-full h-44 border-0"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-black">
              Extra details (footer, right side)
            </span>
            <p className="text-xs text-gray-400 -mt-1">
              Anything else worth listing — opening hours, trade licence, BIN number.
            </p>
            {extras.map((row, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={row.label}
                  onChange={(e) =>
                    set('footer_extra', extras.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Label (optional)"
                />
                <Input
                  value={row.value}
                  onChange={(e) =>
                    set('footer_extra', extras.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))
                  }
                  placeholder="Value"
                />
                <button
                  type="button"
                  onClick={() => set('footer_extra', extras.filter((_, k) => k !== i))}
                  className="w-9 h-9 shrink-0 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                  aria-label="Remove row"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="self-start"
              onClick={() => set('footer_extra', [...extras, { label: '', value: '' }])}
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus size={15} /> Add detail
              </span>
            </Button>
          </div>

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

      <Card className="mt-4">
        <h2 className="text-base font-semibold text-black mb-1">Search & sharing</h2>
        <p className="text-sm text-gray-500 mb-5">
          These control how the site looks in Google results and when someone shares a link on
          WhatsApp or Facebook.
        </p>
        <div className="flex flex-col gap-4">
          <Field
            label="Default description"
            hint="Used for any page without its own SEO description. Aim for about 150 characters."
          >
            <Textarea
              rows={2}
              value={s.meta_description || ''}
              onChange={(e) => set('meta_description', e.target.value)}
            />
          </Field>

          <Field
            label="Share image"
            hint="Shown as the preview picture when a link is shared. 1200×630 works best."
          >
            <div className="flex gap-2">
              <Input
                value={s.og_image_url || ''}
                onChange={(e) => set('og_image_url', e.target.value)}
                placeholder="https://…/share.jpg"
              />
              <Button type="button" variant="ghost" onClick={() => setPickingOg(true)}>
                Browse
              </Button>
            </div>
          </Field>
          {s.og_image_url && (
            <img
              src={s.og_image_url}
              alt="Share preview"
              className="w-full max-w-sm rounded-xl border border-gray-200 object-cover aspect-[1200/630]"
            />
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Google Analytics ID" hint="Looks like G-XXXXXXXXXX. Leave blank for none.">
              <Input
                value={s.ga_measurement_id || ''}
                onChange={(e) => set('ga_measurement_id', e.target.value)}
                placeholder="G-XXXXXXXXXX"
              />
            </Field>
            <Field
              label="Search Console verification"
              hint="The content value of the meta tag Google gives you."
            >
              <Input
                value={s.search_console_token || ''}
                onChange={(e) => set('search_console_token', e.target.value)}
              />
            </Field>
          </div>

          <Field
            label="Related products to show"
            hint="On a product page, how many other products from the same category to show underneath."
          >
            <Input
              type="number"
              min={0}
              max={24}
              value={s.related_count ?? 8}
              onChange={(e) => set('related_count', e.target.value)}
            />
          </Field>

          <Field
            label="Category page tiles per row"
            hint="Sub-category tiles and the product grid on a category page. Mobile and tablet scale down automatically."
          >
            <Select
              value={s.category_grid_columns || '3'}
              onChange={(e) => set('category_grid_columns', e.target.value)}
            >
              <option value="2">2 per row</option>
              <option value="3">3 per row</option>
              <option value="4">4 per row</option>
            </Select>
          </Field>

          <p className="text-xs text-gray-400">
            Your sitemap is generated automatically at <code>/sitemap.xml</code> — submit that URL
            in Google Search Console.
          </p>
        </div>
      </Card>

      <AccountCard />
      <UsersCard />

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
      {pickingOg && (
        <MediaLibraryModal
          kind="image"
          onClose={() => setPickingOg(false)}
          onPick={(m: MediaItem) => {
            set('og_image_url', m.url)
            setPickingOg(false)
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
      {pickingLogo && (
        <MediaLibraryModal
          kind="image"
          onClose={() => setPickingLogo(false)}
          onPick={(m: MediaItem) => {
            set('logo_url', m.url)
            setPickingLogo(false)
          }}
        />
      )}
    </div>
  )
}
