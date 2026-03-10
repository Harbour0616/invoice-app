-- 従業員マスタ
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text,
  employee_name text not null,
  daily_wage integer not null default 0,
  created_at timestamptz not null default now()
);

-- 作業日報
create table if not exists work_logs (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  employee_id uuid references employees(id),
  site_id uuid references sites(id),
  hours numeric(5,2) not null default 8,
  daily_wage integer not null default 0,
  labor_cost integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- インデックス
create index if not exists idx_work_logs_date on work_logs(work_date);
create index if not exists idx_work_logs_employee on work_logs(employee_id);
create index if not exists idx_work_logs_site on work_logs(site_id);

-- RLS
alter table employees enable row level security;
alter table work_logs enable row level security;

create policy "employees_all" on employees for all using (true) with check (true);
create policy "work_logs_all" on work_logs for all using (true) with check (true);
