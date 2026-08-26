# Auto Parts Store Business Software

A full-stack business management system for an auto parts store: inventory
with vehicle fitment tracking, a point-of-sale checkout, purchase orders,
customers, suppliers, staff accounts with roles, and a reporting dashboard.

## Stack

- **Backend:** Node.js, Express, TypeScript, Prisma ORM, SQLite (swap to
  Postgres/MySQL for production by changing one line — see below), JWT auth,
  Zod validation.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router,
  Zustand, Recharts, Axios.

## Features

- **Authentication & roles** — JWT login, three roles (`ADMIN`, `MANAGER`,
  `CASHIER`) with route- and action-level permission checks on both the API
  and the UI.
- **Inventory (Parts)** — SKU, brand, category, supplier, cost/selling price,
  quantity, reorder level, bin location, and vehicle fitment (make / model /
  year range). Search and filter by keyword, category, or low-stock status.
  Manual stock adjustments (received, damaged, recount) are logged as stock
  movements.
- **Point of Sale** — fast part lookup, cart with live totals (tax &
  discount), multiple payment methods, invoice numbering, and atomic stock
  deduction. Sales can be voided (restocks items).
- **Purchase Orders** — build a PO against a supplier with line items and
  unit cost; "Receive" increases stock and updates cost price in one
  transaction.
- **Customers & Suppliers** — simple CRM/vendor directories with purchase
  history.
- **Dashboard & Reports** — today/this-month revenue, low-stock alerts,
  inventory valuation, a 14-day revenue trend, top-selling parts, and an
  inventory-value-by-category breakdown.
- **Staff accounts** — admins can create/disable/delete staff and assign
  roles.

## Project layout

```
backend/    Express + Prisma API (src/routes, src/middleware, prisma/schema.prisma)
frontend/   React + Vite SPA (src/pages, src/components, src/store, src/api)
```

## Getting started

Requires Node.js 18+.

```bash
# 1. Install dependencies for both apps
npm run setup

# 2. Configure the backend environment
cp backend/.env.example backend/.env
# edit backend/.env if you want to change JWT_SECRET, PORT, etc.

# 3. Create the database schema and seed demo data
npm run db:migrate
npm run db:seed

# 4. Run both apps together (backend on :4000, frontend on :5173)
npm run dev
```

Then open http://localhost:5173. The Vite dev server proxies `/api` to the
backend, so no extra configuration is needed.

### Demo accounts (created by the seed script)

| Role    | Email                     | Password    |
|---------|---------------------------|-------------|
| Admin   | admin@autoparts.local     | admin123    |
| Cashier | cashier@autoparts.local   | cashier123  |

### Running the apps individually

```bash
npm run dev:backend   # API on http://localhost:4000
npm run dev:frontend  # SPA on http://localhost:5173
```

### Building for production

```bash
npm run build
# backend/dist  -> node backend/dist/index.js
# frontend/dist -> serve as static files behind any web server / CDN
```

## Switching to Postgres/MySQL

The default SQLite setup needs zero configuration and is great for local
use or a single-machine deployment. For a multi-user production deployment,
switch the datasource in `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql" // or "mysql"
  url      = env("DATABASE_URL")
}
```

then set `DATABASE_URL` in `backend/.env` to your connection string and
re-run `npm run db:migrate`. (SQLite has no native enum type, so
role/status/type fields are modeled as `String` and validated by Zod at the
API layer — see the comment at the top of `schema.prisma` if you want to
convert them to real Postgres enums.)

## API overview

All endpoints are under `/api` and (except `/api/auth/login` and
`/api/health`) require an `Authorization: Bearer <token>` header.

| Area            | Endpoints |
|------------------|-----------|
| Auth             | `POST /auth/login`, `POST /auth/register` (admin), `GET /auth/me` |
| Users            | `GET/PATCH/DELETE /users` (admin) |
| Categories       | `GET/POST/PATCH/DELETE /categories` |
| Suppliers        | `GET/POST/PATCH/DELETE /suppliers` |
| Customers        | `GET/POST/PATCH/DELETE /customers` |
| Parts            | `GET/POST/PATCH/DELETE /parts`, `GET /parts/low-stock`, `POST /parts/:id/adjust-stock`, `GET /parts/:id/stock-movements` |
| Purchase Orders  | `GET/POST/PATCH/DELETE /purchase-orders`, `POST /purchase-orders/:id/receive`, `POST /purchase-orders/:id/cancel` |
| Sales (POS)      | `GET/POST /sales`, `GET /sales/:id`, `POST /sales/:id/void` |
| Dashboard        | `GET /dashboard/summary`, `GET /dashboard/sales-trend`, `GET /dashboard/top-parts` |

## Data model

See `backend/prisma/schema.prisma` for the full schema: `User`, `Category`,
`Supplier`, `Part`, `Fitment` (vehicle compatibility), `Customer`,
`PurchaseOrder` / `PurchaseOrderItem`, `Sale` / `SaleItem`, and
`StockMovement` (an audit trail of every stock change).
