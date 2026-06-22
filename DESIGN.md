# Design

## Overview

Plugged Audio is a **photocopied zine / warehouse rave flyer wall** come to life. The site should feel like you ripped a stack of gig flyers off a concrete pillar at 2am: torn paper edges, halftone images, hazard-orange highlights, marker scribbles, tape, staples, and layered misalignment. It is intentionally raw, slightly wrong, and unmistakably human.

The aesthetic is **anti-grid**. Elements overlap, rotate, bleed, and tear. But underneath the chaos is a strict hierarchy: one massive headline, one clear CTA, and everything else supporting those two things.

## Register

brand

## Theme

**Light-mode zine as default.** The background is uncoated newsprint: warm, slightly yellowed, never pure white. The physical scene: a 20-year-old flips through a stack of torn-off flyers at a skate spot, then pulls out their phone to buy the IEM they saw on a friend's story. The light background keeps it legible, but the textures make it feel printed, scanned, and copied twice.

## Color palette

**Color strategy: Full palette / Drenched moments.** The base is muted newsprint, but accent colors hit like highlighters and spray paint. Orange owns the brand voice; secondary "flyer" colors (hazard yellow, stamp red, photocopy cyan) appear in small, violent doses.

| Token            | OKLCH        | Hex       | Usage                                                |
| ---------------- | ------------ | --------- | ---------------------------------------------------- |
| `newsprint`      | 94% 0.02 92  | `#F2ECD8` | Page background, aged paper                          |
| `newsprint-2`    | 90% 0.025 95 | `#E8DFBF` | Layered paper, cards, tape                           |
| `newsprint-dark` | 82% 0.02 95  | `#D4C9A8` | Torn edges, shadows, distressed areas                |
| `ink`            | 15% 0.01 85  | `#161513` | Primary text, photocopy black                        |
| `ink-muted`      | 42% 0.01 85  | `#6B6659` | Secondary text, halftone shadows                     |
| `orange`         | 64% 0.26 55  | `#EA580C` | Brand accent: CTAs, stamps, highlights, hazard marks |
| `orange-dark`    | 52% 0.26 55  | `#C2410C` | Hover, pressed states                                |
| `yellow`         | 88% 0.18 98  | `#FDE047` | Highlighter, warning tape, featured tags             |
| `pink`           | 72% 0.28 355 | `#F43F5E` | Stamp red, "sold out", urgent tags                   |
| `cyan`           | 65% 0.18 230 | `#2A9DCC` | Technical trust: sound graphs, bundles, EQ           |
| `green`          | 65% 0.16 145 | `#3FA66B` | In stock, low distortion, added                      |

### Color rules

- Never use pure `#000` or `#fff`. Tint every neutral toward the newsprint hue.
- Orange is the loudest voice. Yellow and pink are flyer-scream accents. Cyan is the "trust" color for data.
- Text on `newsprint` must hit 4.5:1 minimum. Display type can hit 3:1.
- Background textures must not reduce contrast. Use multiply or overlay at low opacity, and keep text on clean paper zones.

## Typography

**Display:** `Anton`, `Bebas Neue`, or a brutalist condensed grotesque. Weight 700–900, extremely tight tracking, all-caps for headlines. The headline is a poster, not a sentence.

**Body:** `Inter` or `Suisse Int'l` for readability. Keep it clean so the chaos around it doesn't break legibility.

**Accent / marker:** A handwriting or marker-style font for scribbles, annotations, and "sticker" text. Use extremely sparingly — one or two phrases per page.

**Mono / data:** `JetBrains Mono` or `Space Mono` for prices, specs, frequency labels.

### Type scale

| Token        | Size                     | Line | Weight | Use                                  |
| ------------ | ------------------------ | ---- | ------ | ------------------------------------ |
| `poster`     | clamp(4rem, 14vw, 11rem) | 0.82 | 900    | Hero headline, full-width statements |
| `display`    | clamp(2.5rem, 7vw, 5rem) | 0.88 | 900    | Section titles                       |
| `heading-lg` | 1.65rem                  | 1.1  | 800    | Subsection titles                    |
| `heading`    | 1.15rem                  | 1.2  | 700    | Card titles, product names           |
| `body-lg`    | 1.125rem                 | 1.55 | 400    | Lead paragraphs                      |
| `body`       | 1rem                     | 1.6  | 400    | Body copy                            |
| `caption`    | 0.8rem                   | 1.4  | 700    | Labels, prices, metadata             |
| `micro`      | 0.7rem                   | 1.3  | 800    | Tags, uppercase labels               |
| `marker`     | 1.25rem                  | 1.2  | 400    | Handwritten annotations              |

### Typography rules

- Headlines are uppercase, condensed, and can bleed off-screen or overlap.
- Body text stays readable: max 65ch, generous line height, no all-caps.
- Use marker text only for accents, never for primary reading.

## Texture

- **Grain / noise:** SVG fractal noise overlay across the entire page at 8–15% opacity, `mix-blend-mode: multiply`.
- **Scanlines:** Subtle horizontal lines at 4% opacity to mimic cheap scanning.
- **Halftone dots:** Circular halftone patterns on images and background panels.
- **Torn edges:** Irregular polygon clip-paths on cards, sections, and image frames.
- **Tape:** Semi-transparent off-white strips with texture, used to "hold" elements in place.
- **Staples / stitches:** Small graphic marks anchoring layers together.
- **Photocopy artifacts:** Slight misregistration, offset shadows, and duplicated edges.

## Layout

- **No centered stacks.** Everything is left-aligned, rotated, or deliberately off-center.
- **Layers:** Elements sit on top of each other with varying rotations (±1° to ±4°).
- **Full bleed:** Hero and major sections break the container.
- **Torn section dividers:** Sections separated by jagged clip-path edges, not clean lines.
- **Asymmetric grids:** Product tiles vary in size and rotation. A featured tile can span 2 columns and sit at a slight angle.
- **Generous vertical gaps:** 120px–200px between major sections so each feels like a separate flyer.

## Components

### Buttons

- **Primary:** Thick `ink` border (2–3px), `newsprint` background, `ink` text, no radius, uppercase condensed. Hover: `orange` background, `ink` text, slight rotation (±1°).
- **Sticker button:** Looks like a torn paper sticker with rough edges and hand-drawn border. Used for secondary CTAs.
- **Hazard button:** `yellow` background with black diagonal stripes, used for urgent or featured actions.

### Product tile

- Torn paper card with irregular edges.
- Product image in halftone / high-contrast B&W by default; color on hover.
- Product name in uppercase condensed type.
- Price in mono, rotated slightly or stamped.
- Tags look like marker scribbles or stamped labels.
- Hover: tile lifts and straightens; image floods with color.

### Sound-signature graph

- Hand-drawn bar or sparkline.
- Uses `orange` for the main signature, `cyan` for comparisons.
- Axis labels look like handwritten annotations.

### Tags / labels

- **Stamp tag:** Rectangular, rough edges, `orange` or `pink` fill, `ink` uppercase text.
- **Tape label:** Looks like a piece of tape stuck over the content.
- **Highlighter tag:** `yellow` background with `ink` text, like a marker stroke.

### Navigation

- Sticky top bar that looks like a torn strip of paper.
- Logo on the left, links scattered like a zine masthead.
- Cart icon as a stamped circle with a count.
- Mobile: full-screen overlay like a wall of flyers.

## Imagery

- **Product photos:** High-contrast B&W or duotone. Add heavy grain, halftone, and slight blur to mimic photocopy.
- **Lifestyle:** Flash photography, warehouse raves, skate spots, bedrooms. Candid, not produced.
- **Graphics:** Torn paper scans, tape scans, marker scribbles, photocopy texture plates.
- **Treatment:** Every image should look like it has been printed, photocopied, scanned, and posted.

## Motion

**Motion energy: high, physical, chaotic.**

- Page load: elements slam in with staggered offsets and slight rotations settling into place.
- Hover: quick jolts, rotations, and color floods. Not smooth slides.
- Scroll: parallax layers of torn paper and text.
- Easing: sharp ease-out with slight overshoot, but never bounce or elastic.
- Reduced motion: fall back to instant state changes, no rotation settling.

## Icons

- Rough, hand-drawn stroke icons or photocopied-feel icons.
- Avoid perfect geometric icons. Use irregular line weights.

## Asset treatment

- Logo stays rough. Use it large, stamped, or repeated as a pattern.
- Favicon is the black "P" mark on `newsprint`.
- OG images look like a flyer collage: torn paper, big type, orange stamp.

## Vibe checks

- If it looks like it could be a Shopify theme, it's wrong.
- If someone could say "AI made this" without doubt, it's wrong.
- If it feels slightly uncomfortable but exciting, it's right.
