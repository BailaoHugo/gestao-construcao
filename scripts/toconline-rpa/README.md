# TOConline — RPA (Playwright) MVP

Automação de browser para **anexos** e leitura opcional de **obra** (sem API pública de anexos). A **API** de dados/PDF continua em [docs/toconline-verificacao-api.md](../../docs/toconline-verificacao-api.md).

## Exportar Arquivo Digital (oficial TOConline) vs este RPA

O **Centro de Ajuda** descreve outro fluxo — **export em lote por período** (não é o mesmo que abrir documento a documento e descarregar anexos):

| | Exportar Arquivo Digital (UI) | Este script (RPA) |
|---|--------------------------------|-------------------|
| **Menu** | **Empresa** → **Importação e Exportação** → **Exportar Arquivo Digital** | Documentos de compras → separador **Anexos** por ID |
| **Período** | Diálogo **«Seleccione Ano e Mês»**; opção **Utilizar Exercício Fiscal** + ano fiscal | Filtros / lista de IDs que definires |
| **Processo** | Assíncrono em **segundo plano**; quando termina aparece no **sino** (notificações) | Síncrono por documento (evento `download`) |
| **Ficheiro** | **.zip** com o arquivo digital (link **«Download Arquivo»** na notificação / janela final) | Um ficheiro por anexo em `tmp/toconline-rpa/downloads/` |

Para **arquivo contabilístico / fiscal por mês**, o caminho oficial costuma ser este export + ZIP. Para **integrar anexos ao teu pipeline** (nomes, obra, logs JSONL), usa este RPA ou a API onde existir.

## Estrutura de saída (`tmp/toconline-rpa/` — gitignored)

```
tmp/toconline-rpa/
  downloads/     # ficheiros descarregados (naming: docId_fornecedor_data_numero.ext)
  logs/          # JSONL por dia
  screenshots/   # só em erro ou falha de download / sessão
  sessions/      # reservado para v2 (storageState)
```

## Ordem recomendada de testes

| Fase | IDs | Objetivo |
|------|-----|----------|
| **1** | `TOCONLINE_RPA_DOC_IDS=3059` e `MAX_DOCS=1` | Login → documento → **Anexos** → download (sem API) |
| **2** | 3–5 IDs manuais | JSONL, screenshots em falha, verificar >1 anexo por doc (v2) |
| **3** | Depois | Afinar Contabilidade / `obraText` / `resolvedWork` |

**Critério mínimo de sucesso:** evento `download` do Playwright + ficheiro em `downloads/`. Obra pode ficar `SEM_OBRA_IDENTIFICADA` sem falhar o run.

## Limitações honestas (DOM)

| Área | Nota |
|------|------|
| Login | [selectors.example.mjs](./selectors.example.mjs) |
| Anexos | Tab + «Download ficheiro» — ajustar seletores |
| Contabilidade / obra | Best-effort; **não bloqueia** o download |
| Sessão suspensa | Mensagens de inatividade → erro claro + screenshot (sem re-login automático neste MVP) |

## Pré-requisitos

```bash
npm install
npx playwright install chromium
```

### Linux / VM: `libnspr4.so` em falta (Chromium não arranca)

Se aparecer `error while loading shared libraries: libnspr4.so` ou `Target page, context or browser has been closed` logo após o launch, a VM **não tem as dependências de sistema** do Chrome. Instala **uma vez** (requer `sudo`):

```bash
cd ~/gestao-construcao   # raiz do repo
sudo env "PATH=$PATH" npx playwright install-deps chromium
```

**`sudo: npx: command not found`?** O `sudo` usa um `PATH` mínimo e não encontra o Node instalado via **nvm**, **fnm** ou pacote user. Usa **sempre** `sudo env "PATH=$PATH" …` como acima, ou caminho absoluto:

```bash
sudo "$(command -v npx)" playwright install-deps chromium
# ou, na raiz do repo:
sudo env "PATH=$PATH" ./node_modules/.bin/playwright install-deps chromium
```

Confirma depois:

```bash
npx playwright install chromium
MAX_DOCS=1 HEADLESS=false npm run toconline:rpa
```

Em servidores **sem display**, usa `HEADLESS=true` (defeito); `HEADLESS=false` só faz sentido com X11 / VNC / ambiente gráfico.

## Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `TOCONLINE_APP_BASE_URL` | sim | Ex.: `https://app17.toconline.pt` |
| `TOCONLINE_WEB_USER` / `TOCONLINE_WEB_PASSWORD` | sim | Credenciais **web** |
| `TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE` | não | Se omitido, usa `{APP}/rus/purchases/documents/{id}/edit` |
| `TOCONLINE_RPA_DOC_IDS` | recomendado | IDs separados por vírgula (**preferir** no 1.º teste em vez da API) |
| `MAX_DOCS` / `--max-docs=N` | não | Limite ao conjunto de IDs (defeito **5**) |
| `TOCONLINE_API_URL` + `TOCONLINE_ACCESS_TOKEN` | opcional | Lista de IDs via API (só depois de validar manual) |
| `HEADLESS` | não | `false` para ver o browser |
| `TOCONLINE_RPA_DOWNLOAD_TIMEOUT_MS` | não | Tempo máximo a esperar pelo evento `download` (defeito **150000** ms — PDFs lentos) |
| `TOCONLINE_RPA_POST_DOC_LOAD_MS` | não | Milissegundos **extra** após `networkidle` no ecrã do documento (ex. **3000** se os separadores demorarem) |

## Timeouts (ms)

Definidos em `mvp.mjs` (`TIMEOUTS`): login, `goto` documento, abrir separador Anexos, clique download, etc. O **evento `download`** usa **150s** por defeito (15s costuma ser curto no TOConline); sobrescreve com `TOCONLINE_RPA_DOWNLOAD_TIMEOUT_MS`.

Antes do clique no download: `scrollIntoViewIfNeeded()` + `waitFor({ state: "visible" })`. Botão: texto «Download ficheiro», fallback «Download ficheiro JPEG», depois seletores em `selectors.example.mjs`.

## Erro de bash ao colar comandos

Se aparecer `bash: [mvp]: command not found` ou `syntax error near unexpected token`, não colaste **só** o comando: colaste também linhas de output ou o **prompt** (`bailan@…$`). Cola uma linha de cada vez ou usa um ficheiro `.sh`.

## Correr — exemplo fase 1 (1 documento, sem API)

```bash
export TOCONLINE_APP_BASE_URL="https://app17.toconline.pt"
export TOCONLINE_WEB_USER="..."
export TOCONLINE_WEB_PASSWORD="..."
# Opcional: força o caminho explícito
export TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE="https://app17.toconline.pt/rus/purchases/documents/{id}/edit"

export TOCONLINE_RPA_DOC_IDS="3059"
MAX_DOCS=1 HEADLESS=false npm run toconline:rpa
```

## Log JSONL (campos por documento)

Cada linha inclui: `docId`, `url`, `supplier`, `date`, `number`, `obraText`, `resolvedWork` (`SEM_OBRA_IDENTIFICADA` se vazio), `downloadStatus` (`downloaded` \| `failed`), `savedPath`, `error`, `screenshotPath`.

## «Separador Anexos não abriu» / download falhou

O Playwright **não** vê o que está **dentro de iframes** com `page.locator`. O MVP já percorre **todos os frames** para «Anexos» e para o botão de download. Se ainda falhar:

1. Corre de novo e lê a linha **`[debug …]`** no terminal (URL de cada iframe + contagem `Anexos#=`).
2. Aumenta espera da SPA: `TOCONLINE_RPA_POST_DOC_LOAD_MS=4000 npm run toconline:rpa`
3. Ajusta [selectors.example.mjs](./selectors.example.mjs) (`anexosTab`) ao texto real do separador.
4. Screenshot `tmp/toconline-rpa/screenshots/download-fail-*.png` — confirma URL/estado do documento e `TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE`.

### `body_len=0` / `innerLen=0` no `[debug …]`

O **body** ainda está vazio (bundle SPA não hidratou a tempo ou bloqueio em headless). O script já usa `goto` com **`load`** e espera até 90s por conteúdo. Se persistir:

- Tenta **`xvfb-run -a npm run toconline:rpa`** (simula display; na VM já tens `xvfb` via `install-deps`).
- Ou aumenta `TOCONLINE_RPA_POST_DOC_LOAD_MS` (ex. `8000`).

## Roadmap v2

- Paginação, múltiplos anexos, deduplicação, `storageState` em `sessions/`, re-login opcional.
