import AuthGuard from '@/components/AuthGuard';
import DashboardHeader from '@/components/DashboardHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-dark-700">
        <DashboardHeader />
        <main>{children}</main>
      </div>
    </AuthGuard>
  );
} 