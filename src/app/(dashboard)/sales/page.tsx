import { getEstimates, getSalesInvoices, getActiveSites, getClients } from "./actions";
import { SalesClient } from "./sales-client";

export default async function SalesPage() {
  const [estimates, salesInvoices, sites, clients] = await Promise.all([
    getEstimates(),
    getSalesInvoices(),
    getActiveSites(),
    getClients(),
  ]);

  return (
    <div className="max-w-[1200px] mx-auto px-12">
      <SalesClient
        initialEstimates={estimates}
        initialSalesInvoices={salesInvoices}
        sites={sites}
        clients={clients}
      />
    </div>
  );
}
