import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useAuthStore } from '../store/auth'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/pos', label: 'Point of Sale', icon: '🧾', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/parts', label: 'Inventory', icon: '🔩', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: '📦', roles: ['ADMIN', 'MANAGER'] },
  { to: '/sales', label: 'Sales History', icon: '🧮', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/customers', label: 'Customers', icon: '👥', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { to: '/suppliers', label: 'Suppliers', icon: '🚚', roles: ['ADMIN', 'MANAGER'] },
  { to: '/categories', label: 'Categories', icon: '🏷️', roles: ['ADMIN', 'MANAGER'] },
  { to: '/reports', label: 'Reports', icon: '📈', roles: ['ADMIN', 'MANAGER'] },
  { to: '/users', label: 'Staff Accounts', icon: '🔐', roles: ['ADMIN'] },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const items = NAV.filter((item) => !user || item.roles.includes(user.role))

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <span className="text-2xl">🔧</span>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-900">AutoParts POS</p>
            <p className="text-xs text-slate-500">Store Management</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user?.role}</p>
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <Outlet />
      </main>
    </div>
  )
}
