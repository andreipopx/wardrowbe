# Fork changes vs. upstream

This fork tracks [Anyesh/wardrowbe](https://github.com/Anyesh/wardrowbe) and adds a few LAN-deployment niceties on top.

## Changes

### PWA
- `frontend/public/manifest.webmanifest` — installable web-app manifest (standalone, portrait, editorial cream `#F5EFE6` + burgundy `#7B1E1E`)
- `frontend/public/sw.js` — minimal service worker: cache-first for static assets, network-first for HTML, never caches `/api/*` or `/_next/data/*`
- `frontend/components/sw-register.tsx` — registers `sw.js` in production only, on `window.load`
- `frontend/public/favicon.svg` — burgundy Playfair-italic W on cream
- `frontend/public/logo-wordmark.svg` — scalable wordmark for headers/footers

### i18n (next-intl v3, no URL routing)
- `frontend/messages/{en,es}.json` — full catalog (~977 lines each) covering onboarding, dashboard, wardrobe, suggest, outfits, pairings, history, family, notifications, analytics, learning, settings, invite, and the global error surfaces.
- `frontend/i18n/request.ts` — server-side locale resolution: cookie `wardrowbe_locale` → default `es` (Spanish). No browser `Accept-Language` detection — deployment default is deliberately Spanish.
- `frontend/next.config.js` — wraps with `next-intl/plugin`.
- `frontend/app/layout.tsx` — sets `<html lang>` from the resolved locale, provides `NextIntlClientProvider`.
- `frontend/components/language-switcher.tsx` — EN/ES toggle. Mounted in the global header (`components/header.tsx`), on `/login`, and floating top-right on `/onboarding` (where the header isn't rendered).

See [`frontend/I18N-TODO.md`](frontend/I18N-TODO.md) for the handful of surfaces still in English.

### Editorial rebrand
Fashion-editorial aesthetic (Vogue / AnOther), warm cream + burgundy + old-gold palette, Playfair display + Cormorant italic + Inter, borderless radius, hairline dividers, animated underline links.

- `frontend/app/globals.css` + `frontend/tailwind.config.js` — new palette, fonts, `label-editorial` / `divider-gold` / `link-editorial` / `card-editorial` / `img-zoom` utilities. Sonner toasts restyled globally.
- `frontend/components/ui/{button,input,card,alert,dialog,badge}.tsx` — editorial variants.
- `frontend/components/{header,sidebar,mobile-sidebar,mobile-nav}.tsx` — new nav treatment (hairline indicator that grows into a burgundy stroke on hover/active, Playfair italic wordmark).
- `frontend/app/{login,onboarding,dashboard/page,dashboard/wardrobe,dashboard/suggest,dashboard/settings}` — editorial headers and layouts.

Design reference: [`frontend/DESIGN-SYSTEM.md`](frontend/DESIGN-SYSTEM.md) — palette, fonts, utilities, component variants, adoption recipe.
Follow-up work: [`frontend/REBRAND-TODO.md`](frontend/REBRAND-TODO.md).

### Outfit builder — free-form editorial canvas
The Studio (`/dashboard/outfits/new`) got a drag-and-drop canvas: 3:4 editorial page, `@dnd-kit` sensors (iPhone long-press so scroll still works over the canvas), tap-to-select toolbar (bring to front / send to back / remove). Layout persists per item (`OutfitItem.pos_x/pos_y/scale/rotation/z_index`, nullable — legacy outfits fall back to the classic grid on the detail page). Contract, migration, DnD-library trade-offs, and audit history: see [`docs/outfit-builder.md`](docs/outfit-builder.md).

### El Estilista (backend prompt)
- `backend/app/prompts/recommendation.txt` — rewritten as a Spanish fashion editor / personal stylist voice. References Iris van Herpen and Vivienne Westwood in the system prompt so the model matches the app's cultural register. Two-sentence editorial highlights, evocative Spanish headlines, tú (not usted). See notes in [`REBRAND-TODO.md`](frontend/REBRAND-TODO.md) about end-to-end validation.

## Deployment

The infra side (docker-compose, Caddy, `.env`) lives in a separate repo: [`andreipopx/pop-servicios`](https://github.com/andreipopx/pop-servicios). It is configured to consume `wardrowbe-frontend:local` (built from this fork) rather than `ghcr.io/anyesh/wardrowbe:frontend-latest`.

Rebuild + redeploy loop:

```bash
# Frontend (any change under frontend/)
docker build -t wardrowbe-frontend:local /home/andrei/wardrowbe-repo/frontend \
  && cd /home/andrei/servicios/wardrowbe \
  && docker compose up -d --force-recreate wardrobe_frontend

# Backend (prompts, hooks, models)
cd /home/andrei/servicios/wardrowbe \
  && docker compose up -d --force-recreate wardrobe_backend wardrobe_worker
```

The backend image is still `ghcr.io/anyesh/wardrowbe:backend-latest`; local prompt overrides ride on top via the mounted config, so backend changes here need syncing upstream if we ever pull a new tag.
