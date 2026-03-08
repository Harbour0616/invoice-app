import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/get-organization";
import { SiteCostChart } from "./site-cost-chart";

const CHART_COLORS = [
  "#2F9E77",
  "#5BA8D9",
  "#E8A838",
  "#9B7ED8",
  "#E06B6B",
  "#4DBCB0",
  "#D479A8",
  "#7DB856",
  "#D98E4E",
  "#7C8CF5",
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
    <div className="max-w-[1200px] mx-auto px-6 lg:px-12 pb-12">
      {/* ページヘッダー */}
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-[17px] font-bold text-foreground tracking-tight">現場別費用</h1>
        <span className="text-[11px] text-sub-text font-medium">{siteCosts.length} 現場</span>
      </div>

      {/* 合計金額ヒーロー */}
      <div
        className="rounded-[20px] border border-border mb-8 px-8 py-7"
        style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #F0F9F4 60%, #E6F5ED 100%)",
          boxShadow: "0 2px 12px rgba(47,158,119,0.07)",
        }}
      >
        <div className="text-[11px] font-semibold text-sub-text uppercase tracking-widest mb-2">
          税抜費用合計
        </div>
        <div className="text-[2.25rem] font-extrabold font-mono text-primary tracking-tight leading-none">
          ¥{formatNumber(grandTotal)}
        </div>
      </div>

      {/* 科目別積み上げ棒グラフ */}
      <SiteCostChart data={chartData} accountKeys={accountKeys} />

      {/* 区切り */}
      <div className="h-px bg-border mb-6" />

      {/* 現場一覧セクション */}
      {siteCosts.length === 0 ? (
        <p className="text-sub-text text-sm">データがありません</p>
      ) : (
        <>
          <div className="text-[11px] font-semibold text-sub-text uppercase tracking-widest mb-3">
            現場一覧
          </div>
          <div className="flex flex-col gap-2">
            {siteCosts.map((site, idx) => {
              const pct = grandTotal > 0 ? (site.total / grandTotal) * 100 : 0;
              return (
                <div
                  key={site.id}
                  className="group bg-card rounded-[16px] border border-border px-6 py-4 flex items-center justify-between transition-all hover:shadow-md hover:border-primary/20"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-[11px] font-mono text-sub-text/60 w-5 shrink-0 text-right">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {site.name}
                      </div>
                      <div className="text-[11px] text-sub-text mt-0.5">{site.code}</div>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3 shrink-0 ml-4">
                    <span className="text-[11px] font-medium text-sub-text/70 tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                    <span className="text-[15px] font-bold font-mono text-foreground tabular-nums">
                      ¥{formatNumber(site.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
