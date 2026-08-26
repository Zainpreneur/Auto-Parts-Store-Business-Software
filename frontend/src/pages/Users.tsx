import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '../api/client'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select } from '../components/ui'
import { useAuthStore } from '../store/auth'
import type { Role } from '../types'

interface StaffUser {
  id: number
  name: string
  email: string
  role: Role
  active: boolean
}

const emptyForm = { name: '', email: '', password: '', role: 'CASHIER' as Role }

export default function Users() {
  const [users, setUsers] = useState<StaffUser[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const currentUser = useAuthStore((s) => s.user)

  function load() {
    api.get('/users').then((r) => setUsers(r.data))
  }
  useEffect(load, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/auth/register', form)
      setOpen(false)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  async function toggleActive(u: StaffUser) {
    await api.patch(`/users/${u.id}`, { active: !u.active })
    load()
  }

  async function handleDelete(u: StaffUser) {
    if (!confirm(`Remove ${u.name}'s account?`)) return
    try {
      await api.delete(`/users/${u.id}`)
      load()
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Accounts</h1>
          <p className="text-sm text-slate-500">Manage who can access the store system</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ New Staff Account</Button>
      </div>

      <Card>
        {users.length === 0 ? (
          <EmptyState message="No staff accounts" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-800">{u.name}</td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <Badge tone="blue">{u.role}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={u.active ? 'green' : 'slate'}>{u.active ? 'Active' : 'Disabled'}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right space-x-3">
                    <button onClick={() => toggleActive(u)} className="text-sm text-brand-600 hover:underline">
                      {u.active ? 'Disable' : 'Enable'}
                    </button>
                    {u.id !== currentUser?.id && (
                      <button onClick={() => handleDelete(u)} className="text-sm text-red-600 hover:underline">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Staff Account">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Full name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Temporary password">
            <Input type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="CASHIER">Cashier</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>
      </Modal>
    </div>
  )
}
