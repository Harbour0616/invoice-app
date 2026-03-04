import { getVendors } from "./actions";
import { VendorList } from "./vendor-list";

export default async function VendorsPage() {
  const vendors = await getVendors();

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">取引先マスタ</h1>
      <VendorList initialVendors={vendors} />
    </div>
  );
}
