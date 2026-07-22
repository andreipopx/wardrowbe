'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X, Home, Shirt, Sparkles, Layers, LayoutGrid, History, BarChart3, Brain, Settings, Users, Bell, HeartHandshake } from 'lucide-react';
import { cn } from '@/lib/utils';

const primaryItems = [
  { key: 'dashboard', href: '/dashboard', icon: Home },
  { key: 'wardrobe', href: '/dashboard/wardrobe', icon: Shirt },
  { key: 'suggest', href: '/dashboard/suggest', icon: Sparkles },
  { key: 'outfits', href: '/dashboard/outfits', icon: LayoutGrid },
  { key: 'pairings', href: '/dashboard/pairings', icon: Layers },
  { key: 'history', href: '/dashboard/history', icon: History },
  { key: 'family', href: '/dashboard/family/feed', icon: HeartHandshake },
  { key: 'analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { key: 'learning', href: '/dashboard/learning', icon: Brain },
] as const;

const secondaryItems = [
  { key: 'family', href: '/dashboard/family', icon: Users },
  { key: 'notifications', href: '/dashboard/notifications', icon: Bell },
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
] as const;

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <div className={cn('lg:hidden', !open && 'pointer-events-none')}>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-card transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          type="button"
          className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <span className="sr-only">{tCommon('close')}</span>
          <X className="h-6 w-6" />
        </button>

        <div className="flex h-full flex-col gap-y-5 overflow-y-auto px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
              <img src="/logo.svg" alt="Wardrowbe" className="h-8 w-8" />
              <span className="text-xl font-bold">wardrowbe</span>
            </Link>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {primaryItems.map((item) => {
                    const isActive = item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                          {tNav(item.key)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
              <li>
                <div className="text-xs font-semibold leading-6 text-muted-foreground">
                  {tCommon('settings')}
                </div>
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  {secondaryItems.map((item) => {
                    const matchesPath = pathname === item.href || pathname.startsWith(item.href + '/');
                    const claimedByPrimary = primaryItems.some(
                      (primary) => pathname === primary.href || pathname.startsWith(primary.href + '/')
                    );
                    const isActive = matchesPath && !claimedByPrimary;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                          {tNav(item.key)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
