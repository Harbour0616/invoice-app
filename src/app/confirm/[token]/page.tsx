import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConfirmForm } from "./confirm-form";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function ConfirmPage({ params }: Props) {
  const { token } = await params;
  const supabase = createAdminClient();

  // トークンで確認依頼を取得
  const { data: request } = await supabase
    .from("confirmation_requests")
    .select("id, invoice_id, token, status, responses, completed_at, marker_file_path")
    .eq("token", token)
    .single();

  if (!request) {
    notFound();
  }

  // 請求書と明細行を取得
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      `
      id, invoice_date, invoice_number, note, pdf_file_path,
      total_excl_tax, total_tax, total_incl_tax, organization_id,
      vendor:vendors(id, code, name),
      invoice_lines(
        id, site_id, description, amount_excl_tax, tax_rate, tax_amount, amount_incl_tax, line_order,
        site:sites(id, code, name),
        account:accounts(id, code, name)
      )
    `
    )
    .eq("id", request.invoice_id)
    .single();

  if (!invoice) {
    notFound();
  }

  // 同じ組織の現場一覧を取得
  const { data: sites } = await supabase
    .from("sites")
    .select("id, code, name")
    .eq("organization_id", invoice.organization_id)
    .eq("status", "active")
    .order("code");

  // PDFの署名付きURL生成
  let signedFileUrl: string | null = null;
  if (invoice.pdf_file_path) {
    const { data: signedData } = await supabase.storage
      .from("invoices")
      .createSignedUrl(invoice.pdf_file_path, 3600);
    signedFileUrl = signedData?.signedUrl || null;
  }

  // マーカー画像の署名付きURL生成
  let signedMarkerUrl: string | null = null;
  if (request.marker_file_path) {
    const { data: markerData } = await supabase.storage
      .from("invoices")
      .createSignedUrl(request.marker_file_path, 3600);
    signedMarkerUrl = markerData?.signedUrl || null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto py-4 px-3 sm:py-8 sm:px-4">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">
          請求書 現場確認
        </h1>
        <ConfirmForm
          request={request}
          invoice={invoice as any}
          sites={sites || []}
          signedFileUrl={signedFileUrl}
          signedMarkerUrl={signedMarkerUrl}
        />
      </div>
    </div>
  );
}
