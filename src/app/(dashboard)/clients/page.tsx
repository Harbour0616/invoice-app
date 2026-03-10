import { getClients } from "./actions";
import { ClientList } from "./client-list";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="max-w-[1200px] mx-auto px-12">
      <h1 className="text-xl font-bold mb-6">売上先マスタ</h1>
      <ClientList initialClients={clients} />
    </div>
  );
}
