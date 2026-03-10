"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/get-organization";
import { revalidatePath } from "next/cache";

/* ---------- 従業員 ---------- */

export async function getEmployees() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("employee_code");
  if (error) {
    console.error("employees fetch error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function saveEmployee(input: {
  id?: string;
  employee_code: string | null;
  employee_name: string;
  daily_wage: number;
}) {
  const supabase = await createClient();
  const record = {
    employee_code: input.employee_code || null,
    employee_name: input.employee_name,
    daily_wage: input.daily_wage,
  };

  if (input.id) {
    const { error } = await supabase
      .from("employees")
      .update(record)
      .eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("employees").insert(record);
    if (error) return { error: error.message };
  }

  revalidatePath("/labor");
  revalidatePath("/master");
  return { error: null };
}

export async function deleteEmployee(id: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("work_logs")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", id);

  if (count && count > 0) {
    return { error: `この従業員は ${count} 件の作業日報で使用されています。先に日報を削除してください。` };
  }

  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/labor");
  revalidatePath("/master");
  return { error: null };
}

/* ---------- 現場 ---------- */

export async function getActiveSites() {
  const { organizationId } = await getOrganization();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("id, code, name")
    .eq("organization_id", organizationId)
    .eq("status", "進行中")
    .order("code");
  return data ?? [];
}

/* ---------- 日報 ---------- */

export async function getWorkLogs(from: string, to: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_logs")
    .select("*, employee:employees(id, employee_name), site:sites(id, code, name)")
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date", { ascending: false });
  if (error) {
    console.error("work_logs fetch error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function saveWorkLog(input: {
  id?: string;
  work_date: string;
  employee_id: string | null;
  site_id: string | null;
  hours: number;
  daily_wage: number;
  labor_cost: number;
  notes: string | null;
}) {
  const supabase = await createClient();
  const record = {
    work_date: input.work_date,
    employee_id: input.employee_id || null,
    site_id: input.site_id || null,
    hours: input.hours,
    daily_wage: input.daily_wage,
    labor_cost: input.labor_cost,
    notes: input.notes || null,
  };

  if (input.id) {
    const { error } = await supabase
      .from("work_logs")
      .update(record)
      .eq("id", input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("work_logs").insert(record);
    if (error) return { error: error.message };
  }

  revalidatePath("/labor");
  revalidatePath("/master");
  return { error: null };
}

export async function deleteWorkLog(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("work_logs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/labor");
  revalidatePath("/master");
  return { error: null };
}

/* ---------- 集計 ---------- */

export async function getSummary(yearMonth: string, siteId?: string) {
  const supabase = await createClient();
  const from = `${yearMonth}-01`;
  // Calculate last day of month
  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;

  let query = supabase
    .from("work_logs")
    .select("*, employee:employees(id, employee_name, employee_code), site:sites(id, code, name)")
    .gte("work_date", from)
    .lte("work_date", to);

  if (siteId) {
    query = query.eq("site_id", siteId);
  }

  const { data, error } = await query.order("work_date");
  if (error) {
    console.error("summary fetch error:", error.message);
    return { bySite: [], byEmployee: [] };
  }

  const logs = data ?? [];

  // Aggregate by site
  const siteMap = new Map<string, { name: string; hours: number; cost: number }>();
  for (const log of logs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const site = log.site as any;
    const key = site?.id || "unassigned";
    const name = site ? `${site.code} - ${site.name}` : "未割当";
    const entry = siteMap.get(key) || { name, hours: 0, cost: 0 };
    entry.hours += Number(log.hours);
    entry.cost += log.labor_cost;
    siteMap.set(key, entry);
  }

  // Aggregate by employee
  const empMap = new Map<string, { name: string; hours: number; cost: number }>();
  for (const log of logs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emp = log.employee as any;
    const key = emp?.id || "unassigned";
    const name = emp?.employee_name || "未割当";
    const entry = empMap.get(key) || { name, hours: 0, cost: 0 };
    entry.hours += Number(log.hours);
    entry.cost += log.labor_cost;
    empMap.set(key, entry);
  }

  return {
    bySite: Array.from(siteMap.entries()).map(([id, v]) => ({ id, ...v })),
    byEmployee: Array.from(empMap.entries()).map(([id, v]) => ({ id, ...v })),
  };
}
