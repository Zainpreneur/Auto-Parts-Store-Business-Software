import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '../api/client'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, money } from '../components/ui'
import type { Category, Fitment, Part, Supplier } from '../types'
import { useAuthStore } from '../store/auth'

const emptyForm = {
  sku: '',
  name: '',
  description: '',
  brand: '',
  categoryId: '',
  supplierId: '',
  costPrice: '0',
  sellingPrice: '0',
  quantity: '0',
  reorderLevel: '5',
  location: '',
}

export default function Parts() {
  const [parts, setParts] = useState<Part[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Part | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [fitments, setFitments] = useState<Fitment[]>([])
  const [error, setError] = useState('')
  const [adjusting, setAdjusting] = useState<Part | null>(null)
  const [adjustForm, setAdjustForm] = useState({ type: 'IN', quantity: '1', reason: '' })
  const [adjustError, setAdjustError] = useState('')
  const canEdit = useAuthStore((s) => s.user?.role !== 'CASHIER')

  function load() {
    api
      .get('/parts', { params: { q: q || undefined, categoryId: categoryId || undefined, lowStock: lowStock || undefined, pageSize: 100 } })
      .then((r) => {
        setParts(r.data.items)
        setTotal(r.data.total)
      })
  }

  useEffect(load, [q, categoryId, lowStock])
  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data))
    api.get('/suppliers').then((r) => setSuppliers(r.data))
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFitments([])
    setError('')
    setOpen(true)
  }

  function openEdit(p: Part) {
    setEditing(p)
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description || '',
      brand: p.brand || '',
      categoryId: p.categoryId ? String(p.categoryId) : '',
      supplierId: p.supplierId ? String(p.supplierId) : '',
      costPrice: String(p.costPrice),
      sellingPrice: String(p.sellingPrice),
      quantity: String(p.quantity),
      reorderLevel: String(p.reorderLevel),
      location: p.location || '',
    })
    setFitments(p.fitments || [])
    setError('')
    setOpen(true)
  }

  function addFitment() {
    setFitments([...fitments, { make: '', model: '', yearFrom: undefined, yearTo: undefined }])
  }
  function updateFitment(idx: number, patch: Partial<Fitment>) {
    setFitments(fitments.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }
  function removeFitment(idx: number) {
    setFitments(fitments.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const payload = {
      sku: form.sku,
      name: form.name,
      description: form.description || undefined,
      brand: form.brand || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      quantity: Number(form.quantity),
      reorderLevel: Number(form.reorderLevel),
      location: form.location || undefined,
      fitments: fitments
        .filter((f) => f.make && f.model)
        .map((f) => ({
          make: f.make,
          model: f.model,
          yearFrom: f.yearFrom ? Number(f.yearFrom) : undefined,
          yearTo: f.yearTo ? Number(f.yearTo) : undefined,
        })),
    }
    try {
      if (editing) await api.patch(`/parts/${editing.id}`, payload)
      else await api.post('/parts', payload)
      setOpen(false)
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this part? This cannot be undone.')) return
    try {
      await api.delete(`/parts/${id}`)
      load()
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  function openAdjust(p: Part) {
    setAdjusting(p)
    setAdjustForm({ type: 'IN', quantity: '1', reason: '' })
    setAdjustError('')
  }

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!adjusting) return
    setAdjustError('')
    try {
      await api.post(`/parts/${adjusting.id}/adjust-stock`, {
        type: adjustForm.type,
        quantity: Number(adjustForm.quantity),
        reason: adjustForm.reason || undefined,
      })
      setAdjusting(null)
      load()
    } catch (err) {
      setAdjustError(apiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">{total} parts in catalog</p>
        </div>
        {canEdit && <Button onClick={openCreate}>+ New Part</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search by SKU, name, brand…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="max-w-[180px]">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} />
          Low stock only
        </label>
      </div>

      <Card>
        {parts.length === 0 ? (
          <EmptyState message="No parts found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Brand</th>
                  <th className="px-5 py-3 text-right">Cost</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">Stock</th>
                  {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-5 py-3 text-slate-600">{p.category?.name || '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{p.brand || '—'}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{money(p.costPrice)}</td>
                    <td className="px-5 py-3 text-right font-medium">{money(p.sellingPrice)}</td>
                    <td className="px-5 py-3 text-right">
                      {p.quantity <= p.reorderLevel ? <Badge tone="red">{p.quantity} low</Badge> : <Badge tone="green">{p.quantity}</Badge>}
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right space-x-3">
                        <button onClick={() => openAdjust(p)} className="text-sm text-slate-600 hover:underline">
                          Adjust
                        </button>
                        <button onClick={() => openEdit(p)} className="text-sm text-brand-600 hover:underline">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="text-sm text-red-600 hover:underline">
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Part' : 'New Part'} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU">
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required autoFocus />
            </Field>
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
          </div>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Brand">
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </Field>
            <Field label="Category">
              <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Supplier">
              <Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">None</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Cost price">
              <Input type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
            </Field>
            <Field label="Selling price">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
              />
            </Field>
            <Field label="Quantity">
              <Input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                disabled={!!editing}
                title={editing ? 'Use "Adjust stock" from the inventory table to change quantity' : undefined}
              />
            </Field>
            <Field label="Reorder level">
              <Input type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </Field>
          </div>
          <Field label="Bin / Location">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. A1-03" />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Vehicle Fitment</span>
              <button type="button" onClick={addFitment} className="text-sm text-brand-600 hover:underline">
                + Add fitment
              </button>
            </div>
            <div className="space-y-2">
              {fitments.map((f, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_80px_80px_auto] items-center gap-2">
                  <Input placeholder="Make" value={f.make} onChange={(e) => updateFitment(idx, { make: e.target.value })} />
                  <Input placeholder="Model" value={f.model} onChange={(e) => updateFitment(idx, { model: e.target.value })} />
                  <Input
                    placeholder="From"
                    type="number"
                    value={f.yearFrom ?? ''}
                    onChange={(e) => updateFitment(idx, { yearFrom: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <Input
                    placeholder="To"
                    type="number"
                    value={f.yearTo ?? ''}
                    onChange={(e) => updateFitment(idx, { yearTo: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <button type="button" onClick={() => removeFitment(idx)} className="text-red-500 hover:text-red-700">
                    ✕
                  </button>
                </div>
              ))}
              {fitments.length === 0 && <p className="text-xs text-slate-400">No vehicle compatibility set — this part fits any vehicle.</p>}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">
            {editing ? 'Save changes' : 'Create part'}
          </Button>
        </form>
      </Modal>

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title={`Adjust Stock — ${adjusting?.name ?? ''}`}>
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <p className="text-sm text-slate-500">Current quantity: {adjusting?.quantity}</p>
          <Field label="Movement type">
            <Select value={adjustForm.type} onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}>
              <option value="IN">Stock In (received / correction)</option>
              <option value="OUT">Stock Out (damaged / lost)</option>
              <option value="ADJUSTMENT">Set exact quantity</option>
            </Select>
          </Field>
          <Field label={adjustForm.type === 'ADJUSTMENT' ? 'New quantity' : 'Quantity'}>
            <Input type="number" min="0" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} required />
          </Field>
          <Field label="Reason (optional)">
            <Input value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} placeholder="e.g. Physical count correction" />
          </Field>
          {adjustError && <p className="text-sm text-red-600">{adjustError}</p>}
          <Button type="submit" className="w-full">
            Apply adjustment
          </Button>
        </form>
      </Modal>
    </div>
  )
}
