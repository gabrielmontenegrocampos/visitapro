-- =============================================
-- VISITAPRO CRM — PARTE 2: RLS, TRIGGERS, FUNÇÃO DE PERFIL
-- Execute DEPOIS da Parte 1
-- =============================================

-- Função auto updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger set_updated_at_profiles before update on public.profiles
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at_leads before update on public.leads
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at_proposals before update on public.proposals
  for each row execute function public.handle_updated_at();

create or replace trigger set_updated_at_visits before update on public.visits
  for each row execute function public.handle_updated_at();

-- Função para criar perfil ao registrar novo usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger no auth.users (requer permissão de superuser — funciona no Supabase)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- RLS — Habilitar em todas as tabelas
-- =============================================

alter table public.profiles        enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.leads           enable row level security;
alter table public.proposals       enable row level security;
alter table public.proposal_items  enable row level security;
alter table public.visits          enable row level security;
alter table public.activities      enable row level security;
alter table public.messages        enable row level security;

-- Profiles: qualquer usuário logado pode ver, só o próprio pode editar
create policy "profiles_select" on public.profiles for select using (auth.uid() is not null);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);

-- Pipeline stages: leitura pública para usuários logados
create policy "stages_select" on public.pipeline_stages for select using (auth.uid() is not null);

-- Leads: admin vê tudo; vendedor vê/cria os seus
create policy "leads_admin_all" on public.leads for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "leads_vendedor_select" on public.leads for select
  using (assigned_to = auth.uid());
create policy "leads_vendedor_insert" on public.leads for insert
  with check (auth.uid() is not null);
create policy "leads_vendedor_update" on public.leads for update
  using (assigned_to = auth.uid());

-- Proposals, visits, activities, messages: acesso total para usuários logados
create policy "proposals_all"      on public.proposals      for all using (auth.uid() is not null);
create policy "items_all"          on public.proposal_items for all using (auth.uid() is not null);
create policy "visits_all"         on public.visits         for all using (auth.uid() is not null);
create policy "activities_all"     on public.activities     for all using (auth.uid() is not null);
create policy "messages_all"       on public.messages       for all using (auth.uid() is not null);
