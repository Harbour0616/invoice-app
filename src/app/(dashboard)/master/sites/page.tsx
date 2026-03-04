import { getSites } from "./actions";
import { SiteList } from "./site-list";

export default async function SitesPage() {
  const sites = await getSites();

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">現場マスタ</h1>
      <SiteList initialSites={sites} />
    </div>
  );
}
