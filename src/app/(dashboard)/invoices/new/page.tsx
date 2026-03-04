import { getMasterData } from "./actions";
import { InvoiceForm } from "./invoice-form";

export default async function InvoiceNewPage() {
  const masterData = await getMasterData();

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">請求書入力</h1>
      <InvoiceForm
        vendors={masterData.vendors}
        sites={masterData.sites}
        accounts={masterData.accounts}
      />
    </div>
  );
}
