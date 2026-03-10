"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/get-organization";

export type AlertStatus = "正常" | "要注意" | "危険" | "赤字" | "完工間近";

export type SiteProfit = {
  id: string;
  code: string;
  name: string;
  status: string;
  contract_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  sales: number;
  invoice_cost: number;
  labor_cost: number;
  total_cost: number;
  gross_profit: number;
  gross_margin: number | null;
  alert_status: AlertStatus;
  alert_reasons: string[];
};

export type ProfitSummary = {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  profitRate: number | null;
  sites: SiteProfit[];
  alertCounts: {
    caution: number;
    danger: number;
    deficit: number;
    deadline: number;
  };
};

function getAlertStatus(
  sales: number,
  cost: number,
  endDate: string | null
): { status: AlertStatus; reasons: string[] } {
  const rate = sales === 0 ? 0 : ((sales - cost) / sales) * 100;
  const reasons: string[] = [];
  let status: AlertStatus = "正常";

  if (rate < 0) {
    status = "赤字";
    reasons.push("赤字見込み");
  } else if (rate < 10) {
    status = "危険";
    reasons.push("危険水準");
  } else if (rate < 20) {
    status = "要注意";
    reasons.push("粗利率低下");
  }

  if (endDate) {
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (diff >= 0 && diff <= 30 && rate < 20) {
      if (status === "正常") status = "完工間近";
      reasons.push("完工間近");
    }
  }

  return { status, reasons };
}

export async function getProfitData(
  yearMonth?: string,
  status?: string,
  alertFilter?: string
): Promise<ProfitSummary> {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  // Date range from yearMonth
  let fromDate: string | null = null;
  let toDate: string | null = null;
  if (yearMonth) {
    fromDate = `${yearMonth}-01`;
    const [y, m] = yearMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    toDate = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  }

  // Get all sites for the organization
  let sitesQuery = supabase
    .from("sites")
    .select("id, code, name, status, contract_amount, start_date, end_date")
    .eq("organization_id", organizationId)
    .order("code");

  if (status && status !== "all") {
    sitesQuery = sitesQuery.eq("status", status);
  }

  const { data: sites, error: sitesError } = await sitesQuery;
  if (sitesError) {
    console.error("sites fetch error:", sitesError.message);
    return {
      totalSales: 0,
      totalCost: 0,
      totalProfit: 0,
      profitRate: null,
      sites: [],
      alertCounts: { caution: 0, danger: 0, deficit: 0, deadline: 0 },
    };
  }

  // Get sales_invoices grouped by site_id
  let salesQuery = supabase
    .from("sales_invoices")
    .select("site_id, total_amount, invoice_date");
  if (fromDate && toDate) {
    salesQuery = salesQuery.gte("invoice_date", fromDate).lte("invoice_date", toDate);
  }
  const { data: salesData } = await salesQuery;

  const salesBySite = new Map<string, number>();
  for (const row of salesData ?? []) {
    if (!row.site_id) continue;
    salesBySite.set(row.site_id, (salesBySite.get(row.site_id) || 0) + row.total_amount);
  }

  // Get invoice_lines (支払原価) grouped by site_id
  const invoiceLinesQuery = supabase
    .from("invoice_lines")
    .select("site_id, amount_incl_tax, invoice:invoices(invoice_date, organization_id)");

  const { data: linesData } = await invoiceLinesQuery;

  const invoiceCostBySite = new Map<string, number>();
  for (const line of linesData ?? []) {
    if (!line.site_id) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = line.invoice as any;
    if (!invoice) continue;
    if (invoice.organization_id !== organizationId) continue;
    if (fromDate && toDate) {
      if (invoice.invoice_date < fromDate || invoice.invoice_date > toDate) continue;
    }
    invoiceCostBySite.set(
      line.site_id,
      (invoiceCostBySite.get(line.site_id) || 0) + line.amount_incl_tax
    );
  }

  // Get work_logs (労務費) grouped by site_id
  let laborQuery = supabase
    .from("work_logs")
    .select("site_id, labor_cost, work_date");
  if (fromDate && toDate) {
    laborQuery = laborQuery.gte("work_date", fromDate).lte("work_date", toDate);
  }
  const { data: laborData } = await laborQuery;

  const laborBySite = new Map<string, number>();
  for (const row of laborData ?? []) {
    if (!row.site_id) continue;
    laborBySite.set(row.site_id, (laborBySite.get(row.site_id) || 0) + row.labor_cost);
  }

  // Build per-site profit data
  const siteResults: SiteProfit[] = (sites ?? []).map((site) => {
    const sales = salesBySite.get(site.id) || 0;
    const invoiceCost = invoiceCostBySite.get(site.id) || 0;
    const labor = laborBySite.get(site.id) || 0;
    const totalCost = invoiceCost + labor;
    const grossProfit = sales - totalCost;
    const grossMargin =
      sales > 0 ? Math.round(((grossProfit / sales) * 100) * 10) / 10 : null;

    const { status: alertStatus, reasons } = getAlertStatus(
      sales,
      totalCost,
      site.end_date
    );

    return {
      id: site.id,
      code: site.code,
      name: site.name,
      status: site.status,
      contract_amount: site.contract_amount,
      start_date: site.start_date,
      end_date: site.end_date,
      sales,
      invoice_cost: invoiceCost,
      labor_cost: labor,
      total_cost: totalCost,
      gross_profit: grossProfit,
      gross_margin: grossMargin,
      alert_status: alertStatus,
      alert_reasons: reasons,
    };
  });

  // Filter by alert status if specified
  let filteredSites = siteResults;
  if (alertFilter && alertFilter !== "all") {
    filteredSites = siteResults.filter((s) => s.alert_status === alertFilter);
  }

  // Alert counts (always from full list)
  const alertCounts = {
    caution: siteResults.filter((s) => s.alert_status === "要注意").length,
    danger: siteResults.filter((s) => s.alert_status === "危険").length,
    deficit: siteResults.filter((s) => s.alert_status === "赤字").length,
    deadline: siteResults.filter((s) => s.alert_status === "完工間近").length,
  };

  const totalSales = filteredSites.reduce((s, r) => s + r.sales, 0);
  const totalCost = filteredSites.reduce((s, r) => s + r.total_cost, 0);
  const totalProfit = totalSales - totalCost;
  const profitRate =
    totalSales > 0 ? Math.round(((totalProfit / totalSales) * 100) * 10) / 10 : null;

  return {
    totalSales,
    totalCost,
    totalProfit,
    profitRate,
    sites: filteredSites,
    alertCounts,
  };
}
