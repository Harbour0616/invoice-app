import { getInvoices, getFilterOptions } from "./actions";
import { DataList } from "./data-list";

export default async function DataPage() {
  const [invoiceData, filterOptions] = await Promise.all([
    getInvoices(),
    getFilterOptions(),
  ]);

  return (
    <div className="max-w-[1200px] mx-auto px-12">
      <h1 className="text-xl font-bold mb-6">データ一覧</h1>
      <DataList
        initialInvoices={invoiceData.invoices}
        vendors={filterOptions.vendors}
        sites={filterOptions.sites}
        userNames={invoiceData.userNames}
      />
    </div>
  );
}
