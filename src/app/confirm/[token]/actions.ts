"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function submitConfirmation(
  token: string,
  responses: Record<string, string>
) {
  const supabase = createAdminClient();

  // トークンで確認依頼を取得
  const { data: request, error: fetchError } = await supabase
    .from("confirmation_requests")
    .select("id, invoice_id, status")
    .eq("token", token)
    .single();

  if (fetchError || !request) {
    return { error: "確認依頼が見つかりません" };
  }

  if (request.status === "completed") {
    return { error: "この確認依頼は既に回答済みです" };
  }

  // 各明細行の site_id を更新
  for (const [lineId, siteId] of Object.entries(responses)) {
    const { error: updateError } = await supabase
      .from("invoice_lines")
      .update({ site_id: siteId })
      .eq("id", lineId)
      .eq("invoice_id", request.invoice_id);

    if (updateError) {
      return { error: `明細行の更新に失敗しました: ${updateError.message}` };
    }
  }

  // invoices の updated_by を NULL にセット（社長確認を示す）
  await supabase
    .from("invoices")
    .update({ updated_by: null })
    .eq("id", request.invoice_id);

  // 確認依頼を完了に更新
  const { error: completeError } = await supabase
    .from("confirmation_requests")
    .update({
      status: "completed",
      responses,
      completed_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  if (completeError) {
    return { error: `確認依頼の更新に失敗しました: ${completeError.message}` };
  }

  return { error: null };
}
