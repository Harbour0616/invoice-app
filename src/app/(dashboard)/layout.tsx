import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { NavLinks } from "@/components/nav-links";

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

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 bg-card border-b border-border">
        <div className="max-w-[1600px] mx-auto px-10 h-full flex items-center justify-between">
          <div className="shrink-0">
            <Link href="/invoices/new" className="text-base font-bold text-primary tracking-wide">
              支払請求書登録
            </Link>
          </div>
          <nav className="flex">
            <NavLinks />
          </nav>
          <div className="shrink-0 flex items-center gap-4">
            <span className="text-sm text-sub-text">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="py-8">{children}</main>
    </div>
  );
}
