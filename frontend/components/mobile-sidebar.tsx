'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const primaryItems = [
  { key: 'dashboard', href: '/dashboard' },
  { key: 'wardrobe', href: '/dashboard/wardrobe' },
  { key: 'suggest', href: '/dashboard/suggest' },
  { key: 'outfits', href: '/dashboard/outfits' },
  { key: 'pairings', href: '/dashboard/pairings' },
  { key: 'history', href: '/dashboard/history' },
  { key: 'family', href: '/dashboard/family/feed' },
  { key: 'analytics', href: '/dashboard/analytics' },
  { key: 'learning', href: '/dashboard/learning' },
] as const;

const secondaryItems = [
  { key: 'family', href: '/dashboard/family' },
  { key: 'notifications', href: '/dashboard/notifications' },
  { key: 'settings', href: '/dashboard/settings' },
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

  const renderLink = (href: string, active: boolean, label: string) => (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        'group flex items-baseline gap-3 py-2 transition-colors duration-200 ease-editorial',
        active ? 'text-primary' : 'text-foreground hover:text-primary'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-px transition-all duration-200 ease-editorial',
          active ? 'w-8 bg-primary' : 'w-4 bg-border-solid/60 group-hover:w-8 group-hover:bg-primary'
        )}
      />
      <span className={cn('text-sm', active && 'font-medium')}>{label}</span>
    </Link>
  );

  return (
    <div className={cn('lg:hidden', !open && 'pointer-events-none')}>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-[#0A0A0A]/70 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-card border-r border-border-solid/40 transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          type="button"
          className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-primary transition-colors"
          onClick={onClose}
        >
          <span className="sr-only">{tCommon('close')}</span>
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>

        <div className="flex h-full flex-col gap-y-8 overflow-y-auto px-8 pb-8">
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/dashboard" onClick={onClose} className="font-display italic font-black text-2xl text-foreground">
              wardrowbe
            </Link>
          </div>

          <div className="divider-gold" />

          <nav className="flex flex-1 flex-col gap-y-10">
            <ul className="space-y-1">
              {primaryItems.map((item) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                return <li key={item.href}>{renderLink(item.href, isActive, tNav(item.key))}</li>;
              })}
            </ul>
            <div>
              <p className="label-editorial mb-3">{tCommon('settings')}</p>
              <ul className="space-y-1">
                {secondaryItems.map((item) => {
                  const matchesPath = pathname === item.href || pathname.startsWith(item.href + '/');
                  const claimedByPrimary = primaryItems.some(
                    (primary) => pathname === primary.href || pathname.startsWith(primary.href + '/')
                  );
                  const isActive = matchesPath && !claimedByPrimary;
                  return <li key={item.href}>{renderLink(item.href, isActive, tNav(item.key))}</li>;
                })}
              </ul>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
