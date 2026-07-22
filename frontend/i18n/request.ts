import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
// Deployment default is Spanish. Users who prefer English opt in via the
// language switcher, which writes the wardrowbe_locale cookie.
export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALE_COOKIE = 'wardrowbe_locale';

function pickLocale(candidate: string | undefined | null): Locale {
  if (!candidate) return DEFAULT_LOCALE;
  const short = candidate.split(/[-_]/)[0].toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(short)
    ? (short as Locale)
    : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = pickLocale(cookieLocale);
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
