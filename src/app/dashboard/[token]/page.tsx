import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardContent } from "./dashboard-content";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { token } = await params;
  const supabase = createAdminClient();

  // token で confirmation_request を取得
  const { data: request } = await supabase
    .from("confirmation_requests")
    .select("id, invoice_id, token, status, responses")
    .eq("token", token)
    .single();

  if (!request) {
    notFound();
  }

  // responses から実際の site_id を抽出（__common__, __not_cost__ は除外）
  const responses: Record<string, string> = request.responses || {};
  const siteIds = [
    ...new Set(
      Object.values(responses).filter((id) => !id.startsWith("__"))
    ),
  ];

  if (siteIds.length === 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F7FBF9",
          padding: "24px 16px",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#1F2D29",
            marginBottom: 16,
          }}
        >
          現場別費用
        </h1>
        <p style={{ color: "#7B8A86", fontSize: 15 }}>
          対象の現場がありません
        </p>
      </div>
    );
  }

  // invoice から organization_id を取得
  const { data: invoice } = await supabase
    .from("invoices")
    .select("organization_id")
    .eq("id", request.invoice_id)
    .single();

  if (!invoice) {
    notFound();
  }

  // 同じ組織の全 invoices から invoice_lines を取得し、対象 site_id のみ集計
  const { data: orgInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_lines(site_id, amount_excl_tax)")
    .eq("organization_id", invoice.organization_id);

  const siteAmountMap = new Map<string, number>();
  for (const inv of orgInvoices || []) {
    for (const line of inv.invoice_lines) {
      if (line.site_id && siteIds.includes(line.site_id)) {
        siteAmountMap.set(
          line.site_id,
          (siteAmountMap.get(line.site_id) || 0) + line.amount_excl_tax
        );
      }
    }
  }

  // sites テーブルから現場情報を取得
  const { data: sites } = await supabase
    .from("sites")
    .select("id, code, name")
    .in("id", siteIds);

  const siteCosts = siteIds
    .map((id) => {
      const site = (sites || []).find((s) => s.id === id);
      return {
        id,
        code: site?.code || "",
        name: site?.name || id,
        total: siteAmountMap.get(id) || 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return <DashboardContent siteCosts={siteCosts} />;
}
