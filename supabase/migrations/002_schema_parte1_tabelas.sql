-- =============================================
-- VISITAPRO CRM — PARTE 1: TABELAS E ÍNDICES
-- Cole este bloco no SQL Editor e clique RUN
-- =============================================

-- Extensão UUID (geralmente já existe no Supabase)
create extension if not exists "uuid-ossp";

-- Estágios do Pipeline
create table if not exists public.pipeline_stages (
  id       uuid default uuid_generate_v4() primary key,
  name     text not null,
  slug     text not null unique,
  color    text not null default '#6b7280',
  position integer not null,
  created_at timestamptz default now()
);

-- Perfis de usuários (vendedores / admins)
create table if not exists public.profiles (
  id         uuid primary key,
  full_name  text not null,
  email      text unique not null,
  phone      text,
  role       text not null default 'vendedor' check (role in ('admin','vendedor')),
  avatar_url text,
  active     boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Leads / Clientes
create table if not exists public.leads (
  id           uuid default uuid_generate_v4() primary key,
  name         text not null,
  email        text,
  phone        text,
  address      text,
  city         text,
  neighborhood text,
  source       text default 'google_ads' check (source in ('google_ads','indicacao','site','telefone','outro')),
  stage_id     uuid references public.pipeline_stages(id) on delete set null,
  assigned_to  uuid references public.profiles(id) on delete set null,
  notes        text,
  tags         text[],
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Propostas
create table if not exists public.proposals (
  id          uuid default uuid_generate_v4() primary key,
  lead_id     uuid references public.leads(id) on delete cascade not null,
  title       text not null,
  description text,
  value       numeric(12,2) not null default 0,
  status      text not null default 'rascunho' check (status in ('rascunho','enviada','aceita','recusada','expirada')),
  sent_at     timestamptz,
  expires_at  timestamptz,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Itens da proposta
create table if not exists public.proposal_items (
  id          uuid default uuid_generate_v4() primary key,
  proposal_id uuid references public.proposals(id) on delete cascade not null,
  description text not null,
  quantity    numeric(10,2) default 1,
  unit_price  numeric(12,2) not null default 0,
  created_at  timestamptz default now()
);

-- Visitas técnicas
create table if not exists public.visits (
  id               uuid default uuid_generate_v4() primary key,
  lead_id          uuid references public.leads(id) on delete cascade not null,
  assigned_to      uuid references public.profiles(id) on delete set null,
  title            text not null,
  description      text,
  scheduled_at     timestamptz not null,
  duration_minutes integer default 60,
  status           text not null default 'agendada' check (status in ('agendada','realizada','cancelada','reagendada')),
  address          text,
  notes            text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Atividades / Histórico
create table if not exists public.activities (
  id       uuid default uuid_generate_v4() primary key,
  lead_id  uuid references public.leads(id) on delete cascade not null,
  user_id  uuid references public.profiles(id) on delete set null,
  type     text not null check (type in ('nota','ligacao','email','whatsapp','visita','proposta','status_change','sistema')),
  content  text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Mensagens internas
create table if not exists public.messages (
  id        uuid default uuid_generate_v4() primary key,
  lead_id   uuid references public.leads(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete set null,
  content   text not null,
  read_by   uuid[],
  created_at timestamptz default now()
);

-- Índices
create index if not exists idx_leads_stage    on public.leads(stage_id);
create index if not exists idx_leads_assigned on public.leads(assigned_to);
create index if not exists idx_leads_created  on public.leads(created_at desc);
create index if not exists idx_proposals_lead   on public.proposals(lead_id);
create index if not exists idx_proposals_status on public.proposals(status);
create index if not exists idx_visits_assigned  on public.visits(assigned_to);
create index if not exists idx_visits_scheduled on public.visits(scheduled_at);
create index if not exists idx_activities_lead  on public.activities(lead_id);
create index if not exists idx_messages_lead    on public.messages(lead_id);

-- View: métricas do dashboard
create or replace view public.dashboard_metrics as
select
  (select count(*)                             from public.leads)                                   as total_leads,
  (select count(*)                             from public.proposals where status = 'enviada')      as propostas_enviadas,
  (select count(*)                             from public.proposals where status = 'aceita')       as propostas_fechadas,
  (select count(*)                             from public.proposals where status = 'recusada')     as propostas_recusadas,
  (select coalesce(sum(value),0)               from public.proposals where status = 'aceita')       as valor_fechado,
  (select coalesce(sum(value),0)               from public.proposals where status = 'enviada')      as valor_pipeline,
  (select count(*)                             from public.visits   where status = 'agendada' and scheduled_at >= now()) as visitas_agendadas,
  (select count(*)                             from public.leads    where created_at >= date_trunc('month', now()))      as leads_mes_atual;

-- Dados iniciais dos estágios
insert into public.pipeline_stages (name, slug, color, position) values
  ('Novo Lead',         'novo_lead',        '#3b82f6', 1),
  ('Contato Realizado', 'contato',          '#8b5cf6', 2),
  ('Visita Agendada',   'visita_agendada',  '#f59e0b', 3),
  ('Proposta Enviada',  'proposta_enviada', '#06b6d4', 4),
  ('Em Negociação',     'negociacao',       '#f97316', 5),
  ('Fechado (Ganho)',   'fechado_ganho',    '#10b981', 6),
  ('Fechado (Perdido)', 'fechado_perdido',  '#ef4444', 7)
on conflict (slug) do nothing;
