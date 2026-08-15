-- Adiciona campo accepted_at para rastrear quando a proposta foi aceita
-- Isso evita distorção nos relatórios mensais: uma proposta criada em março
-- e aceita em agosto deve aparecer em agosto, não em março.

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Backfill: propostas já aceitas recebem updated_at como aproximação
UPDATE proposals
SET accepted_at = updated_at
WHERE status = 'aceita' AND accepted_at IS NULL;
