import { getMasterData } from "./actions";
import { getOrganization } from "@/lib/get-organization";
import { InvoiceNewClient } from "./invoice-new-client";

export default async function InvoiceNewPage() {
  const [masterData, { organizationId }] = await Promise.all([
    getMasterData(),
    getOrganization(),
  ]);

  return (
    <div className="max-w-[1600px] mx-auto px-6 lg:px-10 h-[calc(100vh-4rem)]">
      <InvoiceNewClient
        vendors={masterData.vendors}
        sites={masterData.sites}
        accounts={masterData.accounts}
        organizationId={organizationId}
      />
    </div>
  );
}
