"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/get-organization";
import { revalidatePath } from "next/cache";

export async function getAccounts() {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("display_order")
    .order("code");

  if (error) throw error;
  return data;
}

export async function createAccount(formData: FormData) {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const { error } = await supabase.from("accounts").insert({
    organization_id: organizationId,
    code: formData.get("code") as string,
    name: formData.get("name") as string,
    display_order: Number(formData.get("display_order")) || 0,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "この科目コードは既に登録されています" };
    }
    return { error: error.message };
  }

  revalidatePath("/master/accounts");
  return { error: null };
}

export async function updateAccount(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("accounts")
    .update({
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      display_order: Number(formData.get("display_order")) || 0,
      is_active: formData.get("is_active") === "true",
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "この科目コードは既に登録されています" };
    }
    return { error: error.message };
  }

  revalidatePath("/master/accounts");
  return { error: null };
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("invoice_lines")
    .select("id", { count: "exact", head: true })
    .eq("account_id", id);

  if (count && count > 0) {
    return { error: `この勘定科目には ${count} 件の明細が登録されています。先に明細を削除してください。` };
  }

  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/master/accounts");
  return { error: null };
}
