-- Phase 1 schema proposal. Review before production apply.
create extension if not exists pgcrypto;
create table public.sites(id uuid primary key default gen_random_uuid(), name text not null, industry text not null, created_at timestamptz not null default now());
create table public.areas(id uuid primary key default gen_random_uuid(), site_id uuid not null references public.sites(id), name text not null, characteristics jsonb not null default '{}');
create table public.checklist_templates(id uuid primary key default gen_random_uuid(), industry text not null, version integer not null default 1, label text not null, status text not null default 'draft', created_at timestamptz not null default now());
create table public.checklist_items(id uuid primary key default gen_random_uuid(), template_id uuid not null references public.checklist_templates(id), category text not null check(category in ('정리','정돈','청소','청결','습관화')), prompt text not null, position integer not null, unique(template_id,category,position));
create table public.inspections(id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), area_id uuid not null references public.areas(id), recipient_email text not null, status text not null default 'draft' check(status in ('draft','completed')), checklist_snapshot jsonb not null, created_at timestamptz not null default now(), completed_at timestamptz);
create table public.inspection_answers(id uuid primary key default gen_random_uuid(), inspection_id uuid not null references public.inspections(id) on delete cascade, item_key text not null, category text not null check(category in ('정리','정돈','청소','청결','습관화')), score integer check(score between 1 and 5), note text not null default '', unique(inspection_id,item_key));
create table public.inspection_photos(id uuid primary key default gen_random_uuid(), inspection_id uuid not null references public.inspections(id) on delete cascade, answer_id uuid references public.inspection_answers(id) on delete cascade, object_path text not null, created_at timestamptz not null default now());
create table public.corrective_actions(id uuid primary key default gen_random_uuid(), inspection_id uuid not null references public.inspections(id) on delete cascade, answer_id uuid references public.inspection_answers(id), action_text text not null, assignee text, due_date date, priority text check(priority in ('high','medium','low')), status text not null default 'open');
create table public.reports(id uuid primary key default gen_random_uuid(), inspection_id uuid not null references public.inspections(id) on delete cascade, object_path text not null, normalized_score numeric(5,1) not null, grade text not null, created_at timestamptz not null default now());
create table public.email_deliveries(id uuid primary key default gen_random_uuid(), report_id uuid not null references public.reports(id), recipient text not null, provider_message_id text, status text not null default 'pending', last_error text, sent_at timestamptz);
create index on public.inspections(owner_id,created_at desc);
create index on public.inspection_answers(inspection_id);
create index on public.inspection_photos(inspection_id);
-- Public data API is locked down until authorization and administrative access flows are implemented.
alter table public.sites enable row level security;
alter table public.areas enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_items enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_answers enable row level security;
alter table public.inspection_photos enable row level security;
alter table public.corrective_actions enable row level security;
alter table public.reports enable row level security;
alter table public.email_deliveries enable row level security;
-- Only own drafts can be read/created/changed. Completed records must be modified only through validated server flow.
create policy own_inspections_read on public.inspections for select to authenticated using(owner_id=(select auth.uid()));
create policy own_inspections_insert on public.inspections for insert to authenticated with check(owner_id=(select auth.uid()) and status='draft');
create policy own_inspections_update on public.inspections for update to authenticated using(owner_id=(select auth.uid()) and status='draft') with check(owner_id=(select auth.uid()) and status='draft');
create policy own_answers_read on public.inspection_answers for select to authenticated using(exists(select 1 from public.inspections i where i.id=inspection_id and i.owner_id=(select auth.uid())));
create policy own_answers_insert on public.inspection_answers for insert to authenticated with check(exists(select 1 from public.inspections i where i.id=inspection_id and i.owner_id=(select auth.uid()) and i.status='draft'));
create policy own_answers_update on public.inspection_answers for update to authenticated using(exists(select 1 from public.inspections i where i.id=inspection_id and i.owner_id=(select auth.uid()) and i.status='draft')) with check(exists(select 1 from public.inspections i where i.id=inspection_id and i.owner_id=(select auth.uid()) and i.status='draft'));
-- Read-only results / photo writes / storage policies to be configured in next development phase after ownership validation.
