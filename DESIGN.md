# Design

## Overview

Plugged Audio is a light-mode, print-zine-meets-warehouse-rave storefront. The experience is built on a warm paper base, rough black typography, and a single saturated orange accent pulled directly from the logo's connector ring. The texture is physical: grain, stamp ink, and slight imperfections make the site feel printed rather than rendered.

The aesthetic bridges **industrial/techno brutalism** with **minimal street-lux**. That means bold structure, honest materials, restrained color, and no decorative fluff. Every element should feel like it could have been screen-printed, stamped, or torn from a zine.

## Theme

**Light mode as default.** The site lives on warm, uncoated paper — the kind you find in gig flyers, zines, and record-store handouts. The physical scene: a 19-year-old scrolls the site on their phone at a skate spot, in a bedroom lit by a warm lamp, or waiting for a train at night. The light background keeps it legible outdoors and feels approachable, while the high-contrast black type and orange accent give it underground energy.

## Color palette

**Color strategy: Committed.** One saturated accent (orange) carries meaningful weight across buttons, links, and key calls-to-action. Black dominates type and structure. Cream paper is the ground. A cool secondary (cyan-blue) is used sparingly for comparisons, EQ curves, and "technical trust" moments.

| Token         | OKLCH        | Hex       | Usage                                                            |
| ------------- | ------------ | --------- | ---------------------------------------------------------------- |
| `paper`       | 96% 0.01 85  | `#F5F1EA` | Page background, card fills                                      |
| `paper-dark`  | 90% 0.01 85  | `#E6E0D5` | Secondary surfaces, dividers, texture layers                     |
| `ink`         | 18% 0.01 85  | `#1A1917` | Primary text, logo, buttons, borders                             |
| `ink-muted`   | 45% 0.01 85  | `#6B675F` | Secondary text, captions, metadata                               |
| `orange`      | 65% 0.22 55  | `#E85D1C` | Primary accent: CTAs, active states, price highlights, logo ring |
| `orange-dark` | 55% 0.22 55  | `#C44A12` | Hover states, pressed buttons                                    |
| `cyan`        | 65% 0.16 230 | `#2A9DCC` | Secondary accent: sound-signature graphs, comparisons, bundles   |
| `green`       | 65% 0.14 145 | `#3FA66B` | Positive signals: in stock, added to cart, low distortion        |
| `red`         | 55% 0.22 25  | `#C92D2D` | Errors, out of stock, sale                                       |

### Color rules

- Never use pure `#000` or `#fff`. Tint every neutral toward the warm paper hue.
- Orange is the voice of the brand; cyan is the voice of comparison and data.
- Text on `paper` must hit 4.5:1 minimum. Large display type can use `ink` on `paper` at 3:1.
- Grunge textures must sit behind text at low opacity or be masked so they don't hurt legibility.

## Typography

**Display:** `Neue Montreal`, `Helvetica Now`, or `Inter Tight` fallback to system sans. Used for headings, navigation, and big product names. Weight 700–800, tight tracking (-0.02em to -0.04em), uppercase sparingly for section labels.

**Body:** `Suisse Int'l`, `Inter`, or system sans. Weight 400–500, readable line height (1.5–1.6), neutral tracking.

**Mono / data:** `SF Mono`, `JetBrains Mono`, or `ui-monospace`. Used for specs, prices, frequency labels, and sound-signature axes.

### Type scale

| Token        | Size                   | Line | Weight | Use                                |
| ------------ | ---------------------- | ---- | ------ | ---------------------------------- |
| `display-xl` | clamp(3rem, 8vw, 7rem) | 0.9  | 800    | Hero headlines                     |
| `display`    | clamp(2rem, 5vw, 4rem) | 0.95 | 700    | Page titles                        |
| `heading-lg` | 1.75rem                | 1.1  | 700    | Section headings                   |
| `heading`    | 1.25rem                | 1.2  | 600    | Card titles, product names         |
| `body-lg`    | 1.125rem               | 1.55 | 400    | Lead paragraphs                    |
| `body`       | 1rem                   | 1.6  | 400    | Body copy                          |
| `caption`    | 0.875rem               | 1.4  | 500    | Labels, metadata, specs            |
| `micro`      | 0.75rem                | 1.3  | 600    | Tags, timestamps, uppercase labels |

### Typography rules

- Cap body line length at 70ch.
- Use weight and scale contrast, not color alone, to build hierarchy.
- Uppercase is for labels, tags, and microcopy only — never for body text.

## Spacing

**Base unit:** 4px.

| Token      | Value | Use                        |
| ---------- | ----- | -------------------------- |
| `space-1`  | 4px   | Tight inline gaps          |
| `space-2`  | 8px   | Icon + text pairs          |
| `space-3`  | 12px  | Internal component padding |
| `space-4`  | 16px  | Card padding, form gaps    |
| `space-6`  | 24px  | Section internal gaps      |
| `space-8`  | 32px  | Component margins          |
| `space-12` | 48px  | Section margins            |
| `space-16` | 64px  | Major section breaks       |
| `space-24` | 96px  | Page-level breaks          |

**Rhythm:** Vary spacing intentionally. Hero sections breathe with `space-24`; dense product grids use `space-4`–`space-6`. Avoid equal padding everywhere.

## Layout

- **Container max-width:** 1440px with 16px–48px responsive horizontal padding.
- **Grid:** 12-column implicit grid for desktop, 4-column for mobile.
- **Product grid:** asymmetric when possible — featured product spans 2 columns, others 1. Avoid identical card grids.
- **Cards:** not the default. Use full-bleed product tiles, stacked editorial blocks, or spec rows before reaching for a card.
- **Borders:** 1px solid `ink` at 12% opacity for subtle separation. Use full borders, not side-stripe accents.

## Components

### Buttons

- **Primary:** `ink` background, `paper` text, no radius, uppercase micro label, generous padding (`space-4` horizontal, `space-3` vertical). Hover: slight scale (1.02) + `orange` background.
- **Secondary:** transparent background, `ink` border, `ink` text. Hover: `ink` background, `paper` text.
- **Accent:** `orange` background, `ink` text. Reserved for the main CTA on a page.

### Product tile

- Full-bleed product image on `paper`.
- Product name in `heading`, price in mono `caption` aligned to the right.
- A small sound-signature tag (e.g., "Warm / Detailed / Bass-forward") below the name.
- Hover: image lifts slightly, an orange dot or underline appears.

### Sound-signature graph

- Small inline bar or sparkline showing bass / mids / treble balance.
- Uses `orange` for the signature, `cyan` for comparisons, `ink-muted` for axes.
- Always paired with a plain-language label.

### Tags and labels

- Pill or rectangular tag with 1px `ink` border, `micro` uppercase text.
- Active/highlighted tags use `orange` fill + `ink` text.

### Navigation

- Fixed top bar, `paper` background with subtle grain texture.
- Logo on the left, search + cart on the right, category links centered (collapsed to menu on mobile).
- No drop shadows; use a 1px `ink` border at 8% opacity for separation.

## Imagery

- **Product photography:** studio shots on warm paper or raw concrete, harsh directional light, minimal styling. Show the IEM, cable, and a single prop (zine, keys, skate hardware).
- **Lifestyle photography:** candid, low-flash, warehouse or street settings. Avoid polished stock.
- **Texture overlays:** grain, dust, and stamp textures at low opacity. Use multiply or overlay blending modes. Never let texture touch text directly without a buffer.

## Motion

**Motion energy: low-medium, physical.** Interactions feel like paper sliding or a stamp hitting the page, not liquid morphs.

- Page transitions: a quick cut or a subtle horizontal wipe (0.2s ease-out-quart).
- Hover: transform-only, `translateY(-2px)` or scale 1.02.
- Scroll: minimal. Parallax only on hero imagery if at all.
- Easing: `cubic-bezier(0.165, 0.84, 0.44, 1)` (ease-out-quart).
- Respect `prefers-reduced-motion`: disable transforms and wipes, switch to instant state changes.

## Icons

- Simple, stroke-based icons at 1.5px weight.
- No filled gradients or shadows.
- Use a single icon set (e.g., Lucide) at 16px/24px sizes.

## Asset treatment

- Logo stays rough and unpolished. Do not clean it up or add effects.
- Favicon uses the black "P" mark on transparent or `paper` background.
- Social/OG imagery uses the logo stamped large on `paper` with a sliver of `orange`.
