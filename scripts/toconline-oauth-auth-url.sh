#!/usr/bin/env bash
# Imprime o URL GET para abrir no browser (fluxo OAuth TOConline).
# Requer: TOCONLINE_OAUTH_URL, TOCONLINE_CLIENT_ID
# Opcional: TOCONLINE_REDIRECT_URI (default http://localhost:8080/callback)

set -euo pipefail

OAUTH_URL="${TOCONLINE_OAUTH_URL:-}"
CLIENT_ID="${TOCONLINE_CLIENT_ID:-}"
REDIRECT_URI="${TOCONLINE_REDIRECT_URI:-http://localhost:8080/callback}"

if [[ -z "$OAUTH_URL" || -z "$CLIENT_ID" ]]; then
  echo "Define na shell:" >&2
  echo "  export TOCONLINE_OAUTH_URL=\"https://app17.toconline.pt/oauth\"" >&2
  echo "  export TOCONLINE_CLIENT_ID=\"...\"" >&2
  echo "  export TOCONLINE_REDIRECT_URI=\"http://localhost:8080/callback\"  # opcional" >&2
  exit 1
fi

OAUTH_URL="${OAUTH_URL%/}"

export REDIRECT_URI
ENC_REDIRECT=$(python3 -c "import urllib.parse, os; print(urllib.parse.quote(os.environ['REDIRECT_URI'], safe=''))")

AUTH_URL="${OAUTH_URL}/auth?client_id=${CLIENT_ID}&redirect_uri=${ENC_REDIRECT}&response_type=code&scope=commercial"

echo "Abre este URL no browser, faz login, e copia o valor de 'code' do endereço final:"
echo ""
echo "$AUTH_URL"
echo ""
