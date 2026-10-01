# ShelfLife - E-Commerce SDLC Sprint 2

ShelfLife is an online bookstore project. Sprint 1 selected React.js, Node.js/Express.js and PostgreSQL. Sprint 2 implements the catalog data foundation described in the Sprint 2 manual.

## Sprint 2 implementation

- PostgreSQL migration for users, categories, products, variants, SKUs, assets, specifications and Sprint 1 cart/order entities.
- Protected administrator authentication using JWT.
- Category create/list/update/deactivate operations.
- Product create/list/update/archive operations.
- Variant creation and SKU create/update/deactivate operations.
- Database uniqueness and foreign-key constraints.
- Non-negative price and stock constraints.
- Seed data for 2 category levels, 3 products and 4 valid SKUs.
- Intentionally unavailable combination is represented by not creating a SKU for that combination.
- Automated Jest/Supertest tests for creation, duplicate values, category cycles, stock rules and authorization.

## Local setup

Requirements: Node.js 18+ and PostgreSQL 14+.

1. Copy `.env.example` to `.env`.
2. Create a PostgreSQL database named `shelflife`.
3. Run:

```bash
npm install
npm run migrate
npm run seed
npm test
npm start
```

API: `http://localhost:3000`

## Environment variables

- `PORT` - API port, default 3000.
- `DATABASE_URL` - PostgreSQL connection string.
- `JWT_SECRET` - local JWT signing secret. Do not commit the real value.
- `ADMIN_EMAIL` - seed administrator email.
- `ADMIN_PASSWORD` - seed administrator password. Do not commit a production password.

## Admin login

`POST /api/v1/auth/login`

```json
{"email":"admin@shelflife.local","password":"Admin@12345"}
```

Use the returned token as `Authorization: Bearer <token>` for `/api/v1/admin/*` routes. Change the demo password in local `.env` before real use.

## Main admin routes

- `POST /api/v1/admin/categories`
- `GET /api/v1/admin/categories`
- `PATCH /api/v1/admin/categories/:id`
- `DELETE /api/v1/admin/categories/:id` (soft deactivate)
- `POST /api/v1/admin/products`
- `GET /api/v1/admin/products`
- `PATCH /api/v1/admin/products/:id`
- `DELETE /api/v1/admin/products/:id` (archive)
- `POST /api/v1/admin/products/:id/variants`
- `POST /api/v1/admin/products/:id/skus`
- `PATCH /api/v1/admin/skus/:id`
- `DELETE /api/v1/admin/skus/:id` (soft deactivate)

## Sprint 2 evidence

The exact API responses and test result should be recorded in `docs/SPRINT_2.md` after running the commands above against the local PostgreSQL database. No secrets or live tokens should be committed.
