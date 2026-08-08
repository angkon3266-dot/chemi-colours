import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, ArrowLeft, GripVertical,
} from 'lucide-react'
import { api } from '../lib/api'
import type { Block, BlockType, PageSummary } from '../lib/types'
import {
  Button, Card, Field, Input, Modal, Select, Textarea, Toggle, useSaveState, MediaPicker,
} from './ui'
import { BLOCK_ORDER, BLOCK_SCHEMAS } from './blockSchemas'
import type { FieldDef } from './blockSchemas'

/* ------------------------------------------------------------- pages list */

export function PagesList() {
  const [pages, setPages] = useState<PageSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    api
      .get<PageSummary[]>('/admin/pages')
      .then(setPages)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const create = async () => {
    try {
      const r = await api.post<{ id: number }>('/admin/pages', {
        title: newTitle,
        status: 'draft',
        in_nav: true,
        nav_order: pages.length,
      })
      setCreating(false)
      setNewTitle('')
      navigate(`/admin/pages/${r.id}`)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const remove = async (p: PageSummary) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    try {
      await api.del(`/admin/pages/${p.id}`)
      setPages((prev) => prev.filter((x) => x.id !== p.id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black">Pages</h1>
          <p className="text-sm text-gray-500 mt-1">
            Build any page from blocks. Order here also sets the menu order.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <span className="inline-flex items-center gap-1.5">
            <Plus size={16} /> New page
          </span>
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-2">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          pages.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-gray-200 px-4 py-3.5 flex items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/admin/pages/${p.id}`}
                    className="font-medium text-black hover:underline"
                  >
                    {p.title}
                  </Link>
                  {!!p.is_home && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      Home
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                      p.status === 'published'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">/{p.is_home ? '' : p.slug}</p>
              </div>
              <Link
                to={`/admin/pages/${p.id}`}
                className="text-sm font-medium text-gray-600 hover:text-black"
              >
                Edit
              </Link>
              {!p.is_home && (
                <button
                  type="button"
                  onClick={() => remove(p)}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                  aria-label="Delete page"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {creating && (
        <Modal title="New page" onClose={() => setCreating(false)}>
          <div className="flex flex-col gap-4">
            <Field label="Page title">
              <Input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Quality & Compliance"
              />
            </Field>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button onClick={create} disabled={!newTitle.trim()}>
                Create
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ field editor */

function FieldEditor({
  def,
  value,
  onChange,
}: {
  def: FieldDef
  value: any
  onChange: (v: any) => void
}) {
  if (def.type === 'bool') {
    return <Toggle checked={!!value} onChange={onChange} label={def.label} />
  }

  if (def.type === 'media') {
    return (
      <MediaPicker
        kind={def.mediaKind || 'image'}
        label={def.label}
        valueId={value ? 1 : null}
        valueUrl={value || ''}
        onPick={(_id, url) => onChange(url)}
      />
    )
  }

  if (def.type === 'list') {
    const items: any[] = Array.isArray(value) ? value : []
    const update = (i: number, key: string, v: any) => {
      const next = items.map((it, idx) => (idx === i ? { ...it, [key]: v } : it))
      onChange(next)
    }
    const move = (i: number, dir: -1 | 1) => {
      const j = i + dir
      if (j < 0 || j >= items.length) return
      const next = [...items]
      ;[next[i], next[j]] = [next[j], next[i]]
      onChange(next)
    }
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-black">{def.label}</span>
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">#{i + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                  aria-label="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                  aria-label="Move down"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                  className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600"
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {(def.itemFields || []).map((f) => (
              <FieldEditor
                key={f.key}
                def={f}
                value={item?.[f.key]}
                onChange={(v) => update(i, f.key, v)}
              />
            ))}
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          onClick={() => onChange([...items, {}])}
          className="self-start"
        >
          <span className="inline-flex items-center gap-1.5">
            <Plus size={15} /> Add item
          </span>
        </Button>
      </div>
    )
  }

  const common = { value: value ?? '', onChange: (e: any) => onChange(e.target.value) }

  return (
    <Field label={def.label} hint={def.hint}>
      {def.type === 'textarea' ? (
        <Textarea rows={3} {...common} />
      ) : def.type === 'html' ? (
        <Textarea
          rows={8}
          {...common}
          placeholder="<p>Your text…</p>"
          className="font-mono text-xs"
        />
      ) : def.type === 'select' ? (
        <Select {...common}>
          {(def.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ) : def.type === 'number' ? (
        <Input
          type="number"
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      ) : (
        <Input {...common} />
      )}
    </Field>
  )
}

/* ------------------------------------------------------------- page editor */

export function PageEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const save = useSaveState()

  const [page, setPage] = useState<any>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    api
      .get<any>(`/admin/pages/${id}`)
      .then((p) => {
        setPage(p)
        // Blocks saved before a field existed have no value for it. Layering
        // the schema defaults underneath means new controls always show up on
        // old blocks instead of silently staying blank.
        setBlocks(
          (p.blocks || []).map((b: Block) => ({
            ...b,
            data: { ...(BLOCK_SCHEMAS[b.type]?.defaults ?? {}), ...(b.data ?? {}) },
          }))
        )
      })
      .catch((e) => save.failed(e.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const setField = (k: string, v: any) => setPage((p: any) => ({ ...p, [k]: v }))

  const setBlockData = (i: number, key: string, value: any) =>
    setBlocks((prev) =>
      prev.map((b, idx) => (idx === i ? { ...b, data: { ...b.data, [key]: value } } : b))
    )

  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    setBlocks(next)
  }

  const addBlock = (type: BlockType) => {
    setBlocks((prev) => [
      ...prev,
      { type, visible: true, data: { ...BLOCK_SCHEMAS[type].defaults } },
    ])
    setAdding(false)
  }

  const submit = async () => {
    save.setState('saving')
    try {
      await api.put(`/admin/pages/${id}`, {
        title: page.title,
        slug: page.slug,
        nav_label: page.nav_label,
        nav_order: Number(page.nav_order) || 0,
        in_nav: !!Number(page.in_nav),
        status: page.status,
        meta_title: page.meta_title,
        meta_description: page.meta_description,
        blocks: blocks.map((b) => ({
          type: b.type,
          visible: b.visible !== false,
          data: b.data,
        })),
      })
      save.saved()
    } catch (e: any) {
      save.failed(e.message)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>
  if (!page) return <p className="text-sm text-red-600">Could not load this page.</p>

  return (
    <div className="max-w-3xl pb-24">
      <Link
        to="/admin/pages"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black"
      >
        <ArrowLeft size={15} /> All pages
      </Link>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold text-black">{page.title}</h1>
        <div className="flex items-center gap-3">
          {save.node}
          <Button onClick={submit} disabled={save.state === 'saving'}>
            Save changes
          </Button>
        </div>
      </div>

      <Card className="mt-5">
        <h2 className="text-base font-semibold text-black mb-4">Page settings</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Title">
            <Input value={page.title || ''} onChange={(e) => setField('title', e.target.value)} />
          </Field>
          <Field label="URL slug" hint={page.is_home ? 'The home page always lives at /' : `/${page.slug}`}>
            <Input
              value={page.slug || ''}
              disabled={!!page.is_home}
              onChange={(e) => setField('slug', e.target.value)}
            />
          </Field>
          <Field label="Menu label" hint="Leave blank to use the title.">
            <Input
              value={page.nav_label || ''}
              onChange={(e) => setField('nav_label', e.target.value)}
            />
          </Field>
          <Field label="Menu order">
            <Input
              type="number"
              value={page.nav_order ?? 0}
              onChange={(e) => setField('nav_order', e.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select value={page.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published</option>
            </Select>
          </Field>
          <div className="flex items-end pb-2">
            <Toggle
              checked={!!Number(page.in_nav)}
              onChange={(v) => setField('in_nav', v ? 1 : 0)}
              label="Show in the menu"
            />
          </div>
          <Field label="SEO title">
            <Input
              value={page.meta_title || ''}
              onChange={(e) => setField('meta_title', e.target.value)}
            />
          </Field>
          <Field label="SEO description">
            <Textarea
              rows={2}
              value={page.meta_description || ''}
              onChange={(e) => setField('meta_description', e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-black">Content blocks</h2>
        <Button variant="ghost" onClick={() => setAdding(true)}>
          <span className="inline-flex items-center gap-1.5">
            <Plus size={15} /> Add block
          </span>
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {blocks.length === 0 && (
          <p className="text-sm text-gray-500 bg-white border border-dashed border-gray-200 rounded-2xl p-6 text-center">
            No blocks yet. Add one to start building this page.
          </p>
        )}

        {blocks.map((block, i) => {
          const schema = BLOCK_SCHEMAS[block.type]
          if (!schema) return null
          return (
            <Card key={i} className={block.visible === false ? 'opacity-60' : ''}>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <GripVertical size={15} className="text-gray-300 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-black truncate">{schema.label}</h3>
                    <p className="text-xs text-gray-400 truncate">{schema.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setBlocks((prev) =>
                        prev.map((b, idx) =>
                          idx === i ? { ...b, visible: b.visible === false } : b
                        )
                      )
                    }
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                    aria-label={block.visible === false ? 'Show block' : 'Hide block'}
                  >
                    {block.visible === false ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(i, -1)}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                    aria-label="Move up"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(i, 1)}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                    aria-label="Move down"
                  >
                    <ChevronDown size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Remove this block?')) {
                        setBlocks((prev) => prev.filter((_, idx) => idx !== i))
                      }
                    }}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600"
                    aria-label="Delete block"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {schema.fields.map((f) => (
                  <FieldEditor
                    key={f.key}
                    def={f}
                    value={block.data?.[f.key]}
                    onChange={(v) => setBlockData(i, f.key, v)}
                  />
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-3 lg:pl-64">
        {save.node}
        <Button variant="ghost" onClick={() => navigate('/admin/pages')}>
          Back
        </Button>
        <Button onClick={submit} disabled={save.state === 'saving'}>
          Save changes
        </Button>
      </div>

      {adding && (
        <Modal title="Add a block" onClose={() => setAdding(false)} wide>
          <div className="grid sm:grid-cols-2 gap-3">
            {BLOCK_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addBlock(t)}
                className="text-left rounded-xl border border-gray-200 p-4 hover:border-gray-900 transition-colors"
              >
                <h3 className="text-sm font-semibold text-black">{BLOCK_SCHEMAS[t].label}</h3>
                <p className="text-xs text-gray-500 mt-1">{BLOCK_SCHEMAS[t].description}</p>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
