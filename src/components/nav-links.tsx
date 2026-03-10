"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/invoices/new", label: "請求書（支払）" },
  { href: "/data", label: "データ一覧" },
  { href: "/sales", label: "請求書（売上）" },
  { href: "/sites/costs", label: "現場別費用" },
  { href: "/labor", label: "労務管理" },
  { href: "/master", label: "マスタ管理" },
  { href: "/master/accounts", label: "勘定科目" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
        const isActive = item.href === "/master"
          ? pathname === "/master"
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 h-16 inline-flex items-center text-sm border-b-2 ${
              isActive
                ? "text-foreground border-primary font-semibold"
                : "text-sub-text border-transparent hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
