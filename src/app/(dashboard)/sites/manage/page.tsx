import { getSites } from "./actions";
import { SiteManageClient } from "./site-manage-client";

export default async function SiteManagePage() {
  const sites = await getSites();

  return (
    <div className="max-w-[1200px] mx-auto px-12">
      <h1 className="text-xl font-bold mb-6">現場管理</h1>
      <SiteManageClient initialSites={sites} />
    </div>
  );
}
