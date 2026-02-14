'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/layout/BottomNav';
import { OfflineBanner } from '@/components/shared/OfflineBanner';

const authRoutes = ['/login', '/register'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = authRoutes.includes(pathname);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <OfflineBanner />
      <main className="pb-20">{children}</main>
      <BottomNav />
    </>
  );
}
