import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '../api/client'
import { Button, Card, EmptyState, Field, Input, Modal } from '../components/ui'
import type { Supplier } from '../types'

const emptyForm = { name: '', contactName: '', email: '', phone: '', address: '' }

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  function load() {
    api.get('/suppliers').then((r) => setSuppliers(r.data))
  }
  useEffect(load, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(s: Supplier) {
    setEditing(s)
    setForm({ name: s.name, contactName: s.contactName || '', email: s.email || '', phone: s.phone || '', address: s.address || '' })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await api.patch(`/suppliers/${editing.id}`, form)
      } else {
        await api.post('/suppliers', form)
      }
      setOpen(false)
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this supplier?')) return
    try {
      await api.delete(`/suppliers/${id}`)
      load()
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500">Vendors you purchase parts from</p>
        </div>
        <Button onClick={openCreate}>+ New Supplier</Button>
      </div>

      <Card>
        {suppliers.length === 0 ? (
          <EmptyState message="No suppliers yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Parts Supplied</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-5 py-3 text-slate-600">{s.contactName || '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{s.phone || '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{s._count?.parts ?? 0}</td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => openEdit(s)} className="text-sm text-brand-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-sm text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Supplier' : 'New Supplier'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Company name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </Field>
          <Field label="Contact name">
            <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Address">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">
            {editing ? 'Save changes' : 'Create supplier'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
