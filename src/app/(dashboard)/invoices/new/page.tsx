import { getMasterData } from "./actions";
import { getOrganization } from "@/lib/get-organization";
import { InvoiceNewClient } from "./invoice-new-client";

export default async function InvoiceNewPage() {
  const [masterData, { organizationId }] = await Promise.all([
    getMasterData(),
    getOrganization(),
  ]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col px-12">
      <h1 className="text-xl font-bold mb-4 shrink-0">請求書入力</h1>
      <div className="flex-1 min-h-0">
        <InvoiceNewClient
          vendors={masterData.vendors}
          sites={masterData.sites}
          accounts={masterData.accounts}
          organizationId={organizationId}
        />
      </div>
    </div>
  );
}
