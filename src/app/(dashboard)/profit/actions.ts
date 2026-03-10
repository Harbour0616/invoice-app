"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/get-organization";

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
};

export type ProfitSummary = {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  profitRate: number | null;
  siteCount: number;
  sites: SiteProfit[];
};

export async function getProfitData(yearMonth?: string, status?: string): Promise<ProfitSummary> {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  let fromDate: string | null = null;
  let toDate: string | null = null;
  if (yearMonth) {
    fromDate = `${yearMonth}-01`;
    const [y, m] = yearMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    toDate = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  }

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
    return { totalSales: 0, totalCost: 0, totalProfit: 0, profitRate: null, siteCount: 0, sites: [] };
  }

  // Sales
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

  // Invoice cost (via invoice_lines)
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
    invoiceCostBySite.set(line.site_id, (invoiceCostBySite.get(line.site_id) || 0) + line.amount_incl_tax);
  }

  // Labor cost
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

  // Build per-site profit
  const siteResults: SiteProfit[] = (sites ?? []).map((site) => {
    const sales = salesBySite.get(site.id) || 0;
    const invoiceCost = invoiceCostBySite.get(site.id) || 0;
    const labor = laborBySite.get(site.id) || 0;
    const totalCost = invoiceCost + labor;
    const grossProfit = sales - totalCost;
    const grossMargin = sales > 0 ? Math.round((grossProfit / sales) * 1000) / 10 : null;

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
    };
  });

  const totalSales = siteResults.reduce((s, r) => s + r.sales, 0);
  const totalCost = siteResults.reduce((s, r) => s + r.total_cost, 0);
  const totalProfit = totalSales - totalCost;
  const profitRate = totalSales > 0 ? Math.round((totalProfit / totalSales) * 1000) / 10 : null;

  return {
    totalSales,
    totalCost,
    totalProfit,
    profitRate,
    siteCount: siteResults.length,
    sites: siteResults,
  };
}
