import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, apiErrorMessage } from '../api/client'
import { Button, Card, Input, Select, money } from '../components/ui'
import { useCartStore } from '../store/cart'
import type { Customer, Part, PaymentMethod } from '../types'

export default function POS() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Part[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [taxRate, setTaxRate] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastInvoice, setLastInvoice] = useState<string | null>(null)
  const navigate = useNavigate()

  const { lines, customerId, addPart, incrementLine, removeLine, setCustomer, clear } = useCartStore()

  useEffect(() => {
    api.get('/customers').then((r) => setCustomers(r.data))
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!q.trim()) {
        setResults([])
        return
      }
      api.get('/parts', { params: { q, pageSize: 8 } }).then((r) => setResults(r.data.items))
    }, 200)
    return () => clearTimeout(handle)
  }, [q])

  const subtotal = lines.reduce((sum, l) => sum + l.part.sellingPrice * l.quantity, 0)
  const discountNum = Number(discount) || 0
  const taxAmount = (subtotal - discountNum) * ((Number(taxRate) || 0) / 100)
  const total = subtotal - discountNum + taxAmount

  async function handleCheckout() {
    if (lines.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.post('/sales', {
        customerId: customerId || undefined,
        items: lines.map((l) => ({ partId: l.part.id, quantity: l.quantity })),
        taxRate: Number(taxRate) || 0,
        discount: discountNum,
        paymentMethod,
      })
      setLastInvoice(data.invoiceNumber)
      clear()
      setDiscount('0')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Point of Sale</h1>
        <Input
          placeholder="Scan or search by SKU / part name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          className="mb-4"
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => addPart(p)}
              disabled={p.quantity === 0}
              className="rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-400 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
            >
              <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
              <p className="font-mono text-xs text-slate-400">{p.sku}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-medium text-brand-600">{money(p.sellingPrice)}</span>
                <span className="text-xs text-slate-400">{p.quantity} in stock</span>
              </div>
            </button>
          ))}
          {q && results.length === 0 && <p className="col-span-full text-sm text-slate-400">No matching parts</p>}
        </div>
      </div>

      <div className="lg:col-span-2">
        <Card className="flex h-full flex-col p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Current Sale</h2>

          <Select value={customerId ?? ''} onChange={(e) => setCustomer(e.target.value ? Number(e.target.value) : null)} className="mb-3">
            <option value="">Walk-in customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <div className="flex-1 space-y-2 overflow-y-auto">
            {lines.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Cart is empty — search for a part to add it</p>}
            {lines.map((l) => (
              <div key={l.part.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{l.part.name}</p>
                  <p className="text-xs text-slate-400">{money(l.part.sellingPrice)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => incrementLine(l.part.id, -1)} className="h-6 w-6 rounded bg-slate-100 text-sm hover:bg-slate-200">
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{l.quantity}</span>
                  <button onClick={() => incrementLine(l.part.id, 1)} className="h-6 w-6 rounded bg-slate-100 text-sm hover:bg-slate-200">
                    +
                  </button>
                </div>
                <p className="ml-3 w-16 text-right text-sm font-medium">{money(l.part.sellingPrice * l.quantity)}</p>
                <button onClick={() => removeLine(l.part.id)} className="ml-2 text-slate-400 hover:text-red-500">
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Discount</span>
              <Input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-24 py-1 text-right" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Tax %</span>
              <Input type="number" min="0" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="w-24 py-1 text-right" />
            </div>
            <div className="flex items-center justify-between font-semibold text-slate-900">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>

            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </Select>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {lastInvoice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                Sale completed — invoice {lastInvoice}.{' '}
                <button className="underline" onClick={() => navigate('/sales')}>
                  View sales history
                </button>
              </p>
            )}

            <Button className="w-full" onClick={handleCheckout} disabled={lines.length === 0 || submitting}>
              {submitting ? 'Processing…' : `Charge ${money(total)}`}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
