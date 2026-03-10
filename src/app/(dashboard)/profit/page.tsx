import { getProfitData } from "./actions";
import { ProfitClient } from "./profit-client";

export default async function ProfitPage() {
  const data = await getProfitData();

  return (
    <div className="max-w-[1200px] mx-auto px-12">
      <ProfitClient initialData={data} />
    </div>
  );
}
