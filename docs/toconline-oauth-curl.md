# TOConline — OAuth só com terminal (curl)

Usa **Identificador**, **Segredo**, **OAuth URL**, **API URL** e **Redirect URI** do painel **Empresa → Dados API**.

## 1. Definir variáveis na VM (sem gravar em ficheiro no repo)

Na shell (ajusta os valores aos **teus**; o redirect tem de ser **igual** ao do painel):

```bash
export TOCONLINE_OAUTH_URL="https://app17.toconline.pt/oauth"
export TOCONLINE_CLIENT_ID="COLA_O_IDENTIFICADOR"
export TOCONLINE_CLIENT_SECRET="COLA_O_SEGREDO"
export TOCONLINE_REDIRECT_URI="http://localhost:8080/callback"
export TOCONLINE_API_URL="https://api17.toconline.pt"
```

> Os hosts `app17` / `api17` são exemplos; usa os que o **teu** painel mostra.

## 2. Obter o URL de autorização e abrir no browser

```bash
cd ~/gestao-construcao
npm run toconline:oauth-url
# ou: bash scripts/toconline-oauth-auth-url.sh
```

O script imprime um **URL longo**. Copia-o e abre no **browser** (pode ser noutra máquina se o redirect for `localhost` — vê nota abaixo).

Faz login na conta TOConline se pedir.

## 3. Copiar o `code` do redirect

Depois do login, o browser vai para o **redirect URI** com algo como:

`http://localhost:8080/callback?code=XXXXXX&...`

Copia só o valor de **`code`** (sem o `&` seguinte).

### Se usas `localhost` na VM sem browser

- **Opção A:** faz o passo do browser **no teu PC** com o mesmo redirect `http://localhost:8080/callback` — o browser mostra o `code` na barra de endereço (o servidor de callback não precisa de estar a correr; só precisas **copiar o URL** da barra).
- **Opção B:** altera no painel TOConline o redirect para um URL que consigas abrir (ex. um domínio teu) e actualiza `TOCONLINE_REDIRECT_URI`.

## 4. Trocar o código por `access_token`

A **documentação oficial** do passo 2.2 envia no `/token` apenas `grant_type`, `code` e `scope` (sem `redirect_uri`). O script segue isso por defeito.

```bash
npm run toconline:oauth-token -- "COLA_O_CODE_AQUI"
```

Se o teu servidor exigir `redirect_uri` no body (erro estranho), tenta:

```bash
export TOCONLINE_INCLUDE_REDIRECT_URI_IN_TOKEN=1
export TOCONLINE_REDIRECT_URI="http://localhost:8080/callback"
npm run toconline:oauth-token -- "COLA_O_CODE_AQUI"
```

### Redirect no `/auth` — tem de bater certo com o painel

No [passo 1 da doc detalhada](https://api-docs.toconline.pt/autenticacao-detalhada), o redirect **pré-definido** para Postman é **`https://oauth.pstmn.io/v1/callback`**. Se no painel **Dados API** tiveres **outro** endereço (ex.: `http://localhost:8080/callback`), o URL de autorização **tem de usar esse mesmo** (`npm run toconline:oauth-url` com `TOCONLINE_REDIRECT_URI` igual). Se abrires um `/auth` com um redirect e o painel tiver outro, o `code` pode não servir no `/token`.

A resposta é JSON com `access_token`, `expires_in`, `refresh_token`.

Copia o `access_token` e usa:

```bash
export TOCONLINE_ACCESS_TOKEN="cole_o_access_token"
cd ~/gestao-construcao && npm run toconline:verify
```

Ou grava no `secrets/toconline-postman.json` no campo `access_token` (ficheiro JSON válido).

## Referência rápida (manual, sem scripts)

**Auth (abre no browser):**

`GET {OAUTH_URL}/auth?client_id=...&redirect_uri=...&response_type=code&scope=commercial`

(`redirect_uri` tem de estar **URL-encoded**.)

**Token:**

```bash
# BASIC = base64("client_id:client_secret") sem newline
curl -sS -X POST "${TOCONLINE_OAUTH_URL}/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -H "Authorization: Basic $(echo -n "${TOCONLINE_CLIENT_ID}:${TOCONLINE_CLIENT_SECRET}" | base64 -w0)" \
  -d "grant_type=authorization_code&code=O_CODE&scope=commercial&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fcallback"
```

(`redirect_uri` no body do `/token` deve ser o **mesmo** que no `/auth`.)

## Erros comuns

| Problema | Causa provável |
|----------|----------------|
| `unauthorized_client` | Quase sempre **Identificador** ou **Segredo** errados (espaço a mais, aspas, email antigo). Confirma no painel **Empresa → Dados API**. Garante que o `code` foi obtido com o **mesmo** `redirect_uri` registado (Postman: `https://oauth.pstmn.io/v1/callback` vs `localhost` — têm de ser consistentes). |
| `invalid_grant` | Código já usado ou expirado — gera **novo** `code` (novo login) |
| Redirect mismatch | `redirect_uri` no URL de `/auth` diferente do registado no painel |
| `401` na API | Token expirado — novo OAuth |
