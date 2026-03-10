import { getProfitData } from "./actions";
import { ProfitClient } from "./profit-client";

export default async function ProfitPage() {
  const data = await getProfitData();

  return <ProfitClient initialData={data} />;
}
