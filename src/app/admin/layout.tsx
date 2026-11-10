'use client';

import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { RBACProvider } from '@/components/auth/Can';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Standalone auth and public kiosk display pages:
  // Bypass heavy AdminSidebar, AdminHeader, and realtime SSE connection loops
  if (
    pathname === '/admin/login' ||
    pathname === '/admin/403' ||
    pathname === '/admin/rfid/standee'
  ) {
    return <>{children}</>;
  }

  return (
    <RBACProvider>
      <div className="min-h-screen bg-[#FAF6EE] text-[#33271D] font-sans flex flex-col md:flex-row antialiased w-full overflow-x-hidden">
        <AdminSidebar />
        <div className="md:pl-72 flex-1 flex flex-col min-w-0 w-full pt-14 md:pt-0">
          <AdminHeader />
          <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden p-3.5 sm:p-6 lg:p-8 pb-28 sm:pb-32 md:pb-8">
            {children}
          </main>
        </div>
      </div>
    </RBACProvider>
  );
}
