# TOConline RPA — MVP (validação)

Alinhado a [scripts/toconline-rpa/mvp.mjs](../scripts/toconline-rpa/mvp.mjs). **Seletores DOM:** 1–2 iterações típicas.

## Ordem de testes recomendada

1. **Fase 1 — um documento manual** (`TOCONLINE_RPA_DOC_IDS=3059`, `MAX_DOCS=1`, **sem API**): login → URL do documento → separador **Anexos** → download. Sucesso mínimo = ficheiro em `tmp/toconline-rpa/downloads/` + evento `download` capturado.
2. **Fase 2 — 3 a 5 IDs manuais**: JSONL, screenshots só em falha; notar se há mais do que um anexo por documento (v2).
3. **Fase 3 — obra**: afinar Contabilidade / `obraText`; `resolvedWork` pode ser `SEM_OBRA_IDENTIFICADA` sem falhar o run.

## URL do documento

Se não definires `TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE`, o script usa por defeito:

`{TOCONLINE_APP_BASE_URL}/rus/purchases/documents/{id}/edit`

(ex.: `https://app17.toconline.pt/rus/purchases/documents/{id}/edit`).

## Checklist fase 1

| # | Critério |
|---|----------|
| 1 | Ficheiro descarregado em `downloads/` |
| 2 | Linha JSONL com `downloadStatus` e `savedPath` |
| 3 | Screenshot **apenas** se falhar login/download/sessão |
| 4 | `resolvedWork` = texto da obra **ou** `SEM_OBRA_IDENTIFICADA` |

## Campos JSONL (por documento)

`docId`, `url`, `supplier`, `date`, `number`, `obraText`, `resolvedWork`, `downloadStatus` (`downloaded` \| `failed`), `savedPath`, `error`, `screenshotPath`.

## Download (1.ª corrida)

- Botão: `scrollIntoViewIfNeeded` + visível antes do clique.
- Fallbacks de rótulo: «Download ficheiro» → «Download ficheiro JPEG» → seletores CSS.
- Timeout do evento `download`: **150s** por defeito (`TOCONLINE_RPA_DOWNLOAD_TIMEOUT_MS` para ajustar).

## Limitações honestas

| Ponto | Nota |
|-------|------|
| Login | Ajustar em `selectors.example.mjs` |
| Anexos | Tab + botão de download — prioridade sobre Contabilidade |
| Obra | Best-effort na Contabilidade **depois** do download — não bloqueia |
| Sessão suspensa / inatividade | Deteção por texto/URL → erro explícito + screenshot (sem re-login automático no MVP) |

## Timeouts

Valores em `TIMEOUTS` dentro de `mvp.mjs` (login, `goto`, Anexos, clique download, `waitForEvent("download")`).

## Relação com a API

- Dados / PDF oficial: [toconline-verificacao-api.md](./toconline-verificacao-api.md).
- Anexos da UI: [toconline-anexos-diagnostico.md](./toconline-anexos-diagnostico.md).

## Versão 2

Ver [scripts/toconline-rpa/README.md](../scripts/toconline-rpa/README.md#roadmap-v2).
