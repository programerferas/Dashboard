# Print Style — Internal Customer Management

An internal web application for a small printing and customization business.

It answers one question quickly:

> "I have hundreds of customers. Find any one of them and show me immediately who
> they are and what they have bought from us."

It is a standalone tool with its own PostgreSQL database. There is no Google
Sheets connection anywhere in it — the database is the single source of truth.

---

## 1. Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Frontend  | React 18, Vite, React Router, plain CSS |
| API       | Node.js, Express                        |
| Database  | PostgreSQL via Prisma ORM               |
| Auth      | JWT in an httpOnly cookie, bcrypt       |
| Validation| Zod (on the API, not only in the forms) |

No Redis, no queues, no microservices, no state-management library. The data flow
is the normal one:

```
React page → src/api/*.js → Express route → controller → service → Prisma → PostgreSQL
```

---

## 2. Getting started

### Requirements

- Node.js 20 or newer
- A running PostgreSQL server

### Step 1 — Database

Create an empty database:

```sql
CREATE DATABASE print_style;
```

### Step 2 — Backend

```bash
cd backend
npm install
```

Open `backend/.env` and set `DATABASE_URL` to your own PostgreSQL user and
password (the file is created from `.env.example` with placeholder values):

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/print_style?schema=public"
JWT_SECRET="any-long-random-string"
```

Create the tables and load the demo data:

```bash
npx prisma migrate dev --name init   # creates the tables
npm run seed                         # 34 demo customers, 70+ orders, 13 products
npm run dev                          # http://localhost:5000
```

### Step 3 — Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

Open <http://localhost:5173> and sign in with one of the seeded accounts:

| Role     | Email                       | Password       |
| -------- | --------------------------- | -------------- |
| Admin    | `admin@printstyle.local`    | `admin1234`    |
| Employee | `employee@printstyle.local` | `employee1234` |

> The Vite dev server proxies `/api` to `http://localhost:5000`, so the browser
> sees one origin and the session cookie works without any CORS configuration.

---

## 3. What the application does

**Dashboard** — total, new and repeat customers; orders in total, this month and
today; most purchased products and categories; where customers come from; recent
customers and orders. No revenue figures, because the database stores no prices.

**Customers** — a table of every customer with their order count, last order and
status. Partial search across name, customer ID, phone and email. Filters for
status, city, source and date added. Add, edit, and (admin only) delete.

**Customer profile** — the Customer 360 view. Contact details, the calculated
statistics, the complete order history, a category breakdown, every product they
have bought, and their latest order — all on one page.

**Orders** — every order in the shop, searchable by order ID, customer ID, name,
phone or product, and filterable by category, occasion, status, date and customer.

**Products** — the catalogue orders are built from, plus which products and
categories sell the most.

**Settings** — your own account, and for an admin, the staff accounts.

---

## 4. Data model

```
Customer ──1:N──► Order ◄──N:1── Product
```

```
Customer                    Order                      Product
--------                    -----                      -------
id                          id                         id
customerId  (C001) ◄──────► customerId                 productId  (P001)
fullName                    orderId    (O001)          name
phone                       productId  ──────────────► category
email                       orderDate                  occasion
age                         productName                active
gender                      category                   notes
city                        occasion                   createdAt
country                     quantity                   updatedAt
source                      status
notes                       notes
createdAt                   createdAt
updatedAt                   updatedAt
```

Three decisions worth knowing:

1. **`customerId` is the relationship key.** Orders are linked to a customer by
   their business ID (`C001`), not by their name. Names repeat — the seed data has
   three different customers called Sara — and the ID is what the shop already
   writes on the order sheet. It is generated automatically and can never be
   edited.

2. **Customer status is never stored.** "New" (one order) and "Repeat" (more than
   one) are calculated from the orders every time they are needed, so they cannot
   drift out of sync with reality. The same is true of every statistic on the
   profile page.

3. **Orders keep their own copy of the product name and category.** They also link
   to the product when there is one. If a product is renamed or retired next year,
   last year's orders still show what was actually sold.

There is one table per entity. There is no table, sheet or page per customer — the
profile page is generated from the database for whichever customer you open.

---

## 5. Project layout

```
backend/
  server.js                    starts the HTTP server
  app.js                       middleware and route mounting
  config/env.js                environment validation (fails fast at boot)
  lib/prisma.js                the single PrismaClient
  lib/constants.js             enum values shared across the API
  middlewares/                 auth, validation, error handling
  schemas/                     Zod request schemas
  modules/
    auth/                      login, logout, staff accounts
    customer/
      customer.routes.js       HTTP layer
      customer.controller.js   reads the request, calls the service
      customer.service.js      business logic + database queries
      customer.analytics.js    pure calculation functions (no DB, no Express)
    order/
    product/
    dashboard/
  prisma/
    schema.prisma              the database schema
    seed.js                    demo data (clearly marked as such)
  utils/                       errors, async wrapper, ID generation, pagination

frontend/
  src/
    api/                       one file per resource; all fetch calls live here
    components/
      layout/                  sidebar, topbar, page frame
      ui/                       buttons, cards, table, modal, states, pagination
      customers/ orders/ products/   the add/edit forms
    context/                   AuthContext, ToastContext
    hooks/                     useApi, useAction, useDebounce
    lib/                       formatting and dropdown options
    pages/                     one file per screen
    styles/index.css           the whole design system
```

The layers are kept apart on purpose:

- **UI** (`pages`, `components`) renders and collects input.
- **API client** (`src/api`) is the only place that calls `fetch`.
- **Controllers** translate HTTP to function calls, nothing more.
- **Services** hold the business rules and the database queries.
- **Analytics** (`customer.analytics.js`) are pure functions over an array of
  orders — no database, no Express, easy to read and to test.

---

## 6. Useful commands

```bash
# backend
npm run dev             # start with auto-restart
npm run seed            # reload the demo data
npx prisma studio       # browse the database in a GUI
npx prisma migrate dev  # create a migration after editing schema.prisma

# frontend
npm run dev             # dev server
npm run build           # production build
```

---

## 7. Demo data

`backend/prisma/seed.js` creates **34 customers, 70+ orders and 13 products**, all
invented. Every name, phone number and note in it is fictional, and the file says
so at the top. It includes repeat customers, one-time customers, customers with no
orders yet, sports/couple/graduation/corporate buyers, several cities and
countries, every customer source, and a cancelled order — enough to exercise
search, the filters, the profile statistics and the dashboard.

Running `npm run seed` **wipes** customers, orders and products before refilling
them. Staff accounts are kept.

Before using the app with real customers: run the seed once to explore, then clear
the demo data and remove the demo-account hint at the bottom of
`frontend/src/pages/LoginPage.jsx`.

---

## 8. Permissions

| Action                                   | Admin | Employee |
| ---------------------------------------- | :---: | :------: |
| View dashboard, customers, orders, products | yes | yes |
| Add and edit customers, orders, products | yes   | yes      |
| Delete customers, orders, products       | yes   | no       |
| Create staff accounts                    | yes   | no       |

Deliberately just two roles. Deleting a customer also deletes their order history,
which is why it is admin-only and always behind a confirmation dialog.

---

## 9. Room to grow

The structure leaves room for these without rework, but **none of them are built**:
WhatsApp integration, invoices, tags, CSV export, customer segmentation, reminders,
order notifications, finer-grained roles, customer lifetime value, reporting.

Adding a feature normally means: a field in `schema.prisma` and a migration, the
Zod schema, the service function, the route, and the page — in that order.
