import { getAccounts } from "./actions";
import { AccountList } from "./account-list";

export default async function AccountsPage() {
  const accounts = await getAccounts();

  return (
    <div className="max-w-[1200px] mx-auto px-12">
      <h1 className="text-xl font-bold mb-6">勘定科目マスタ</h1>
      <AccountList initialAccounts={accounts} />
    </div>
  );
}
