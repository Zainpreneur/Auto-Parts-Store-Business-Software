import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts'
import { api } from '../api/client'
import { Card, money } from '../components/ui'
import type { DashboardSummary } from '../types'

interface TrendPoint {
  date: string
  revenue: number
}

interface TopPart {
  part: { name: string; sku: string } | null
  quantitySold: number
  revenue: number
}

function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'red' }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === 'red' ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [topParts, setTopParts] = useState<TopPart[]>([])

  useEffect(() => {
    api.get('/dashboard/summary').then((r) => setSummary(r.data))
    api.get('/dashboard/sales-trend?days=14').then((r) => setTrend(r.data))
    api.get('/dashboard/top-parts?limit=5').then((r) => setTopParts(r.data))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your store's performance</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Today's Revenue" value={money(summary?.todayRevenue ?? 0)} hint={`${summary?.todayOrders ?? 0} orders`} />
        <StatCard label="This Month" value={money(summary?.monthRevenue ?? 0)} hint={`${summary?.monthOrders ?? 0} orders`} />
        <StatCard label="Inventory Value" value={money(summary?.inventoryValue ?? 0)} hint={`${summary?.partsCount ?? 0} parts`} />
        <StatCard
          label="Low Stock Alerts"
          value={String(summary?.lowStockCount ?? 0)}
          hint="Parts at or below reorder level"
          tone={summary && summary.lowStockCount > 0 ? 'red' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Revenue — last 14 days</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} width={50} />
              <Tooltip formatter={(v) => money(Number(v))} />
              <Line type="monotone" dataKey="revenue" stroke="#1d4ed8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Top Selling Parts</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topParts.map((t) => ({ name: t.part?.sku ?? '—', qty: t.quantitySold }))} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="qty" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Recent Sales</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="pb-2">Invoice</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Items</th>
                <th className="pb-2 text-right">Total</th>
                <th className="pb-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {summary?.recentSales.map((sale) => (
                <tr key={sale.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 font-medium text-slate-800">{sale.invoiceNumber}</td>
                  <td className="py-2 text-slate-600">{sale.customer?.name ?? 'Walk-in'}</td>
                  <td className="py-2 text-slate-600">{sale.items.length}</td>
                  <td className="py-2 text-right font-medium">{money(sale.total)}</td>
                  <td className="py-2 text-right text-slate-400">{new Date(sale.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {!summary?.recentSales.length && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No sales yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
