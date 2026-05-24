-- Diario de Obra migration
-- Execute no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qkfnyntngqmjrtgkxwpv/sql/new

CREATE TABLE IF NOT EXISTS projetos_diario (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id    uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  public_token   text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  titulo_publico text,
  ativo          boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diario_obras (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id          uuid NOT NULL REFERENCES projetos_diario(id) ON DELETE CASCADE,
  data                date NOT NULL DEFAULT CURRENT_DATE,
  clima               text DEFAULT 'ensolarado',
  status_obra         text DEFAULT 'em_andamento',
  responsavel         text,
  equipe              jsonb DEFAULT '[]'::jsonb,
  atividades          jsonb DEFAULT '[]'::jsonb,
  materiais           jsonb DEFAULT '[]'::jsonb,
  ocorrencias         text,
  notas_cliente       text,
  proximas_atividades text,
  fotos               jsonb DEFAULT '[]'::jsonb,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projetos_diario_proposal ON projetos_diario(proposal_id);
CREATE INDEX IF NOT EXISTS idx_diario_obras_projeto ON diario_obras(projeto_id);
CREATE INDEX IF NOT EXISTS idx_diario_obras_data ON diario_obras(data DESC);

ALTER TABLE projetos_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_obras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth full access projetos_diario"
  ON projetos_diario FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth full access diario_obras"
  ON diario_obras FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read active projetos"
  ON projetos_diario FOR SELECT TO anon USING (ativo = true);

CREATE POLICY "Public read diario_obras"
  ON diario_obras FOR SELECT TO anon USING (true);

NOTIFY pgrst, 'reload schema';
