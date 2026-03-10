"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAccountItems() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_items")
    .select("*")
    .order("account_code");
  if (error) {
    console.error("account_items fetch error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function saveAccountItem(input: {
  id?: string;
  account_code: string | null;
  account_name: string;
  account_type: string;
}) {
  const supabase = await createClient();
  const record = {
    account_code: input.account_code || null,
    account_name: input.account_name,
    account_type: input.account_type,
  };

  if (input.id) {
    const { error } = await supabase
      .from("account_items")
      .update(record)
      .eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("account_items").insert(record);
    if (error) return { error: error.message };
  }

  revalidatePath("/master");
  return { error: null };
}

export async function deleteAccountItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("account_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/master");
  return { error: null };
}
