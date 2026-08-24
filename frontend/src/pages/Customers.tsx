import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '../api/client'
import { Button, Card, EmptyState, Field, Input, Modal } from '../components/ui'
import type { Customer } from '../types'

const emptyForm = { name: '', email: '', phone: '', address: '' }

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  function load(query = '') {
    api.get('/customers', { params: { q: query || undefined } }).then((r) => setCustomers(r.data))
  }
  useEffect(() => load(), [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '' })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (editing) await api.patch(`/customers/${editing.id}`, form)
      else await api.post('/customers', form)
      setOpen(false)
      load(q)
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this customer?')) return
    try {
      await api.delete(`/customers/${id}`)
      load(q)
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Your customer directory</p>
        </div>
        <Button onClick={openCreate}>+ New Customer</Button>
      </div>

      <Input
        placeholder="Search by name, email or phone…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          load(e.target.value)
        }}
        className="max-w-sm"
      />

      <Card>
        {customers.length === 0 ? (
          <EmptyState message="No customers found" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-5 py-3 text-slate-600">{c.email || '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{c.phone || '—'}</td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => openEdit(c)} className="text-sm text-brand-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="text-sm text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Customer' : 'New Customer'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
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
            {editing ? 'Save changes' : 'Create customer'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
