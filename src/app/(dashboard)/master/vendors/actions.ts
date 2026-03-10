"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/get-organization";
import { revalidatePath } from "next/cache";

export async function getVendors() {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("organization_id", organizationId)
    .order("code");

  if (error) throw error;
  return data;
}

export async function createVendor(formData: FormData) {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const { error } = await supabase.from("vendors").insert({
    organization_id: organizationId,
    code: formData.get("code") as string,
    name: formData.get("name") as string,
    furigana: (formData.get("furigana") as string) || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "この取引先コードは既に登録されています" };
    }
    return { error: error.message };
  }

  revalidatePath("/master/vendors");
  revalidatePath("/master");
  return { error: null };
}

export async function updateVendor(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("vendors")
    .update({
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      furigana: (formData.get("furigana") as string) || null,
      is_active: formData.get("is_active") === "true",
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "この取引先コードは既に登録されています" };
    }
    return { error: error.message };
  }

  revalidatePath("/master/vendors");
  revalidatePath("/master");
  return { error: null };
}

export async function deleteVendor(id: string) {
  const supabase = await createClient();

  // 関連する請求書があるか確認
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", id);

  if (count && count > 0) {
    return { error: `この取引先には ${count} 件の請求書が登録されています。先に請求書を削除してください。` };
  }

  const { error } = await supabase
    .from("vendors")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/master/vendors");
  revalidatePath("/master");
  return { error: null };
}
