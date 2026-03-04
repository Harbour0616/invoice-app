"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/get-organization";
import { revalidatePath } from "next/cache";

export async function getSites() {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("organization_id", organizationId)
    .order("code");

  if (error) throw error;
  return data;
}

export async function createSite(formData: FormData) {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const { error } = await supabase.from("sites").insert({
    organization_id: organizationId,
    code: formData.get("code") as string,
    name: formData.get("name") as string,
    status: (formData.get("status") as string) || "active",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "この現場コードは既に登録されています" };
    }
    return { error: error.message };
  }

  revalidatePath("/master/sites");
  return { error: null };
}

export async function updateSite(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sites")
    .update({
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      status: formData.get("status") as string,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "この現場コードは既に登録されています" };
    }
    return { error: error.message };
  }

  revalidatePath("/master/sites");
  return { error: null };
}

export async function deleteSite(id: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("invoice_lines")
    .select("id", { count: "exact", head: true })
    .eq("site_id", id);

  if (count && count > 0) {
    return { error: `この現場には ${count} 件の明細が登録されています。先に明細を削除してください。` };
  }

  const { error } = await supabase.from("sites").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/master/sites");
  return { error: null };
}
