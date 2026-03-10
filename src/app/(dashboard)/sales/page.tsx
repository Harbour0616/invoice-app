import { getEstimates, getSalesInvoices, getActiveSites } from "./actions";
import { SalesClient } from "./sales-client";

export default async function SalesPage() {
  const [estimates, salesInvoices, sites] = await Promise.all([
    getEstimates(),
    getSalesInvoices(),
    getActiveSites(),
  ]);

  return (
    <div className="max-w-[1200px] mx-auto px-12">
      <SalesClient
        initialEstimates={estimates}
        initialSalesInvoices={salesInvoices}
        sites={sites}
      />
    </div>
  );
}
