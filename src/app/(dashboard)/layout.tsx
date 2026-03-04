import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const navItems = [
    { href: "/invoices/new", label: "請求書入力" },
    { href: "/data", label: "データ一覧" },
    { href: "/master/vendors", label: "取引先" },
    { href: "/master/sites", label: "現場" },
    { href: "/master/accounts", label: "勘定科目" },
  ];

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-primary text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/invoices/new" className="text-lg font-bold">
            支払請求書登録
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-80">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm rounded-t-md hover:bg-primary-dark transition-colors text-white/80 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
