import { getEmployees, getActiveSites, getWorkLogs } from "./actions";
import { LaborClient } from "./labor-client";

export default async function LaborPage() {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [employees, sites, workLogs] = await Promise.all([
    getEmployees(),
    getActiveSites(),
    getWorkLogs(from, to),
  ]);

  return (
    <div className="max-w-[1200px] mx-auto px-12">
      <LaborClient
        initialEmployees={employees}
        sites={sites}
        initialWorkLogs={workLogs}
        defaultFrom={from}
        defaultTo={to}
      />
    </div>
  );
}
