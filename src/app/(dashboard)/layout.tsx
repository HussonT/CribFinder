import { Nav } from "@/components/nav";
import { ToastProvider } from "@/components/ui/toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Nav />
        <main className="flex-1 ml-64 p-6">{children}</main>
      </div>
    </ToastProvider>
  );
}
