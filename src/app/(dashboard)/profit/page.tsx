import { getProfitData } from "./actions";
import { ProfitWrapper } from "./profit-wrapper";

export default async function ProfitPage() {
  const data = await getProfitData();

  return <ProfitWrapper initialData={data} />;
}
