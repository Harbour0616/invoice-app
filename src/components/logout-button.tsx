"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-sub-text hover:text-foreground hover:bg-muted px-3 py-1 rounded-lg transition-colors cursor-pointer"
    >
      ログアウト
    </button>
  );
}
