-- Tabela para conciliação bancária por mês
CREATE TABLE IF NOT EXISTS public.conciliacao_bancaria (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes          date NOT NULL UNIQUE, -- sempre o 1º dia do mês (ex: 2026-07-01)
  saldo_banco  numeric(14,2),        -- saldo informado pelo usuário (extrato)
  observacoes  text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.conciliacao_bancaria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conciliacao: acesso total autenticado"
  ON public.conciliacao_bancaria FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
