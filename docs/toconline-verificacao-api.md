# Verificação da API TOConline (documentos de compra e anexos)

Este documento descreve como **correr os testes mínimos** no teu ambiente, com **credenciais reais** (não versionadas).

## Pré-requisitos

1. Acesso de **Empresário** ao TOConline.
2. Credenciais API: **Empresa → Configurações → Dados API** (conforme [documentação](https://api-docs.toconline.pt/)).
3. Valores recebidos por email (ou Postman importado):
   - `OAUTH_URL`
   - `API_URL` (base da API comercial)
   - `client_id` / `client_secret`

### Mapeamento a partir do painel «Dados API»

No ecrã da empresa vês três URLs (o **número** do host, ex. `17`, depende da instância):

| Campo no painel | Variável no script / shell |
|-----------------|----------------------------|
| **Endereço de acesso à API** (ex.: `https://api17.toconline.pt`) | `TOCONLINE_API_URL` |
| **Endereço de autenticação por OAuth** (ex.: `https://app17.toconline.pt/oauth`) | `TOCONLINE_OAUTH_URL` (só necessário para trocar `TOCONLINE_AUTH_CODE` por token) |
| **Endereço URI de redirect** (ex.: `http://localhost:8080/callback`) | Deve coincidir com o que usas no pedido OAuth / Postman (não é variável do nosso script) |

**Exemplo** alinhado ao painel (substitui `17` se o teu for outro):

```bash
export TOCONLINE_API_URL="https://api17.toconline.pt"
export TOCONLINE_OAUTH_URL="https://app17.toconline.pt/oauth"
```

Os pedidos à API ficam assim: `https://api17.toconline.pt/api/v1/...` (o script junta `/api/...` ao `TOCONLINE_API_URL`).

## Obter o `access_token` (recomendado: Postman)

A doc oficial descreve o fluxo OAuth (GET `/auth` com redirect, depois POST `/token`). O ficheiro Postman do TOConline costuma gerir isto.

1. Importa o collection Postman enviado pelo TOConline.
2. Completa o fluxo de autorização no browser (redirect para `code`).
3. Copia o **access_token** da resposta do `/token`.

**Alternativa manual:** segue [Autenticação simplificada](https://api-docs.toconline.pt/autenticacao-simplificada) (curl com `redirect_uri` local).

## Correr o script de verificação no repositório

### Opção A — Export Postman (recomendado)

1. No Postman, exporta o **Environment** usado pelo collection TOConline (JSON).
2. Grava como `secrets/toconline-postman.json` na raiz deste repositório (a pasta `secrets/` está no `.gitignore`).
3. Garante que o ambiente tem pelo menos o **access_token** (e idealmente a **base URL** da API). Nomes reconhecidos: `access_token`, `token`, `base_url`, `api_url`, `oauth_url`, etc. (ver `scripts/toconline-load-postman-env.mjs`).
4. Na raiz:

```bash
npm run toconline:verify
```

Ou aponta para o ficheiro onde estiver o teu `Postman.json`:

```bash
export TOCONLINE_POSTMAN_FILE="/caminho/absoluto/Postman.json"
npm run toconline:verify
```

### Opção B — Variáveis na shell

Na raiz do projeto:

```bash
# «Endereço de acesso à API» do painel (ex.: api17.toconline.pt)
export TOCONLINE_API_URL="https://api17.toconline.pt"
# Token Bearer real (OAuth/Postman). Não use o texto literal "<token>".
export TOCONLINE_ACCESS_TOKEN="cole_o_access_token_aqui"

npm run toconline:verify
```

Ou **sem** token guardado — troca um código OAuth pontual (válido pouco tempo). O `redirect_uri` usado no browser tem de ser o registado (ex.: `http://localhost:8080/callback`):

```bash
export TOCONLINE_API_URL="https://api17.toconline.pt"
export TOCONLINE_OAUTH_URL="https://app17.toconline.pt/oauth"
export TOCONLINE_CLIENT_ID="..."
export TOCONLINE_CLIENT_SECRET="..."
# Código da query string após login: ?code=...
export TOCONLINE_AUTH_CODE="cole_o_code_aqui"

npm run toconline:verify
```

### O que o script testa

| # | Ação |
|---|------|
| 1 | `GET /api/v1/commercial_purchases_documents/` (e variante sem `/` se 404) |
| 2 | `GET /api/commercial_purchases_documents` (legado) |
| 3 | `GET` detalhe do primeiro documento (`/api/v1/...` e `/api/...`) |
| 4 | `GET /api/commercial_purchases_document_lines?page[size]=10` |
| 5 | `GET /api/url_for_print/{id}?filter[type]=PurchasesDocument` + `HEAD` na URL `public-file` devolvida |
| 6 | `GET` lista com `page[size]=2` |

Procura **heuristicamente** chaves no JSON com nomes parecidos a obra / centro de custo / analítica / anexo / ficheiro (não substitui análise humana do JSON).

### Saída

- Consola: resumo `[OK]` / `[FAIL]` por pedido.
- Ficheiros JSON em `tmp/toconline-verify/` (estão no `.gitignore` — **não commits** com dados reais).

### Partilhar só a estrutura (sem valores sensíveis)

Após `npm run toconline:verify`, na VM:

```bash
npm run toconline:inspect-json
```

Isto lê `tmp/toconline-verify/01-list-v1.json` e imprime chaves e tipos; strings/números aparecem como `<string>` / `<number>`. Para todos os `.json` da pasta:

```bash
npm run toconline:inspect-json -- --all
```

Para um ficheiro concreto:

```bash
npm run toconline:inspect-json -- tmp/toconline-verify/03-detail-123.json
```

## Interpretação

- **401/403:** token inválido, expirado ou scope incorreto.
- **PDF:** se o passo `url_for_print` falhar, verifica se o documento está **finalizado** (`status = 1` na documentação do PDF de compra).
- **Anexos:** o script **não prova** que a API lista anexos — apenas procura nomes de campos. Se não aparecer nada, confirma no JSON bruto ou pergunta ao suporte TOConline se existe endpoint não documentado.

## Ver também

- [Diagnóstico: PDF do documento vs anexos (separador «Anexos»)](./toconline-anexos-diagnostico.md)
- [RPA Playwright (MVP): login, downloads, logs](./toconline-rpa-mvp.md) — `npm run toconline:rpa`

## Referências oficiais

- [Introdução API](https://api-docs.toconline.pt/)
- [Documentos de compra (v1)](https://api-docs.toconline.pt/apis/compras/documentos-de-compra)
- [Descarregar PDF compra](https://api-docs.toconline.pt/apis/compras/descarregar-pdf-de-documentos-de-compra)
- [Características dos pedidos (paginação / filtros)](https://api-docs.toconline.pt/caracteristicas-dos-pedidos)
