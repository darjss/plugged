# Plugged Audio

Plugged Audio is a curated in-ear monitor (IEM) reseller storefront and admin dashboard, built for the Mongolian market. It sells IEMs, DAC amps, and wireless earbuds priced in MNT, with checkout via the QPay payment gateway and SMS-OTP customer identification.

The site is designed around a "photocopied zine / warehouse rave flyer" aesthetic (see [`DESIGN.md`](./DESIGN.md)) — torn paper edges, halftone images, hazard-orange highlights — aimed at first-time IEM buyers who want gear that signals taste without audiophile jargon. Product context and brand positioning live in [`PRODUCT.md`](./PRODUCT.md) and [`CONTEXT.md`](./CONTEXT.md).

Production domain: **pluggedaudio.store**

## What it does

- **Storefront**: homepage with featured products, category navigation, product listing and category pages, product detail pages (images, IEM specs, sound signature, variant selector, add-to-cart), AI-powered search overlay, single-page checkout, order tracking by phone number, and static info pages (FAQ, shipping, contact, privacy, terms, returns).
- **Cart**: client-side SolidJS store persisted in LocalStorage; synced to the server only at checkout. The cart drawer persists across page swaps via Astro View Transitions.
- **Checkout**: customer info (phone, name, address, notes) → creates an order + QPay invoice → QR displayed inline → polls payment status → redirects to a confirmation page. Delivery is a flat 6,000 MNT fee.
- **Admin dashboard** (`/dashboard`): Google OAuth sign-in for admins. Manage products (create/edit, variants, images via R2), view and update orders, see analytics overview (PostHog traffic/funnels/revenue), and manage users/admin flags.
- **AI search**: hybrid semantic + keyword search over the catalog, backed by Cloudflare AI embeddings and Vectorize, with a D1 keyword fallback when vector search is unavailable.

## Tech stack

| Layer         | Technology                                                                              |
| ------------- | --------------------------------------------------------------------------------------- |
| Framework     | [Astro 7](https://astro.build) with [`@astrojs/cloudflare`](https://docs.astro.build)   |
| UI islands    | [SolidJS](https://www.solidjs.com) via `@astrojs/solid-js`, `@kobalte/core`, `@corvu/*` |
| Styling       | Tailwind CSS v4, `class-variance-authority`, `tailwind-variants`                        |
| Data fetching | TanStack Solid Query, Eden Treaty (type-safe Elysia client)                             |
| API           | [Elysia](https://elysia.dev) (runs in interpreted/AOT-off mode under Astro SSR)         |
| ORM / DB      | [Drizzle ORM](https://orm.drizzle.team) + Cloudflare D1 (SQLite)                        |
| Auth          | [better-auth](https://www.better-auth.com) — Google OAuth (admin) + SMS OTP (customer)  |
| Payments      | QPay (Mongolian gateway) — invoice creation, QR display, status polling, webhook        |
| SMS           | `android-sms-gateway` for OTP delivery                                                  |
| Storage       | Cloudflare R2 (product images), KV (cache + sessions)                                   |
| Search        | Cloudflare AI (`@cf/baai/bge-base-en-v1.5`) + Vectorize, D1 keyword fallback            |
| Analytics     | PostHog (pageviews, ecommerce events, admin dashboard)                                  |
| Validation    | [Valibot](https://valibot.dev) at the API boundary                                      |
| Motion        | `@motionone/dom`, `@motionone/solid`, Astro View Transitions                            |
| Deployment    | Cloudflare Workers (`wrangler deploy`)                                                  |
| Tooling       | [Vite+](https://viteplus.dev) (`vp` CLI), pnpm, TypeScript (`tsgo` native preview)      |

## Project structure

```text
src/
├── components/
│   ├── dashboard/     # Admin app: products, orders, analytics, settings (SolidJS)
│   ├── storefront/    # Header, cart, checkout, product cards, search, tracking
│   └── ui/            # Shared UI primitives (button, dialog, drawer, table, …)
├── layouts/           # Storefront + dashboard layouts
├── lib/               # Shared client utilities
├── pages/             # Astro routes (storefront, /dashboard, /api, /auth, /order)
│   ├── api/[...slug].ts   # Elysia API mounted on a single SSR endpoint
│   ├── dashboard/         # Admin SPA shell
│   ├── order/confirm/     # Post-checkout confirmation
│   ├── products/          # Listing, category, product detail
│   └── …                  # checkout, search, track, profile, legal/info pages
├── server/
│   ├── admin/         # Admin query modules (products, orders, stats, settings)
│   ├── api/           # Elysia app, auth plugin, admin route group, validation
│   ├── auth/          # Auth guards
│   ├── commerce/      # Store/checkout/order/payment queries, R2 image handling
│   ├── db/            # Drizzle schema + D1 client
│   ├── integrations/  # QPay, PostHog, SMS gateway clients
│   ├── lib/           # env, errors (DomainError), datetime, drizzle helpers
│   └── search/        # Embedding, index builder, query expansion, search
├── store/             # Client cart store (LocalStorage)
├── styles/            # Global styles
└── types/             # Consolidated product & order types
```

The Elysia API is defined in `src/server/api/app.ts` and mounted through `src/pages/api/[...slug].ts`. Eden Treaty infers end-to-end types from the Elysia route tree, so the SolidJS storefront and admin call the API with fully typed clients.

## Getting started

Requires Node >= 22.12 and pnpm 11. This repo uses [Vite+](https://viteplus.dev) — run `vp help` for the unified toolchain commands.

```sh
pnpm install          # or: vp install
```

Copy `.dev.vars.example` to `.dev.vars` and fill in the secrets (Google OAuth, SMS gateway, QPay, PostHog, AI Search index id). Production secrets are set with `wrangler secret put <NAME>`.

## Commands

All commands run from the repo root. From `package.json` scripts:

| Command                      | Action                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| `pnpm dev`                   | Start the Astro dev server (localhost:4321)                   |
| `pnpm build`                 | Build the production site to `./dist/`                        |
| `pnpm preview`               | Build then preview the production build locally               |
| `pnpm deploy`                | Build and deploy to Cloudflare Workers (`wrangler deploy`)    |
| `pnpm typecheck`             | Type-check with `tsgo`                                        |
| `pnpm generate-types`        | Generate `worker-configuration.d.ts` from `wrangler` bindings |
| `pnpm db:generate`           | Generate a Drizzle migration from `src/server/db/schema.ts`   |
| `pnpm db:seed:sql`           | Build the IEM catalog seed SQL (writes to stdout)             |
| `pnpm db:seed:remote`        | Build seed SQL and execute it against the remote D1 database  |
| `pnpm db:seed:images:sql`    | Build the IEM image seed SQL                                  |
| `pnpm db:seed:images:remote` | Build image seed SQL and execute it against remote D1         |
| `pnpm astro …`               | Run Astro CLI commands (`astro add`, `astro check`, …)        |

Vite+ wrappers (run via the `vp` CLI): `vp check` (format + lint + type-check), `vp test`, `vp run <script>`, `vp env doctor`.

## Configuration

- `wrangler.jsonc` — Cloudflare Workers config: D1 database (`plugged`), KV namespaces (`CACHE`, `SESSION`), R2 bucket (`plugged`), AI + Vectorize bindings, and public env vars.
- `drizzle.config.ts` — Drizzle Kit config (SQLite dialect, schema at `src/server/db/schema.ts`, migrations in `drizzle/migrations`).
- `astro.config.mjs` — Astro + Cloudflare adapter + SolidJS integration + Tailwind v4 Vite plugin.
- `.dev.vars` — local secrets (gitignored); see `.dev.vars.example`.

## Docs

- [`PRODUCT.md`](./PRODUCT.md) — product purpose, target users, brand personality, design principles.
- [`CONTEXT.md`](./CONTEXT.md) — domain glossary (people, catalog, commerce, payments, analytics, design tokens).
- [`DESIGN.md`](./DESIGN.md) — the grunge/zine visual language: palette, type, texture, components, motion.
- [`AGENTS.md`](./AGENTS.md) — tooling conventions (Vite+), commerce conventions, and agent skills.
- [`docs/agents/`](./docs/agents) — issue-tracker, triage-label, and domain-doc workflows.
