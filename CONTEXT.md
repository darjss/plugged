# Plugged Audio — Domain Glossary

## People

- **Customer** — a person who buys IEMs. Identified by phone number (SMS OTP). May or may not have an account; checkout works for guests (phone entered at checkout).
- **Admin** — a store operator with Google OAuth access and `isAdmin = true` on their user record. Manages products, orders, and views analytics.
- **Guest** — a customer who checks out without logging in. Their order is linked by phone number. They can track orders via phone number on the `/track` page.

## Catalog

- **Product** — a sellable item (IEM, DAC amp, or wireless earbud). Has a slug, brand, price in MNT, status (draft/active/archived), images, and optional variants.
- **IEM Spec** — technical specifications attached to an IEM product: driver type, impedance, sensitivity, frequency response, connector, cable, mic, shell material, sound signature, fit, accessories. Includes a `squiglinkFile` reference for frequency response chart data.
- **Product Variant** — a purchasable SKU under a product (e.g. different color, impedance option). Has its own price, stock, and SKU code.
- **Brand** — the manufacturer of a product (e.g. Moondrop, Tangzu, Truthear).
- **Category** — a product grouping: IEMs, DAC amps, Wireless.
- **Featured Product** — a product flagged to appear on the homepage's featured grid.

## Commerce

- **Cart** — client-side SolidJS store in LocalStorage. Holds product variant IDs + quantities. Synced to server only at checkout. Not persisted across devices.
- **Order** — a confirmed purchase. Has an order number, customer phone/name/address, line items, delivery fee, total, and status (pending/shipped/delivered/cancelled/refunded).
- **Order Item** — a line in an order: product, variant, quantity, unit price, line total.
- **Payment** — a payment record linked to an order. Provider is QPay. Has status (pending/customer-claimed-paid/success/failed), QPay invoice ID, QR text/image.
- **Checkout** — single-page flow: customer info (phone, name, address, notes) → submit creates order + QPay invoice → QR displayed inline → poll for payment → redirect to confirmation on success.
- **Delivery** — flat fee (6000 MNT), one provider behind the scenes, customer just provides an address. No provider selection in the UI.

## Payments

- **QPay** — Mongolian payment gateway. Creates invoices with QR codes. Webhook receives payment notifications. The integration includes invoice creation, QR display, payment status polling, and webhook handling.

## Analytics

- **PostHog** — product analytics. Storefront events: pageview, product_view, add_to_cart, checkout_started, purchase_completed. Admin dashboard: traffic trends, funnel, revenue. Separate PostHog project for plugged.
- **AI Search** — Cloudflare's AI Search product (beta). Indexes product data (name, brand, description, specs, sound signature). Powers the search overlay on the storefront with hybrid semantic + keyword search.

## Audio Reference

- **squig.link** — community IEM frequency response measurement database. Product detail pages fetch `.txt` measurement data from squig.link's legacy API and render a custom d3 chart styled to the grunge aesthetic. The `squiglinkFile` field on `iem_spec` stores the reference filename.

## Design

- **Grunge/Zine Aesthetic** — the visual language: photocopied zine/rave-flyer wall, torn paper edges, halftone images, hazard-orange highlights, acid pink accents, layered misalignment. Anti-grid but strict hierarchy. Defined in DESIGN.md.
- **View Transitions** — Astro View Transitions enabled on all pages. Cart drawer persists across page swaps via `transition:persist`. SolidJS islands use `client:only` for cart-dependent components to avoid SSR/localStorage mismatches.

## Error Handling

- **DomainError** — base error class with `status` (HTTP code) and `code` (kebab-case string). Subclasses: `NotFoundError`, `ValidationError`, `OutOfStockError`, `ConflictError`, `UnauthorizedError`. Thrown by query layer, caught by Elysia `.onError()` hook.
- **Error Envelope** — `{ error: { code: string, message: string, details?: Record<string, unknown> } }`. Returned for all error responses. Eden Treaty clients discriminate on `code`.
