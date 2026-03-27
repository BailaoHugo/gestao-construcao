# TOConline -> Custos por Obra (Runbook)

Guia para correr a ingestao incremental de custos e validar no modulo Obras sem risco.

## 1) Preparar base de dados

Aplicar migracoes (inclui `toconline_costs_staging`):

```bash
cd /home/bailan/gestao-construcao
# usa o teu fluxo habitual de migracoes supabase no projeto
```

## 2) Preparar dados de entrada

Esperado:

- CSV do ZIP oficial exportado em `tmp/toconline-ad-test/extracted/*.csv`
- indice API em `tmp/toconline-ad-test/index_from_api.csv`

Se necessario, gerar indice API como no fluxo validado anteriormente.

## 3) Organizar ficheiros por obra (sem BD)

```bash
cd /home/bailan/gestao-construcao
npm run toconline:organize-by-obra
```

Saidas:

- `tmp/toconline-ad-test/organized-by-obra/` (pastas por obra)
- `tmp/toconline-ad-test/organized-by-obra/index_final.csv`

## 4) Upsert incremental para staging (BD)

```bash
cd /home/bailan/gestao-construcao
npm run toconline:organize-by-obra:db
```

Notas:

- idempotencia por `source_key` (hash de doc + ficheiro)
- sem match confiavel fica `SEM_OBRA`

## 5) Validar API read-only

```bash
curl -s "http://localhost:3000/api/obras/despesas?limit=20" | jq .
curl -s "http://localhost:3000/api/obras/despesas?obra=Estoril&includeSemObra=0&limit=20" | jq .
curl -s "http://localhost:3000/api/obras/despesas?dateFrom=2026-01-01&dateTo=2026-01-31&limit=20" | jq .
```

## 6) Validar no frontend

Abrir:

- `/obras/despesas`

Conferir:

- filtros por obra/fornecedor/periodo
- totais agregados
- linhas `SEM_OBRA` visiveis quando checkbox ativo

## 7) Checklist de regressao

- `npm run toconline:organize-by-obra` continua a copiar ficheiros por obra
- `index_final.csv` continua a ser gerado
- endpoint `/api/obras/despesas` responde sem erro
- pagina `/obras/despesas` carrega e lista dados
