-- Adiciona campos de conciliação bancária em company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS saldo_inicial        numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_inicial_data   date          DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS saldo_banco_real      numeric(14,2),
  ADD COLUMN IF NOT EXISTS saldo_banco_data      date;
