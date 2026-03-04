import { getInvoices, getFilterOptions } from "./actions";
import { DataList } from "./data-list";

export default async function DataPage() {
  const [invoices, filterOptions] = await Promise.all([
    getInvoices(),
    getFilterOptions(),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">データ一覧</h1>
      <DataList
        initialInvoices={invoices}
        vendors={filterOptions.vendors}
        sites={filterOptions.sites}
      />
    </div>
  );
}
