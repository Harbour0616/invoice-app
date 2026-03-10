import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const getOrganization = cache(async function getOrganization() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!member) {
    throw new Error("組織が見つかりません");
  }

  return {
    userId: user.id,
    organizationId: member.organization_id as string,
    role: member.role as "owner" | "member",
  };
});
