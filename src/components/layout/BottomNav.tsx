'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, Bell, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOverdueLoans, useUpcomingDueLoans } from '@/lib/hooks/useLoans';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/stats', label: 'Estadísticas', icon: BarChart3 },
  { href: '/notifications', label: 'Alertas', icon: Bell },
  { href: '/settings', label: 'Ajustes', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { loans: overdueLoans } = useOverdueLoans();
  const { loans: upcomingLoans } = useUpcomingDueLoans();

  // Contar notificaciones (vencidos + próximos a vencer)
  const notificationCount = overdueLoans.length + upcomingLoans.length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          const showBadge =
            item.href === '/notifications' && notificationCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-4 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
