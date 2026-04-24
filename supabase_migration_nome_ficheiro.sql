-- Executar no Supabase Dashboard → SQL Editor
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS nome_ficheiro TEXT;
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS centro_custo_nome TEXT;
-- Actualizar registos existentes com nome_ficheiro baseado em dados actuais
UPDATE despesas SET nome_ficheiro =
  CONCAT(
    REPLACE(data_despesa::text, '-', ''),
    '_',
    COALESCE((SELECT code FROM obras WHERE id = centro_custo_id), 'GERAL'),
    '_',
    LEFT(REGEXP_REPLACE(COALESCE(fornecedor, 'DESC'), '[^a-zA-Z0-9]', '', 'g'), 20),
    '_',
    LEFT(REGEXP_REPLACE(COALESCE(numero_fatura, ''), '[^a-zA-Z0-9]', '', 'g'), 20)
  )
WHERE nome_ficheiro IS NULL;
