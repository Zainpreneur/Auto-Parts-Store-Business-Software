import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '../api/client'
import { Button, Card, EmptyState, Input, Modal } from '../components/ui'
import type { Category } from '../types'
import { useAuthStore } from '../store/auth'

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const canEdit = useAuthStore((s) => s.user?.role !== 'CASHIER')

  function load() {
    api.get('/categories').then((r) => setCategories(r.data))
  }

  useEffect(load, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/categories', { name })
      setOpen(false)
      setName('')
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this category? Parts using it will be uncategorized.')) return
    await api.delete(`/categories/${id}`)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">Organize your parts catalog</p>
        </div>
        {canEdit && <Button onClick={() => setOpen(true)}>+ New Category</Button>}
      </div>

      <Card>
        {categories.length === 0 ? (
          <EmptyState message="No categories yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Parts</th>
                {canEdit && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-5 py-3 text-slate-600">{c._count?.parts ?? 0}</td>
                  {canEdit && (
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleDelete(c.id)} className="text-sm text-red-600 hover:underline">
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Category">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input placeholder="e.g. Brakes" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">
            Create
          </Button>
        </form>
      </Modal>
    </div>
  )
}
