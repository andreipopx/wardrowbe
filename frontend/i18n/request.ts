import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'wardrowbe_locale';

function pickLocale(candidate: string | undefined | null): Locale {
  if (!candidate) return DEFAULT_LOCALE;
  const short = candidate.split(/[-_]/)[0].toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(short)
    ? (short as Locale)
    : DEFAULT_LOCALE;
}

export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(',')) {
    const tag = part.split(';')[0].trim();
    const locale = pickLocale(tag);
    if (locale !== DEFAULT_LOCALE || tag.toLowerCase().startsWith('en')) return locale;
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const hdrs = headers();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = cookieLocale
    ? pickLocale(cookieLocale)
    : localeFromAcceptLanguage(hdrs.get('accept-language'));
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
