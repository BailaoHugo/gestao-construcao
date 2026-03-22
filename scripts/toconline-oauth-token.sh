#!/usr/bin/env bash
# POST /token — troca authorization_code por access_token.
# Documentação TOConline (passo 2.2): body só com grant_type, code, scope (sem redirect_uri).
# Uso: bash scripts/toconline-oauth-token.sh "CODIGO_DO_REDIRECT"
# Requer: TOCONLINE_OAUTH_URL, TOCONLINE_CLIENT_ID, TOCONLINE_CLIENT_SECRET
#
# Opcional: TOCONLINE_INCLUDE_REDIRECT_URI_IN_TOKEN=1 — adiciona redirect_uri ao body
# (alguns servidores OAuth exigem; a doc TOConline não mostra este parâmetro no /token).

set -euo pipefail

CODE="${1:-}"
if [[ -z "$CODE" ]]; then
  echo "Uso: $0 \"CODIGO_OAUTH\"" >&2
  echo "O código vem do ?code=... no URL após abrir o link de scripts/toconline-oauth-auth-url.sh" >&2
  exit 1
fi

OAUTH_URL="${TOCONLINE_OAUTH_URL:-}"
CLIENT_ID="${TOCONLINE_CLIENT_ID:-}"
CLIENT_SECRET="${TOCONLINE_CLIENT_SECRET:-}"
REDIRECT_URI="${TOCONLINE_REDIRECT_URI:-http://localhost:8080/callback}"
INCLUDE_REDIRECT="${TOCONLINE_INCLUDE_REDIRECT_URI_IN_TOKEN:-0}"

if [[ -z "$OAUTH_URL" || -z "$CLIENT_ID" || -z "$CLIENT_SECRET" ]]; then
  echo "Define: TOCONLINE_OAUTH_URL, TOCONLINE_CLIENT_ID, TOCONLINE_CLIENT_SECRET" >&2
  exit 1
fi

OAUTH_URL="${OAUTH_URL%/}"

export CLIENT_ID CLIENT_SECRET
export CODE
export REDIRECT_URI
export INCLUDE_REDIRECT
BASIC=$(python3 -c "import os, base64; u = os.environ['CLIENT_ID'] + ':' + os.environ['CLIENT_SECRET']; print(base64.b64encode(u.encode()).decode())")

BODY=$(python3 <<'PY'
import os, urllib.parse
data = {
    "grant_type": "authorization_code",
    "code": os.environ["CODE"],
    "scope": "commercial",
}
if os.environ.get("INCLUDE_REDIRECT") == "1":
    data["redirect_uri"] = os.environ["REDIRECT_URI"]
print(urllib.parse.urlencode(data))
PY
)

curl -sS -X POST "${OAUTH_URL}/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -H "Authorization: Basic ${BASIC}" \
  --data-binary "${BODY}"
echo ""
