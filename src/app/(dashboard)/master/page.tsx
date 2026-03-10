import { getSites } from "../sites/manage/actions";
import { getClients } from "../clients/actions";
import { getVendors } from "./vendors/actions";
import { getEmployees } from "../labor/actions";
import { getAccountItems } from "./account-item-actions";
import { MasterClient } from "./master-client";

export default async function MasterPage() {
  const [sites, clients, vendors, employees, accountItems] = await Promise.all([
    getSites(),
    getClients(),
    getVendors(),
    getEmployees(),
    getAccountItems(),
  ]);

  return (
    <div className="max-w-[1200px] mx-auto px-12">
      <MasterClient
        sites={sites}
        clients={clients}
        vendors={vendors}
        employees={employees}
        accountItems={accountItems}
      />
    </div>
  );
}
