import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, ArrowLeft, X } from 'lucide-react'
import { api } from '../lib/api'
import type { AdminProduct, Category, MediaItem } from '../lib/types'
import {
  Button, Card, Field, Input, Modal, Select, Textarea, Toggle, useSaveState,
  MediaPicker, MediaLibraryModal,
} from './ui'

const BLANK: AdminProduct = {
  id: 0, slug: '', name: '', categoryId: null, ciName: '', casNo: '',
  shadeName: '', shadeHex: '', fastnessLight: '', fastnessWash: '', fastnessRub: '',
  fibres: [], summary: '', description: '', application: '',
  imageId: null, galleryIds: [], specSheetId: null,
  status: 'published', featured: false, sortOrder: 0,
}

/* ---------------------------------------------------------- products list */

export function ProductsList() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [managingCats, setManagingCats] = useState(false)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get<AdminProduct[]>('/admin/products'),
      api.get<Category[]>('/admin/categories'),
      api.get<MediaItem[]>('/admin/media?kind=image'),
    ])
      .then(([p, c, m]) => {
        setProducts(p)
        setCategories(c)
        setMedia(m)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const mediaUrl = (id: number | null) => media.find((m) => m.id === id)?.url || ''
  const catName = (id: number | null) => categories.find((c) => c.id === id)?.name || ''

  const create = async () => {
    try {
      const r = await api.post<{ id: number }>('/admin/products', {
        ...BLANK,
        name: newName,
        sortOrder: products.length,
      })
      navigate(`/admin/products/${r.id}`)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const remove = async (p: AdminProduct) => {
    if (!confirm(`Delete "${p.name}"?`)) return
    try {
      await api.del(`/admin/products/${p.id}`)
      setProducts((prev) => prev.filter((x) => x.id !== p.id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-black">Products</h1>
          <p className="text-sm text-gray-500 mt-1">Your dyestuff catalogue.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setManagingCats(true)}>
            Categories
          </Button>
          <Button onClick={() => setCreating(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Plus size={16} /> New product
            </span>
          </Button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      ) : products.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500 bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
          No products yet. Add your first one.
        </p>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col"
            >
              <Link to={`/admin/products/${p.id}`} className="block">
                <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                  {mediaUrl(p.imageId) ? (
                    <img
                      src={mediaUrl(p.imageId)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: p.shadeHex || '#f9fafb' }}
                    />
                  )}
                </div>
              </Link>
              <div className="p-4 flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                      p.status === 'published'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {p.status}
                  </span>
                  {p.featured && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      Featured
                    </span>
                  )}
                </div>
                <Link
                  to={`/admin/products/${p.id}`}
                  className="font-medium text-black hover:underline leading-snug"
                >
                  {p.name}
                </Link>
                {catName(p.categoryId) && (
                  <p className="text-xs text-gray-400">{catName(p.categoryId)}</p>
                )}
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <Link
                    to={`/admin/products/${p.id}`}
                    className="text-sm font-medium text-gray-600 hover:text-black"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                    aria-label="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal title="New product" onClose={() => setCreating(false)}>
          <div className="flex flex-col gap-4">
            <Field label="Product name">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Chemireact Red HE-3B"
              />
            </Field>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button onClick={create} disabled={!newName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {managingCats && (
        <CategoriesModal
          categories={categories}
          onClose={() => {
            setManagingCats(false)
            load()
          }}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------- categories */

function CategoriesModal({
  categories,
  onClose,
}: {
  categories: Category[]
  onClose: () => void
}) {
  const [items, setItems] = useState(categories)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const add = async () => {
    try {
      const r = await api.post<{ id: number }>('/admin/categories', {
        name,
        sort_order: items.length,
      })
      setItems((prev) => [...prev, { id: r.id, slug: '', name }])
      setName('')
    } catch (e: any) {
      setError(e.message)
    }
  }

  const remove = async (c: Category) => {
    if (!confirm(`Delete "${c.name}"? Products keep existing but become uncategorised.`)) return
    try {
      await api.del(`/admin/categories/${c.id}`)
      setItems((prev) => prev.filter((x) => x.id !== c.id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <Modal title="Product categories" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {items.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-3 py-2.5"
          >
            <span className="text-sm text-black">{c.name}</span>
            <button
              type="button"
              onClick={() => remove(c)}
              className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
              aria-label="Delete category"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category name"
          />
          <Button onClick={add} disabled={!name.trim()}>
            Add
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------ product edit */

export function ProductEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const save = useSaveState()

  const [p, setP] = useState<AdminProduct | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fibreInput, setFibreInput] = useState('')
  const [pickingGallery, setPickingGallery] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<AdminProduct>(`/admin/products/${id}`),
      api.get<Category[]>('/admin/categories'),
      api.get<MediaItem[]>('/admin/media'),
    ])
      .then(([prod, cats, m]) => {
        setP(prod)
        setCategories(cats)
        setMedia(m)
      })
      .catch((e) => save.failed(e.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const mediaById = useMemo(() => {
    const map: Record<number, MediaItem> = {}
    media.forEach((m) => (map[m.id] = m))
    return map
  }, [media])

  const set = (k: keyof AdminProduct, v: any) => setP((prev) => (prev ? { ...prev, [k]: v } : prev))

  const addFibre = () => {
    const v = fibreInput.trim()
    if (!v || !p) return
    if (!p.fibres.includes(v)) set('fibres', [...p.fibres, v])
    setFibreInput('')
  }

  const submit = async () => {
    if (!p) return
    save.setState('saving')
    try {
      await api.put(`/admin/products/${id}`, p)
      save.saved()
    } catch (e: any) {
      save.failed(e.message)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>
  if (!p) return <p className="text-sm text-red-600">Could not load this product.</p>

  return (
    <div className="max-w-3xl pb-24">
      <Link
        to="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black"
      >
        <ArrowLeft size={15} /> All products
      </Link>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold text-black">{p.name || 'Untitled product'}</h1>
        <div className="flex items-center gap-3">
          {save.node}
          <Button onClick={submit} disabled={save.state === 'saving'}>
            Save
          </Button>
        </div>
      </div>

      <Card className="mt-5">
        <h2 className="text-base font-semibold text-black mb-4">Basics</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Name">
            <Input value={p.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Category">
            <Select
              value={p.categoryId ?? ''}
              onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={p.status} onChange={(e) => set('status', e.target.value)}>
              <option value="published">Published</option>
              <option value="draft">Draft (hidden)</option>
            </Select>
          </Field>
          <Field label="Sort order">
            <Input
              type="number"
              value={p.sortOrder}
              onChange={(e) => set('sortOrder', Number(e.target.value))}
            />
          </Field>
          <div className="sm:col-span-2">
            <Toggle
              checked={p.featured}
              onChange={(v) => set('featured', v)}
              label="Feature on the home page"
            />
          </div>
          <div className="sm:col-span-2">
            <Field label="Short summary" hint="One or two lines shown on cards.">
              <Textarea
                rows={2}
                value={p.summary}
                onChange={(e) => set('summary', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-base font-semibold text-black mb-4">Technical specification</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="C.I. name" hint="e.g. Reactive Red 120">
            <Input value={p.ciName} onChange={(e) => set('ciName', e.target.value)} />
          </Field>
          <Field label="CAS number">
            <Input value={p.casNo} onChange={(e) => set('casNo', e.target.value)} />
          </Field>
          <Field label="Shade name">
            <Input value={p.shadeName} onChange={(e) => set('shadeName', e.target.value)} />
          </Field>
          <Field label="Shade colour" hint="Shown as a swatch on the product card.">
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={p.shadeHex || '#cccccc'}
                onChange={(e) => set('shadeHex', e.target.value)}
                className="w-12 h-10 rounded-lg border border-gray-200 bg-white cursor-pointer"
              />
              <Input
                value={p.shadeHex}
                onChange={(e) => set('shadeHex', e.target.value)}
                placeholder="#c0392b"
              />
            </div>
          </Field>
          <Field label="Light fastness" hint="e.g. 6–7">
            <Input value={p.fastnessLight} onChange={(e) => set('fastnessLight', e.target.value)} />
          </Field>
          <Field label="Wash fastness">
            <Input value={p.fastnessWash} onChange={(e) => set('fastnessWash', e.target.value)} />
          </Field>
          <Field label="Rub fastness">
            <Input value={p.fastnessRub} onChange={(e) => set('fastnessRub', e.target.value)} />
          </Field>
        </div>

        <div className="mt-4">
          <span className="text-sm font-medium text-black">Suitable fibres</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {p.fibres.map((f) => (
              <span
                key={f}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 inline-flex items-center gap-1.5"
              >
                {f}
                <button
                  type="button"
                  onClick={() => set('fibres', p.fibres.filter((x) => x !== f))}
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
              value={fibreInput}
              onChange={(e) => setFibreInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addFibre()
                }
              }}
              placeholder="e.g. Cotton, Viscose, Nylon"
            />
            <Button type="button" variant="ghost" onClick={addFibre}>
              Add
            </Button>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-base font-semibold text-black mb-4">Media</h2>
        <div className="flex flex-col gap-5">
          <MediaPicker
            kind="image"
            label="Main image"
            valueId={p.imageId}
            valueUrl={p.imageId ? mediaById[p.imageId]?.url : ''}
            onPick={(mid) => set('imageId', mid)}
          />

          <div>
            <span className="text-sm font-medium text-black">Gallery</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {p.galleryIds.map((gid) => (
                <div
                  key={gid}
                  className="relative w-20 h-16 rounded-xl overflow-hidden border border-gray-200"
                >
                  {mediaById[gid]?.url && (
                    <img src={mediaById[gid].url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => set('galleryIds', p.galleryIds.filter((x) => x !== gid))}
                    className="absolute top-1 right-1 w-5 h-5 rounded bg-white/90 text-gray-500 hover:text-red-600 flex items-center justify-center"
                    aria-label="Remove"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPickingGallery(true)}
                className="w-20 h-16 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-400 flex items-center justify-center"
                aria-label="Add gallery image"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <MediaPicker
            kind="doc"
            label="Spec sheet / TDS (PDF)"
            valueId={p.specSheetId}
            valueUrl={p.specSheetId ? mediaById[p.specSheetId]?.url : ''}
            onPick={(mid) => set('specSheetId', mid)}
          />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-base font-semibold text-black mb-4">Long copy</h2>
        <div className="flex flex-col gap-4">
          <Field label="Description" hint="Basic HTML allowed: <p>, <strong>, <ul>, <a>…">
            <Textarea
              rows={6}
              value={p.description}
              onChange={(e) => set('description', e.target.value)}
              className="font-mono text-xs"
            />
          </Field>
          <Field label="Application notes" hint="Dosing, temperature, process guidance.">
            <Textarea
              rows={6}
              value={p.application}
              onChange={(e) => set('application', e.target.value)}
              className="font-mono text-xs"
            />
          </Field>
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-3 lg:pl-64">
        {save.node}
        <Button variant="ghost" onClick={() => navigate('/admin/products')}>
          Back
        </Button>
        <Button onClick={submit} disabled={save.state === 'saving'}>
          Save
        </Button>
      </div>

      {pickingGallery && (
        <MediaLibraryModal
          kind="image"
          onClose={() => setPickingGallery(false)}
          onPick={(m) => {
            if (!p.galleryIds.includes(m.id)) set('galleryIds', [...p.galleryIds, m.id])
            setMedia((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
            setPickingGallery(false)
          }}
        />
      )}
    </div>
  )
}
