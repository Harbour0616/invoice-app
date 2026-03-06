import { getInvoices, getFilterOptions, getDisplayMonths } from "./actions";
import { getOrganization } from "@/lib/get-organization";
import { DataList } from "./data-list";

export default async function DataPage() {
  const [{ role }, displayMonths, filterOptions] = await Promise.all([
    getOrganization(),
    getDisplayMonths(),
    getFilterOptions(),
  ]);

  // デフォルト日付範囲: N ヶ月前の1日〜今日
  const now = new Date();
  const dateTo = now.toISOString().split("T")[0];
  const fromDate = new Date(now.getFullYear(), now.getMonth() - displayMonths, 1);
  const dateFrom = fromDate.toISOString().split("T")[0];

  const invoiceData = await getInvoices(dateFrom, dateTo);

  return (
    <div className="max-w-[1200px] mx-auto px-12">
      <h1 className="text-xl font-bold mb-6">データ一覧</h1>
      <DataList
        initialInvoices={invoiceData.invoices}
        vendors={filterOptions.vendors}
        sites={filterOptions.sites}
        userNames={invoiceData.userNames}
        defaultDateFrom={dateFrom}
        defaultDateTo={dateTo}
        displayMonths={displayMonths}
        role={role}
      />
    </div>
  );
}
