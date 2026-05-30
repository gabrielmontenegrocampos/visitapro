-- ============================================================
-- VISITAPRO — MIGRAÇÃO 004
-- Módulos: Diário de Obra, Financeiro, Compras, Equipe
-- Cole no SQL Editor do Supabase e clique RUN
-- ============================================================

-- Extensão UUID (geralmente já ativa)
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
-- 1. PROJETOS DIÁRIO DE OBRA
-- ──────────────────────────────────────────────────────────────
create table if not exists public.projetos_diario (
  id             uuid default uuid_generate_v4() primary key,
  proposal_id    uuid references public.proposals(id) on delete set null,
  titulo_publico text,
  -- nome: coluna computed a partir do titulo_publico (usado em FK displays)
  nome           text not null default 'Projeto sem nome',
  public_token   text unique default encode(gen_random_bytes(16), 'hex'),
  ativo          boolean default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists idx_projetos_diario_proposal on public.projetos_diario(proposal_id);

-- ──────────────────────────────────────────────────────────────
-- 2. DIÁRIO DE OBRA (registros diários)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.diario_obras (
  id             uuid default uuid_generate_v4() primary key,
  projeto_id     uuid references public.projetos_diario(id) on delete cascade not null,
  data           date not null,
  status_obra    text default 'em_andamento' check (status_obra in ('em_andamento','pausado','concluido')),
  clima          text,
  temperatura    integer,
  atividades     text,
  observacoes    text,
  fotos          text[] default '{}',
  responsavel_id uuid references public.profiles(id) on delete set null,
  mao_obra       integer default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists idx_diario_obras_projeto on public.diario_obras(projeto_id);
create index if not exists idx_diario_obras_data on public.diario_obras(data desc);

-- ──────────────────────────────────────────────────────────────
-- 3. CATEGORIAS FINANCEIRAS
-- ──────────────────────────────────────────────────────────────
create table if not exists public.categorias_financeiras (
  id         uuid default uuid_generate_v4() primary key,
  nome       text not null,
  tipo       text not null check (tipo in ('receita','despesa')),
  divisao    text not null check (divisao in ('administracao','obra')),
  ativo      boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_cat_fin_tipo on public.categorias_financeiras(tipo);
create index if not exists idx_cat_fin_divisao on public.categorias_financeiras(divisao);

-- Categorias padrão
insert into public.categorias_financeiras (nome, tipo, divisao) values
  -- Administração — Receitas
  ('Honorários de projeto',     'receita', 'administracao'),
  ('Consultoria',               'receita', 'administracao'),
  ('Outras receitas',           'receita', 'administracao'),
  -- Administração — Despesas
  ('Aluguel',                   'despesa', 'administracao'),
  ('Salários e encargos',       'despesa', 'administracao'),
  ('Serviços de escritório',    'despesa', 'administracao'),
  ('Marketing e publicidade',   'despesa', 'administracao'),
  ('Impostos e taxas',          'despesa', 'administracao'),
  ('Software e assinaturas',    'despesa', 'administracao'),
  ('Outras despesas adm.',      'despesa', 'administracao'),
  -- Obra — Receitas
  ('Medição de obra',           'receita', 'obra'),
  ('Adiantamento de obra',      'receita', 'obra'),
  ('Sinal de contrato',         'receita', 'obra'),
  ('Outras receitas de obra',   'receita', 'obra'),
  -- Obra — Despesas
  ('Material de construção',    'despesa', 'obra'),
  ('Mão de obra',               'despesa', 'obra'),
  ('Aluguel de equipamentos',   'despesa', 'obra'),
  ('Subempreiteiro',            'despesa', 'obra'),
  ('Transporte e frete',        'despesa', 'obra'),
  ('Ferramentas e EPI',         'despesa', 'obra'),
  ('Outras despesas de obra',   'despesa', 'obra')
on conflict do nothing;

-- ──────────────────────────────────────────────────────────────
-- 4. LANÇAMENTOS FINANCEIROS
-- ──────────────────────────────────────────────────────────────
create table if not exists public.lancamentos_financeiros (
  id                    uuid default uuid_generate_v4() primary key,
  categoria_id          uuid references public.categorias_financeiras(id) on delete set null,
  tipo                  text not null check (tipo in ('receita','despesa')),
  divisao               text not null check (divisao in ('administracao','obra')),
  descricao             text not null,
  valor                 numeric(12,2) not null check (valor >= 0),
  data                  date not null,
  status                text not null default 'pendente' check (status in ('pendente','pago','cancelado')),
  projeto_id            uuid references public.projetos_diario(id) on delete set null,
  profissional_id       uuid references public.profiles(id) on delete set null,
  observacoes           text,
  recorrencia_grupo_id  uuid,
  recorrencia_mes       integer,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists idx_lanc_fin_data on public.lancamentos_financeiros(data desc);
create index if not exists idx_lanc_fin_tipo on public.lancamentos_financeiros(tipo);
create index if not exists idx_lanc_fin_status on public.lancamentos_financeiros(status);
create index if not exists idx_lanc_fin_projeto on public.lancamentos_financeiros(projeto_id);
create index if not exists idx_lanc_fin_recorr on public.lancamentos_financeiros(recorrencia_grupo_id) where recorrencia_grupo_id is not null;

-- ──────────────────────────────────────────────────────────────
-- 5. FORNECEDORES
-- ──────────────────────────────────────────────────────────────
create table if not exists public.fornecedores (
  id               uuid default uuid_generate_v4() primary key,
  nome             text not null,
  nome_fantasia    text,
  cnpj_cpf         text,
  categoria        text not null default 'material' check (categoria in ('material','equipamento','servico','subempreiteiro')),
  responsavel      text,
  telefone         text,
  email            text,
  site             text,
  cep              text,
  endereco         text,
  numero           text,
  complemento      text,
  bairro           text,
  cidade           text,
  estado           text,
  forma_pagamento  text,
  prazo_pagamento  text,
  pix              text,
  observacoes      text,
  ativo            boolean default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists idx_fornecedores_nome on public.fornecedores(nome);
create index if not exists idx_fornecedores_ativo on public.fornecedores(ativo);

-- ──────────────────────────────────────────────────────────────
-- 6. ORDENS DE COMPRA
-- ──────────────────────────────────────────────────────────────
create table if not exists public.ordens_compra (
  id                    uuid default uuid_generate_v4() primary key,
  fornecedor_id         uuid references public.fornecedores(id) on delete set null,
  projeto_id            uuid references public.projetos_diario(id) on delete set null,
  descricao             text not null,
  status                text not null default 'solicitado' check (status in ('solicitado','aprovado','recebido','cancelado')),
  data_pedido           date not null,
  data_entrega_prevista date,
  data_recebimento      date,
  forma_pagamento       text,
  observacoes           text,
  created_by            uuid references public.profiles(id) on delete set null,
  lancamento_id         uuid references public.lancamentos_financeiros(id) on delete set null,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists idx_ordens_compra_status on public.ordens_compra(status);
create index if not exists idx_ordens_compra_projeto on public.ordens_compra(projeto_id);
create index if not exists idx_ordens_compra_fornecedor on public.ordens_compra(fornecedor_id);

-- ──────────────────────────────────────────────────────────────
-- 7. ITENS DE ORDEM DE COMPRA
-- ──────────────────────────────────────────────────────────────
create table if not exists public.itens_ordem_compra (
  id              uuid default uuid_generate_v4() primary key,
  ordem_id        uuid references public.ordens_compra(id) on delete cascade not null,
  descricao       text not null,
  quantidade      numeric(12,3) not null default 1,
  unidade         text,
  valor_unitario  numeric(12,2) not null default 0,
  valor_total     numeric(12,2) generated always as (quantidade * valor_unitario) stored,
  created_at      timestamptz default now()
);

create index if not exists idx_itens_ordem on public.itens_ordem_compra(ordem_id);

-- ──────────────────────────────────────────────────────────────
-- 8. PROFISSIONAIS (equipe de campo)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.profissionais (
  id               uuid default uuid_generate_v4() primary key,
  nome             text not null,
  tipo             text not null default 'autonomo' check (tipo in ('clt','autonomo','terceirizado')),
  especialidade    text not null default '',
  cpf              text,
  rg               text,
  data_nascimento  date,
  telefone         text,
  email            text,
  cep              text,
  endereco         text,
  numero           text,
  complemento      text,
  bairro           text,
  cidade           text,
  estado           text,
  banco            text,
  agencia          text,
  conta            text,
  pix              text,
  salario_base     numeric(12,2),
  valor_diaria     numeric(12,2),
  foto_url         text,
  observacoes      text,
  ativo            boolean default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists idx_profissionais_nome on public.profissionais(nome);
create index if not exists idx_profissionais_ativo on public.profissionais(ativo);

-- ──────────────────────────────────────────────────────────────
-- 9. VÍNCULO PROFISSIONAL × OBRA
-- ──────────────────────────────────────────────────────────────
create table if not exists public.profissionais_obras (
  id               uuid default uuid_generate_v4() primary key,
  profissional_id  uuid references public.profissionais(id) on delete cascade not null,
  projeto_id       uuid references public.projetos_diario(id) on delete cascade not null,
  funcao           text,
  data_entrada     date not null,
  data_saida       date,
  created_at       timestamptz default now()
);

create index if not exists idx_prof_obras_prof on public.profissionais_obras(profissional_id);
create index if not exists idx_prof_obras_proj on public.profissionais_obras(projeto_id);

-- ──────────────────────────────────────────────────────────────
-- 10. RLS — desabilita por padrão (usa service role key)
-- ──────────────────────────────────────────────────────────────
alter table public.projetos_diario        disable row level security;
alter table public.diario_obras           disable row level security;
alter table public.categorias_financeiras disable row level security;
alter table public.lancamentos_financeiros disable row level security;
alter table public.fornecedores           disable row level security;
alter table public.ordens_compra          disable row level security;
alter table public.itens_ordem_compra     disable row level security;
alter table public.profissionais          disable row level security;
alter table public.profissionais_obras    disable row level security;
