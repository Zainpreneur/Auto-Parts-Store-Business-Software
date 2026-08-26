import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '../api/client'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, money } from '../components/ui'
import type { Part, PurchaseOrder, Supplier } from '../types'

interface DraftItem {
  partId: string
  quantity: string
  unitCost: string
}

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<DraftItem[]>([{ partId: '', quantity: '1', unitCost: '0' }])
  const [error, setError] = useState('')

  function load() {
    api.get('/purchase-orders').then((r) => setOrders(r.data))
  }
  useEffect(load, [])
  useEffect(() => {
    api.get('/suppliers').then((r) => setSuppliers(r.data))
    api.get('/parts', { params: { pageSize: 100 } }).then((r) => setParts(r.data.items))
  }, [])

  function openCreate() {
    setSupplierId('')
    setNotes('')
    setItems([{ partId: '', quantity: '1', unitCost: '0' }])
    setError('')
    setOpen(true)
  }

  function updateItem(idx: number, patch: Partial<DraftItem>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function addItem() {
    setItems([...items, { partId: '', quantity: '1', unitCost: '0' }])
  }
  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/purchase-orders', {
        supplierId: Number(supplierId),
        notes: notes || undefined,
        items: items
          .filter((it) => it.partId)
          .map((it) => ({ partId: Number(it.partId), quantity: Number(it.quantity), unitCost: Number(it.unitCost) })),
      })
      setOpen(false)
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  async function handleReceive(id: number) {
    if (!confirm('Mark this purchase order as received? Stock levels will be updated.')) return
    try {
      await api.post(`/purchase-orders/${id}/receive`)
      load()
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  async function handleCancel(id: number) {
    if (!confirm('Cancel this purchase order?')) return
    await api.post(`/purchase-orders/${id}/cancel`)
    load()
  }

  const orderTotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Restock inventory from your suppliers</p>
        </div>
        <Button onClick={openCreate}>+ New Purchase Order</Button>
      </div>

      <Card>
        {orders.length === 0 ? (
          <EmptyState message="No purchase orders yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="px-5 py-3">PO #</th>
                <th className="px-5 py-3">Supplier</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Total Cost</th>
                <th className="px-5 py-3 text-right">Ordered</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const total = o.items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0)
                return (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-800">PO-{String(o.id).padStart(4, '0')}</td>
                    <td className="px-5 py-3 text-slate-600">{o.supplier?.name}</td>
                    <td className="px-5 py-3 text-slate-600">{o.items.length}</td>
                    <td className="px-5 py-3">
                      <Badge tone={o.status === 'RECEIVED' ? 'green' : o.status === 'CANCELLED' ? 'red' : 'amber'}>{o.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-medium">{money(total)}</td>
                    <td className="px-5 py-3 text-right text-slate-400">{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right space-x-3">
                      {o.status === 'ORDERED' && (
                        <>
                          <button onClick={() => handleReceive(o.id)} className="text-sm text-green-600 hover:underline">
                            Receive
                          </button>
                          <button onClick={() => handleCancel(o.id)} className="text-sm text-red-600 hover:underline">
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Purchase Order" wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Supplier">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">Select a supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Items</span>
              <button type="button" onClick={addItem} className="text-sm text-brand-600 hover:underline">
                + Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_90px_100px_auto] items-center gap-2">
                  <Select value={it.partId} onChange={(e) => updateItem(idx, { partId: e.target.value })} required>
                    <option value="">Select part</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </Select>
                  <Input type="number" min="1" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit cost"
                    value={it.unitCost}
                    onChange={(e) => updateItem(idx, { unitCost: e.target.value })}
                  />
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-right text-sm font-medium text-slate-700">Order total: {money(orderTotal)}</p>
          </div>

          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">
            Create Purchase Order
          </Button>
        </form>
      </Modal>
    </div>
  )
}
