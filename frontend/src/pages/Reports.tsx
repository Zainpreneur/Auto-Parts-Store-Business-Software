import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '../api/client'
import { Badge, Card, EmptyState, money } from '../components/ui'
import type { Part } from '../types'

interface TopPart {
  part: { name: string; sku: string } | null
  quantitySold: number
  revenue: number
}

const COLORS = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#0ea5e9', '#38bdf8']

export default function Reports() {
  const [lowStock, setLowStock] = useState<Part[]>([])
  const [topParts, setTopParts] = useState<TopPart[]>([])
  const [allParts, setAllParts] = useState<Part[]>([])

  useEffect(() => {
    api.get('/parts/low-stock').then((r) => setLowStock(r.data))
    api.get('/dashboard/top-parts?limit=10').then((r) => setTopParts(r.data))
    api.get('/parts', { params: { pageSize: 100 } }).then((r) => setAllParts(r.data.items))
  }, [])

  const valueByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of allParts) {
      const name = p.category?.name || 'Uncategorized'
      map.set(name, (map.get(name) || 0) + p.costPrice * p.quantity)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
  }, [allParts])

  const totalInventoryValue = valueByCategory.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">Inventory valuation, low stock, and top sellers</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Inventory Value by Category ({money(totalInventoryValue)} total)</h2>
          {valueByCategory.length === 0 ? (
            <EmptyState message="No inventory data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={valueByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(d) => d.name}>
                  {valueByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => money(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Top Selling Parts (all time)</h2>
          {topParts.length === 0 ? (
            <EmptyState message="No sales recorded yet" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Part</th>
                  <th className="pb-2 text-right">Qty Sold</th>
                  <th className="pb-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topParts.map((t, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="py-2">
                      <p className="font-medium text-slate-800">{t.part?.name ?? 'Unknown'}</p>
                      <p className="font-mono text-xs text-slate-400">{t.part?.sku}</p>
                    </td>
                    <td className="py-2 text-right">{t.quantitySold}</td>
                    <td className="py-2 text-right font-medium">{money(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Low Stock Report ({lowStock.length})</h2>
        {lowStock.length === 0 ? (
          <EmptyState message="Nothing is low on stock 🎉" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="pb-2">SKU</th>
                <th className="pb-2">Name</th>
                <th className="pb-2">Supplier</th>
                <th className="pb-2 text-right">Quantity</th>
                <th className="pb-2 text-right">Reorder Level</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 font-mono text-xs text-slate-500">{p.sku}</td>
                  <td className="py-2 font-medium text-slate-800">{p.name}</td>
                  <td className="py-2 text-slate-600">{p.supplier?.name || '—'}</td>
                  <td className="py-2 text-right">
                    <Badge tone="red">{p.quantity}</Badge>
                  </td>
                  <td className="py-2 text-right text-slate-500">{p.reorderLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
