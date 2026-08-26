export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: Role
  active?: boolean
}

export interface Category {
  id: number
  name: string
  _count?: { parts: number }
}

export interface Supplier {
  id: number
  name: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  _count?: { parts: number; purchaseOrders: number }
}

export interface Fitment {
  id?: number
  make: string
  model: string
  yearFrom?: number | null
  yearTo?: number | null
}

export interface Part {
  id: number
  sku: string
  name: string
  description?: string | null
  brand?: string | null
  categoryId?: number | null
  category?: Category | null
  supplierId?: number | null
  supplier?: Supplier | null
  costPrice: number
  sellingPrice: number
  quantity: number
  reorderLevel: number
  location?: string | null
  imageUrl?: string | null
  fitments?: Fitment[]
  createdAt?: string
}

export interface Customer {
  id: number
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  sales?: Sale[]
}

export type PurchaseOrderStatus = 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseOrderItem {
  id?: number
  partId: number
  part?: Part
  quantity: number
  unitCost: number
}

export interface PurchaseOrder {
  id: number
  supplierId: number
  supplier?: Supplier
  status: PurchaseOrderStatus
  orderDate: string
  receivedAt?: string | null
  notes?: string | null
  items: PurchaseOrderItem[]
}

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'OTHER'
export type SaleStatus = 'COMPLETED' | 'REFUNDED' | 'VOID'

export interface SaleItem {
  id?: number
  partId: number
  part?: Part
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Sale {
  id: number
  invoiceNumber: string
  customerId?: number | null
  customer?: Customer | null
  userId: number
  user?: { name: string }
  items: SaleItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  total: number
  paymentMethod: PaymentMethod
  status: SaleStatus
  createdAt: string
}

export interface DashboardSummary {
  todayRevenue: number
  todayOrders: number
  monthRevenue: number
  monthOrders: number
  partsCount: number
  customersCount: number
  lowStockCount: number
  inventoryValue: number
  recentSales: Sale[]
}
