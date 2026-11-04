import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#241912] flex flex-col">
      <AdminSidebar />
      <div className="lg:pl-64 flex-1 flex flex-col pt-14 lg:pt-0">
        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
