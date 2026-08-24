import { useEffect, useState } from 'react'
import { api, apiErrorMessage } from '../api/client'
import { Badge, Button, Card, EmptyState, Modal, money } from '../components/ui'
import type { Sale } from '../types'
import { useAuthStore } from '../store/auth'

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [selected, setSelected] = useState<Sale | null>(null)
  const canVoid = useAuthStore((s) => s.user?.role !== 'CASHIER')

  function load() {
    api.get('/sales').then((r) => setSales(r.data))
  }
  useEffect(load, [])

  async function handleVoid(id: number) {
    if (!confirm('Void this sale? Stock will be restored.')) return
    try {
      await api.post(`/sales/${id}/void`)
      load()
      setSelected(null)
    } catch (err) {
      alert(apiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sales History</h1>
        <p className="text-sm text-slate-500">All recorded invoices</p>
      </div>

      <Card>
        {sales.length === 0 ? (
          <EmptyState message="No sales recorded yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="px-5 py-3">Invoice</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Cashier</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} onClick={() => setSelected(s)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{s.invoiceNumber}</td>
                  <td className="px-5 py-3 text-slate-600">{s.customer?.name ?? 'Walk-in'}</td>
                  <td className="px-5 py-3 text-slate-600">{s.user?.name}</td>
                  <td className="px-5 py-3 text-slate-600">{s.paymentMethod.replace('_', ' ')}</td>
                  <td className="px-5 py-3">
                    <Badge tone={s.status === 'COMPLETED' ? 'green' : s.status === 'VOID' ? 'red' : 'amber'}>{s.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right font-medium">{money(s.total)}</td>
                  <td className="px-5 py-3 text-right text-slate-400">{new Date(s.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Invoice ${selected?.invoiceNumber ?? ''}`} wide>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>
                <span className="text-slate-500">Customer:</span> {selected.customer?.name ?? 'Walk-in'}
              </p>
              <p>
                <span className="text-slate-500">Cashier:</span> {selected.user?.name}
              </p>
              <p>
                <span className="text-slate-500">Payment:</span> {selected.paymentMethod.replace('_', ' ')}
              </p>
              <p>
                <span className="text-slate-500">Date:</span> {new Date(selected.createdAt).toLocaleString()}
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Part</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2">{item.part?.name}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{money(item.unitPrice)}</td>
                    <td className="py-2 text-right">{money(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{money(selected.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Discount</span>
                <span>-{money(selected.discount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax ({selected.taxRate}%)</span>
                <span>{money(selected.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
                <span>Total</span>
                <span>{money(selected.total)}</span>
              </div>
            </div>
            {canVoid && selected.status === 'COMPLETED' && (
              <Button variant="danger" onClick={() => handleVoid(selected.id)}>
                Void Sale
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
