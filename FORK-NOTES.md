# Fork changes vs. upstream

This fork tracks [Anyesh/wardrowbe](https://github.com/Anyesh/wardrowbe) and adds a few LAN-deployment niceties on top.

## Changes

### PWA
- `frontend/public/manifest.webmanifest` — installable web-app manifest (standalone, portrait, theme `#0f172a`)
- `frontend/public/sw.js` — minimal service worker: cache-first for static assets, network-first for HTML, never caches `/api/*` or `/_next/data/*`
- `frontend/components/sw-register.tsx` — registers `sw.js` in production only, on `window.load`
- `frontend/app/layout.tsx` — links the manifest, exposes `themeColor` viewport, marks the app as `apple-mobile-web-app-capable`

### i18n (next-intl v3, no URL routing)
- `frontend/messages/{en,es}.json` — string catalog
- `frontend/i18n/request.ts` — server-side locale resolution (cookie `wardrowbe_locale`, then `Accept-Language`, default `en`)
- `frontend/next.config.js` — wraps with `next-intl/plugin`
- `frontend/app/layout.tsx` — sets `<html lang>` from the resolved locale, provides `NextIntlClientProvider`
- `frontend/components/language-switcher.tsx` — EN/ES toggle (writes cookie, reloads); currently mounted on `/login`
- `frontend/app/login/page.tsx` — fully translated
- `frontend/app/onboarding/page.tsx` — WelcomeStep translated

See [`frontend/I18N-TODO.md`](frontend/I18N-TODO.md) for what is still English.

## Deployment
The infra side (docker-compose, Caddy, `.env`) lives in a separate repo: [`andreipopx/pop-servicios`](https://github.com/andreipopx/pop-servicios).
It is configured to consume `wardrowbe-frontend:local` (built from this fork) rather than `ghcr.io/anyesh/wardrowbe:frontend-latest`.
