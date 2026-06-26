# Handoff: Generate Plugged Audio HTML Mock Homepages

## Context

We are building **Plugged Audio**, an underground streetwear-style IEM (in-ear monitor) store for young people (16–29) who are into music, gaming, and culture. The store is a curated IEM reseller, not a generic electronics marketplace. The design should feel like a **photocopied zine / warehouse rave flyer wall / torn-off gig posters**. Raw, grungy, edgy, and unmistakably human.

The current logo is a rough, grainy black "P" shaped like an IEM + cable, with one burnt-orange accent ring, on an off-white/cream paper background.

## What hasn't worked so far

Previous mocks were too:

- Clean / polished / template-like
- Lacking real grunge texture
- Lacking the underground rave / zine poster energy
- Too "designed" and not enough "collaged"

The user wants something **off-the-wall unique** — one of the cherishable bright spots on the web.

## Brand fundamentals (from PRODUCT.md)

- **Name:** Plugged Audio
- **Tagline ideas:** "Audio doesn't have to suck" / "You don't have to use shitty earphones" / "You deserve better"
- **Personality:** raw, honest, plugged-in
- **Tone:** educational but unpretentious
- **Audience:** 16–29, music enthusiasts, gamers, "performative males," "cool offline people," hyper-online
- **Anti-references:** headphones.com, hangout.audio, linsoul, aliexpress, Amazon, generic ecommerce templates

## Design direction (to be pushed further)

The final design system should feel like **torn-off posters on a concrete wall at a warehouse rave**. Think:

- Layers of torn paper
- Misaligned text and rotated elements
- Photocopied halftone images
- Spray paint / stencil effects
- Safety/hazard tape
- Black-and-white photocopy aesthetic with 1–3 violent accent colors
- Handwritten marker scribbles
- Tape, staples, glue marks
- Overlapping flyers
- Crumpled paper textures
- Duotone images
- "Missing person" / "gig flyer" / "rave flyer from 1994" energy
- Asymmetric, chaotic but intentional
- Slightly uncomfortable but exciting

It is still a store, so prices, CTAs, and product names must remain readable.

## Color exploration

The brand colors are NOT locked. Explore freely. Some starting directions:

1. **Zine / Rave Flyer Wall** (current main direction): warm newsprint paper, rough black ink, burnt orange + cyan + hazard yellow
2. **Acid Rave / Y2K**: black base, neon green, hot pink, cyan, chrome silver
3. **Punk / DIY Zine**: newsprint + red + black + yellow
4. **Minimal Street-Lux**: cream + one burnt accent, huge whitespace
5. **Skate / Graffiti**: concrete grey + safety orange + teal + bright yellow
6. **Industrial Brutalist**: steel blue-grey + hazard yellow/black stripes + monospace specs

Feel free to invent new palettes. The user wants to see distinct options.

## Typography

- Display: condensed grotesque / poster font (Anton, Bebas Neue, or similar)
- Body: clean sans for readability (Inter, etc.)
- Accent: one handwritten/marker font for scribbles and annotations (Permanent Marker or similar)
- Mono: for prices and specs (JetBrains Mono)

## Required sections per mock

## Product content (use realistic placeholder data)

- Tanchjim Zero — €19 — Warm, Vocal-forward
- Truthear Hexa — €79 — Detailed, Balanced
- Moondrop Aria — €89 — Bass-forward, Best seller
- DAC bundle — IEM + DAC — €129

Use Unsplash URLs or placeholder color blocks for images. Product images should be treated as photocopied/B&W/duotone by default; color on hover.

## Output format

Generate each variation as a **single self-contained HTML file** in `public/` named:

```
public/mock-home-v{N}-{short-direction-name}.html
```

Example:

- `public/mock-home-v6-duotone-rave.html`
- `public/mock-home-v7-newsprint-collage.html`

Each file must:

- Be fully self-contained (inline CSS, no build step)
- Use placeholder images from Unsplash or CSS shapes
- Be openable directly in a browser
- Include the logo at `logo.png` in the nav

## Quality bar

- Must NOT look like a Shopify theme
- Must NOT look like generic AI slop (no glassmorphism, no gradient text, no side-stripe card borders, no identical card grids)
- Must not look like and have ai generated template
- Must feel intentionally raw, collaged, and human
- Must still be usable as a store (readable prices, clear CTAs, working links)

## Deliverables

Generate **5 new distinct variations** that push the zine/rave-flyer direction even further than the existing files. Each should be a genuinely different color + layout + texture direction.

Existing files for reference (do not overwrite):

- `public/mock-home.html` — main zine/rave direction
- `public/mock-home-v1-acid-rave.html`
- `public/mock-home-v2-punk-zine.html`
- `public/mock-home-v3-street-lux.html`
- `public/mock-home-v4-skate-graffiti.html`
- `public/mock-home-v5-industrial-brutalist.html`

## Success criteria

After generating, the user should be able to open each HTML file and immediately feel a strong, distinct underground streetwear / zine / rave poster vibe. They should want to screenshot it, not fix it.
