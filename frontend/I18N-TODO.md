# i18n status

next-intl v3 is wired up (no URL routing — locale via `wardrowbe_locale` cookie, `Accept-Language` fallback, `en` default).

## Done
- `messages/en.json`, `messages/es.json`
- `i18n/request.ts` (server-side locale resolution)
- `next.config.js` (next-intl plugin)
- `app/layout.tsx` (`<html lang>` + `NextIntlClientProvider`)
- `components/language-switcher.tsx` (cookie-based, shown on `/login`)
- `/login` page — fully translated
- `/onboarding` — Welcome step translated (rest of the wizard is TODO)

## TODO
Refactor these to `useTranslations()`, extract strings into `messages/*.json`:

1. `app/onboarding/page.tsx` — FamilyStep, LocationStep, PreferencesStep, UploadStep, CompleteStep
2. `app/dashboard/wardrobe/` — grid, item detail, add/edit forms
3. `app/dashboard/suggest/` — outfit suggestion flow
4. `app/dashboard/settings/` — profile, preferences, family, notifications tabs
5. `app/dashboard/outfits/`, `.../pairings/`, `.../history/`, `.../analytics/`, `.../learning/`, `.../family/`, `.../notifications/`
6. `app/error.tsx`, `app/not-found.tsx`, `app/invite/`
7. Shared `components/*.tsx` — nav, header, toasts, forms

## How to add translations
1. Add the string to both `messages/en.json` and `messages/es.json` under a sensible namespace.
2. In the component: `const t = useTranslations('namespace')` then `{t('keyName')}`.
3. Rich text: `t.rich('key', { tag: (chunks) => <b>{chunks}</b> })`.
4. Interpolation: `t('key', { name: 'Ana' })` with `"key": "Hello {name}"`.

## Switching language in the UI
The `<LanguageSwitcher />` component (`components/language-switcher.tsx`) is currently only on `/login`.
To add it elsewhere (e.g. settings), import and drop it in:

```tsx
import { LanguageSwitcher } from '@/components/language-switcher';
// …
<LanguageSwitcher />
```

Selection writes a `wardrowbe_locale` cookie (1 year) and reloads. Server-rendered pages pick it up on next request.
