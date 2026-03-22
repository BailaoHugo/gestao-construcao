# TOConline — RPA (Playwright) MVP

Automação de browser para fluxos **sem API pública** (ex.: anexos no separador «Anexos», leitura de texto no ecrã). A **API** continua documentada em [docs/toconline-verificacao-api.md](../../docs/toconline-verificacao-api.md).

## Limitações honestas (DOM)

| Área | Nota |
|------|------|
| Login | Seletores em [selectors.example.mjs](./selectors.example.mjs) — ajustar ao teu `app*.toconline.pt`. |
| Contabilidade | Tab vs link; pode ser preciso `getByRole` ou outro fallback. |
| Download | Ícones sem texto estável — iterar no seletor. |
| Obra / centro | Texto pode estar noutra célula ou label — refinar `obraOrCentro`. |

Planeia **1–2 iterações** com o DOM real (DevTools / Playwright Inspector: `HEADLESS=false npx playwright codegen …`).

## Pré-requisitos

```bash
npm install
npx playwright install chromium
```

## Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `TOCONLINE_APP_BASE_URL` | sim | Ex.: `https://app17.toconline.pt` |
| `TOCONLINE_WEB_USER` | sim | Utilizador web (não confundir com API) |
| `TOCONLINE_WEB_PASSWORD` | sim | Palavra-passe |
| `TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE` | sim | URL do detalhe do documento com `{id}` (copiar da barra de endereço) |
| `MAX_DOCS` ou `--max-docs=N` | não | Por defeito **5** |
| `TOCONLINE_RPA_DOC_IDS` | não* | IDs separados por vírgula (ignora API) |
| `TOCONLINE_API_URL` + `TOCONLINE_ACCESS_TOKEN` | não* | Para obter IDs automaticamente (mesmo padrão que `toconline:verify`) |
| `HEADLESS` | não | `false` para ver o browser |
| `TOCONLINE_POSTMAN_FILE` | não | Igual ao script API — carrega token se usares Postman export |

\* Precisas de **ou** `TOCONLINE_RPA_DOC_IDS` **ou** API com token para obter lista de IDs.

Saída local (não commitada): `tmp/toconline-rpa/downloads/`, `logs/`, `screenshots/`.

## Correr

```bash
export TOCONLINE_APP_BASE_URL="https://app17.toconline.pt"
export TOCONLINE_WEB_USER="..."
export TOCONLINE_WEB_PASSWORD="..."
export TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE="https://app17.toconline.pt/SEU_CAMINHO/{id}"
export TOCONLINE_API_URL="https://api17.toconline.pt"
export TOCONLINE_ACCESS_TOKEN="..."
MAX_DOCS=5 npm run toconline:rpa
```

Checklist: login → download (se seletor acertar) → ficheiro de log JSONL → campo `obraText` quando aplicável. Ver [docs/toconline-rpa-mvp.md](../../docs/toconline-rpa-mvp.md).

## Roadmap v2 (não implementado neste MVP)

- Paginação na listagem (ou só API + browser no detalhe).
- Múltiplos anexos por documento e deduplicação (`docId` + índice ou hash).
- Contabilidade com mais fallbacks de seletor.
- Screenshots de erro sistemáticos + `storageState` para reutilizar sessão (`tmp/toconline-rpa/sessions/`).
