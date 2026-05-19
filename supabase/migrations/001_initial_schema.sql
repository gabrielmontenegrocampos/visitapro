-- VisitaPro CRM - Schema Completo

-- Extensões
create extension if not exists "uuid-ossp";

-- Tabela de perfis de usuários (vendedores/admins)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text unique not null,
  phone text,
  role text not null default 'vendedor' check (role in ('admin', 'vendedor')),
  avatar_url text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Estágios do pipeline Kanban
create table if not exists public.pipeline_stages (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  color text not null default '#6b7280',
  position integer not null,
  created_at timestamptz default now()
);

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

-- Leads / Clientes
create table if not exists public.leads (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text,
  phone text,
  address text,
  city text,
  neighborhood text,
  source text default 'google_ads' check (source in ('google_ads', 'indicacao', 'site', 'telefone', 'outro')),
  stage_id uuid references public.pipeline_stages(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  notes text,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Propostas
create table if not exists public.proposals (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  title text not null,
  description text,
  value numeric(12,2) not null default 0,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'aceita', 'recusada', 'expirada')),
  sent_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Itens da proposta (serviços/produtos)
create table if not exists public.proposal_items (
  id uuid default uuid_generate_v4() primary key,
  proposal_id uuid references public.proposals(id) on delete cascade not null,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz default now()
);

-- Visitas técnicas
create table if not exists public.visits (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  assigned_to uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  duration_minutes integer default 60,
  status text not null default 'agendada' check (status in ('agendada', 'realizada', 'cancelada', 'reagendada')),
  address text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Atividades / Histórico do lead
create table if not exists public.activities (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('nota', 'ligacao', 'email', 'whatsapp', 'visita', 'proposta', 'status_change', 'sistema')),
  content text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Mensagens internas do pipeline
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete set null,
  content text not null,
  read_by uuid[],
  created_at timestamptz default now()
);

-- Função para atualizar updated_at automaticamente
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers de updated_at
create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.leads
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.proposals
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.visits
  for each row execute function public.handle_updated_at();

-- Função para criar perfil automaticamente ao registrar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS (Row Level Security)
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_items enable row level security;
alter table public.visits enable row level security;
alter table public.activities enable row level security;
alter table public.messages enable row level security;
alter table public.pipeline_stages enable row level security;

-- Políticas RLS: admins veem tudo, vendedores veem seus próprios registros
create policy "profiles: ver todos" on public.profiles for select using (auth.uid() is not null);
create policy "profiles: editar proprio" on public.profiles for update using (auth.uid() = id);

create policy "pipeline_stages: ver todos" on public.pipeline_stages for select using (auth.uid() is not null);

create policy "leads: admin ve tudo" on public.leads for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "leads: vendedor ve seus" on public.leads for select
  using (assigned_to = auth.uid());
create policy "leads: vendedor cria" on public.leads for insert
  with check (auth.uid() is not null);
create policy "leads: vendedor edita seus" on public.leads for update
  using (assigned_to = auth.uid());

create policy "proposals: acesso total autenticado" on public.proposals for all
  using (auth.uid() is not null);
create policy "proposal_items: acesso total autenticado" on public.proposal_items for all
  using (auth.uid() is not null);

create policy "visits: acesso total autenticado" on public.visits for all
  using (auth.uid() is not null);

create policy "activities: acesso total autenticado" on public.activities for all
  using (auth.uid() is not null);

create policy "messages: acesso total autenticado" on public.messages for all
  using (auth.uid() is not null);

-- Índices para performance
create index if not exists idx_leads_stage on public.leads(stage_id);
create index if not exists idx_leads_assigned on public.leads(assigned_to);
create index if not exists idx_leads_created on public.leads(created_at desc);
create index if not exists idx_proposals_lead on public.proposals(lead_id);
create index if not exists idx_proposals_status on public.proposals(status);
create index if not exists idx_visits_assigned on public.visits(assigned_to);
create index if not exists idx_visits_scheduled on public.visits(scheduled_at);
create index if not exists idx_activities_lead on public.activities(lead_id);
create index if not exists idx_messages_lead on public.messages(lead_id);

-- View: dashboard métricas
create or replace view public.dashboard_metrics as
select
  (select count(*) from public.leads) as total_leads,
  (select count(*) from public.proposals where status = 'enviada') as propostas_enviadas,
  (select count(*) from public.proposals where status = 'aceita') as propostas_fechadas,
  (select count(*) from public.proposals where status = 'recusada') as propostas_recusadas,
  (select coalesce(sum(value), 0) from public.proposals where status = 'aceita') as valor_fechado,
  (select coalesce(sum(value), 0) from public.proposals where status = 'enviada') as valor_pipeline,
  (select count(*) from public.visits where status = 'agendada' and scheduled_at >= now()) as visitas_agendadas,
  (select count(*) from public.leads where created_at >= date_trunc('month', now())) as leads_mes_atual;
