'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Languages } from 'lucide-react';

const LOCALE_COOKIE = 'wardrowbe_locale';
const LOCALES = [
  { code: 'en', labelKey: 'english' as const },
  { code: 'es', labelKey: 'spanish' as const },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('common');
  const current = useLocale();
  const [isPending, startTransition] = useTransition();

  const switchTo = (code: string) => {
    if (code === current) return;
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      window.location.reload();
    });
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className || ''}`} aria-label={t('language')}>
      <Languages className="h-4 w-4 text-muted-foreground" aria-hidden />
      <div role="group" className="inline-flex rounded-md border border-input overflow-hidden">
        {LOCALES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => switchTo(l.code)}
            disabled={isPending}
            aria-pressed={current === l.code}
            className={`px-3 py-2 text-sm min-h-[44px] transition-colors ${
              current === l.code
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-accent'
            } disabled:opacity-50`}
          >
            {l.code.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
