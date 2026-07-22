'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Shirt, Sparkles, LayoutGrid, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { key: 'dashboard', href: '/dashboard', icon: Home },
  { key: 'wardrobe', href: '/dashboard/wardrobe', icon: Shirt },
  { key: 'suggest', href: '/dashboard/suggest', icon: Sparkles },
  { key: 'outfits', href: '/dashboard/outfits', icon: LayoutGrid },
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-solid/40 bg-background/95 backdrop-blur-sm lg:hidden">
      <div className="flex h-16 items-center justify-around">
        {items.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1.5 px-3 py-2 min-h-[44px] transition-colors duration-200 ease-editorial',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" strokeWidth={1.5} />
              <span className={cn('text-[10px] uppercase tracking-widest', isActive && 'font-medium')}>
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
