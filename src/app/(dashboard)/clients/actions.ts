"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getClients() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("client_code");
  if (error) {
    console.error("clients fetch error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function saveClient(data: {
  id?: string;
  client_code: string | null;
  client_name: string;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  contact_name: string | null;
  notes: string | null;
}) {
  const supabase = await createClient();

  const record = {
    client_code: data.client_code || null,
    client_name: data.client_name,
    postal_code: data.postal_code || null,
    address: data.address || null,
    phone: data.phone || null,
    contact_name: data.contact_name || null,
    notes: data.notes || null,
  };

  if (data.id) {
    const { error } = await supabase
      .from("clients")
      .update(record)
      .eq("id", data.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("clients").insert(record);
    if (error) return { error: error.message };
  }

  revalidatePath("/clients");
  revalidatePath("/sales");
  revalidatePath("/master");
  return { error: null };
}

export async function deleteClient(id: string) {
  const supabase = await createClient();

  // Check references
  const [{ count: estCount }, { count: invCount }] = await Promise.all([
    supabase.from("estimates").select("id", { count: "exact", head: true }).eq("client_id", id),
    supabase.from("sales_invoices").select("id", { count: "exact", head: true }).eq("client_id", id),
  ]);

  const total = (estCount || 0) + (invCount || 0);
  if (total > 0) {
    return { error: `この売上先は ${total} 件の見積書・請求書で使用されています。` };
  }

  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath("/master");
  return { error: null };
}
