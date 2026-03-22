# TOConline RPA — MVP (validação em 5 documentos)

Este documento alinha-se ao script em [scripts/toconline-rpa/mvp.mjs](../scripts/toconline-rpa/mvp.mjs). A arquitetura (Playwright + env + logs) está estável; **seletores DOM** podem precisar de 1–2 iterações no ambiente real.

## Checklist da primeira corrida (`MAX_DOCS=5`)

1. **Login** — após `npm run toconline:rpa`, o processo deve autenticar sem erro; em falha há screenshot em `tmp/toconline-rpa/screenshots/`.
2. **Download** — com seletores corretos, ficheiros aparecem em `tmp/toconline-rpa/downloads/` (nome `docId-filename`).
3. **Log** — linhas JSONL em `tmp/toconline-rpa/logs/run-YYYY-MM-DD.jsonl` (um evento por passo/documento).
4. **Obra / centro de custo** — campo `obraText` no log quando o seletor `obraOrCentro` acerta; caso contrário `null` (refinar em [selectors.example.mjs](../scripts/toconline-rpa/selectors.example.mjs)).

## Limitações honestas

| Ponto | Nota |
|-------|------|
| Login | Email/password/submit variam — ajustar constantes em `selectors.example.mjs`. |
| Separador Contabilidade | Tab vs link; o script tenta `getByRole('tab')` e depois CSS. |
| Botão de download | Pode ser ícone — iterar no seletor ou usar `codegen`. |
| Texto obra/centro | Pode não estar no primeiro match — inspecionar DOM e atualizar seletor. |

## Variáveis críticas

- **`TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE`** — deve incluir `{id}`; o caminho exacto copia-se da barra de endereço ao abrir um documento de compra na app web.
- **IDs** — `TOCONLINE_RPA_DOC_IDS` (manual) ou `TOCONLINE_API_URL` + `TOCONLINE_ACCESS_TOKEN` (lista até `MAX_DOCS`).

## Relação com a API

- Dados estruturados e PDF oficial: [toconline-verificacao-api.md](./toconline-verificacao-api.md).
- Anexos da UI vs API: [toconline-anexos-diagnostico.md](./toconline-anexos-diagnostico.md).

## Versão 2 (roadmap)

Não faz parte do MVP actual; planeamento em [scripts/toconline-rpa/README.md](../scripts/toconline-rpa/README.md#roadmap-v2-não-implementado-neste-mvp):

- Paginação / múltiplos anexos / deduplicação.
- Contabilidade com mais fallbacks.
- Screenshots de erro sistemáticos + reutilização de sessão (`storageState`).
