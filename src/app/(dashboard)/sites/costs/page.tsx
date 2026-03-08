import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/get-organization";
import { SiteCostChart } from "./site-cost-chart";

const CHART_COLORS = [
  "#2F9E77",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

export default async function SiteCostsPage() {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      `
      id,
      invoice_lines(
        site_id,
        account_id,
        amount_excl_tax,
        site:sites(id, code, name),
        account:accounts(id, code, name)
      )
    `
    )
    .eq("organization_id", organizationId);

  // site_id ごとに税抜金額を集計 + site×account の内訳
  const siteMap = new Map<
    string,
    { id: string; code: string; name: string; total: number }
  >();
  // site_id -> account_id -> amount
  const breakdownMap = new Map<string, Map<string, number>>();
  // account_id -> name
  const accountNameMap = new Map<string, string>();

  for (const inv of invoices || []) {
    for (const line of inv.invoice_lines) {
      if (!line.site_id) continue;
      const siteRaw = line.site as unknown;
      const site = Array.isArray(siteRaw) ? siteRaw[0] as { id: string; code: string; name: string } | undefined : siteRaw as { id: string; code: string; name: string } | null;
      if (!site) continue;

      // サイト合計
      const existing = siteMap.get(site.id);
      if (existing) {
        existing.total += line.amount_excl_tax;
      } else {
        siteMap.set(site.id, {
          id: site.id,
          code: site.code,
          name: site.name,
          total: line.amount_excl_tax,
        });
      }

      // 科目別内訳
      if (line.account_id) {
        const accountRaw = line.account as unknown;
        const account = Array.isArray(accountRaw) ? accountRaw[0] as { id: string; code: string; name: string } | undefined : accountRaw as { id: string; code: string; name: string } | null;
        if (account) {
          accountNameMap.set(account.id, account.name);
        }

        if (!breakdownMap.has(site.id)) {
          breakdownMap.set(site.id, new Map());
        }
        const siteAccounts = breakdownMap.get(site.id)!;
        siteAccounts.set(
          line.account_id,
          (siteAccounts.get(line.account_id) || 0) + line.amount_excl_tax
        );
      }
    }
  }

  // 費用合計の多い順にソート
  const siteCosts = Array.from(siteMap.values()).sort(
    (a, b) => b.total - a.total
  );

  const grandTotal = siteCosts.reduce((sum, s) => sum + s.total, 0);

  // グラフ用データ構築
  const allAccountIds = Array.from(accountNameMap.keys());
  const accountKeys = allAccountIds.map((id, i) => ({
    key: id,
    name: accountNameMap.get(id) || id,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const chartData = siteCosts.map((site) => {
    const row: Record<string, string | number> = { name: site.name };
    const siteAccounts = breakdownMap.get(site.id);
    for (const accId of allAccountIds) {
      row[accId] = siteAccounts?.get(accId) || 0;
    }
    return row;
  });

  return (
    <div className="max-w-[1200px] mx-auto px-12">
      <h1 className="text-xl font-bold mb-6">現場別費用</h1>

      {/* 合計金額 */}
      <div className="card mb-6 flex items-center justify-between">
        <span className="text-sub-text text-sm">税抜費用合計</span>
        <span className="text-2xl font-bold font-mono text-primary">
          ¥{formatNumber(grandTotal)}
        </span>
      </div>

      {/* 科目別積み上げ棒グラフ */}
      <SiteCostChart data={chartData} accountKeys={accountKeys} />

      {/* 現場ごとのカード */}
      {siteCosts.length === 0 ? (
        <p className="text-sub-text text-sm">データがありません</p>
      ) : (
        <div className="flex flex-col gap-3">
          {siteCosts.map((site) => (
            <div key={site.id} className="card flex items-center justify-between !py-5">
              <div>
                <div className="text-base font-bold text-foreground">
                  {site.name}
                </div>
                <div className="text-xs text-sub-text mt-0.5">{site.code}</div>
              </div>
              <div className="text-lg font-bold font-mono text-foreground">
                ¥{formatNumber(site.total)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
