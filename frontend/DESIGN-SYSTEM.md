# Wardrowbe — editorial design system

Fashion-editorial aesthetic (Vogue / AnOther / Business of Fashion). Warm cream base, burgundy CTAs, old-gold accents, Playfair display, Cormorant italic for accents, Inter for body.

Everything is driven by CSS variables in `app/globals.css` + Tailwind tokens in `tailwind.config.js`. Change one file, the whole app follows.

## Palette

Tokens live as raw hex under `:root` (light) and `.dark`. Tailwind reads them via `var(--…)`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#F5EFE6` cream | `#0A0A0A` ink | Page background |
| `--card` | `#FAF6EF` | `#141210` | Cards, modals, elevated surfaces |
| `--foreground` | `#0A0A0A` | `#F5EFE6` | Main text |
| `--muted-foreground` | `#6B5D4F` warm grey | `#A89988` | Secondary text |
| `--primary` | `#7B1E1E` burgundy | `#A02828` | CTAs, active links, hover accents |
| `--editorial-gold` | `#B8860B` old gold | `#D4A548` | Section dividers, editorial labels |
| `--border` | `#D4C9B855` hairline | `#3A3530` | Everything border-y |
| `--radius` | `0` | `0` | Sharp rectangles (raise to 2-4px only if a component truly needs softening) |

## Fonts

Wired via `next/font/google` in `app/layout.tsx` and exposed as CSS variables:

| Family | Variable | Tailwind class | When |
|---|---|---|---|
| Playfair Display (400/700/900, italic) | `--font-display` | `font-display` | H1, H2, display sizes, editorial titles |
| Cormorant Garamond (400/500, italic only) | `--font-editorial` | `font-editorial` | Taglines, poetic captions, quotes, "Modo desarrollo" labels |
| Inter (400/500/600) | `--font-sans` | `font-body` (default on `<body>`) | UI, forms, body text |

`h1/h2/h3` automatically get `font-display` via `globals.css`. `h4/h5/h6` keep sans.

## Sizes

Extended in `tailwind.config.js`:

- `text-display-2xl` — clamp(3rem, 8vw, 6rem), tight leading & letter-spacing — hero headings
- `text-display-xl` — clamp(2.5rem, 6vw, 4.5rem) — page titles
- `text-display-lg` — clamp(2rem, 4.5vw, 3.5rem) — section titles

Everything else uses the default Tailwind scale.

## Utilities (added in globals.css)

```html
<span class="label-editorial">SECTION</span>
```
Uppercase, 0.16em tracking, muted foreground, 11px, weight 500. Use for eyebrows, metadata rows, section headers, form labels, small captions.

```html
<div class="divider-gold" />        <!-- 1px, --editorial-gold, 60% opacity -->
<div class="divider-hairline" />    <!-- 1px, --border-solid, 45% opacity -->
```
Editorial section breaks. In dashboard page, gold rules separate the three sections; hairline is for softer subdivisions.

```html
<a class="link-editorial">Explore</a>
```
Underline is drawn left-to-right on hover (transform: scaleX). Pairs with `label-editorial` on nav CTAs.

```html
<article class="card-editorial">...</article>
```
Rises 4px on hover with a 260ms editorial ease.

```html
<div class="img-zoom">
  <Image ... />   {/* direct child */}
</div>
```
Direct child zooms to 105% over 400ms on hover. Container needs `overflow-hidden` (already applied by the class).

```html
<div className="ease-editorial">...</div>
```
Custom Tailwind timing function `cubic-bezier(0.4, 0, 0.2, 1)` — apply to every transition to keep motion consistent.

## Component variants

### Button (`components/ui/button.tsx`)

- `variant="default"` — burgundy fill, hover inverts to burgundy-on-cream border.
- `variant="outline"` — burgundy border only, hover fills.
- `variant="secondary"` — text-only with the animated underline (like `link-editorial` but as a button).
- `variant="ghost"` — text-only, no underline. Hover turns burgundy.
- `variant="link"` — inline text link with a soft burgundy underline.
- `variant="destructive"` — same as default but semantically flagged.

All sizes apply `uppercase tracking-widest text-xs` (or `text-[11px]` for `sm`). Icon buttons stay plain.

### Input (`components/ui/input.tsx`)
Editorial single-line: no side/top border, hairline bottom border, focus turns it burgundy. Placeholder is Cormorant italic. Height 44px.

### Card (`components/ui/card.tsx`)
Cream background, hairline border at 60% opacity, no shadow. `CardTitle` renders in Playfair 400.

### Alert (`components/ui/alert.tsx`)
Left-only border (burgundy for `default`/`destructive`, gold for `gold`). Playfair `AlertTitle`. Cream fill.

### Dialog (`components/ui/dialog.tsx`)
Dark 85% overlay, cream card, hairline border, no radius. Title is Playfair. Close icon is stroke-1.5 lucide.

### Badge (`components/ui/badge.tsx`)
Uppercase small caps, tracking-[0.14em], 10px. `variant="outline"` behaves as a hairline pill that fills on hover — use for tag chips.

## Adopting the style in a new page

1. Wrap the page in `mx-auto max-w-{size} px-4 sm:px-6 lg:px-10 py-10 sm:py-14 space-y-10`.
2. Header:
   ```jsx
   <header className="space-y-3">
     <p className="label-editorial text-gold">SECTION LABEL</p>
     <h1 className="font-display italic font-black text-display-lg leading-none">Page title</h1>
     <p className="font-editorial italic text-lg text-muted-foreground">Cormorant tagline</p>
   </header>
   ```
3. `<div className="divider-gold" />` between sections.
4. Use `<Button>` + `<Card>` + `<Input>` from `components/ui/`, they inherit the tokens.
5. For any raw text, prefer:
   - `font-display` on display-scale headings
   - `font-editorial italic` on poetic/tagline text
   - Default (`font-body`) on everything else

## Iconography
Lucide, stroke-width `1.5`. Never coloured; always inherits `currentColor`. Prefer omitting icons in favour of text — editorial reads more label than glyph.

## Motion
Everything uses `duration-200 ease-editorial` (or `duration-260` for card lifts). Never spring or elastic. Keep it hushed.

## Sonner toasts
Restyled globally in `globals.css`. Titles render Playfair, borders are burgundy for errors, gold for success. No further per-toast styling required.

## Assets
- `public/favicon.svg` — burgundy Playfair-italic W on cream.
- `public/logo-wordmark.svg` — scalable "wardrowbe" wordmark that inherits `currentColor`. Drop into headers/footers when the text alone isn't rich enough.
- `public/manifest.webmanifest` — `theme_color #7B1E1E`, `background_color #F5EFE6`.
