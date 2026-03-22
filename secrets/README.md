# Credenciais locais (não versionadas)

Queres **tudo só na VM** (nada no PC)? Ver **`docs/toconline-vm-apenas.md`**.

---


### Formato certo (JSON)

O ficheiro tem de ser **JSON válido**, como o Postman exporta:

1. Postman → **Environments** → no ambiente **TOConline** → **⋯** → **Export** → **Export as JSON** (não copies da vista geral em texto).
2. Grava como `toconline-postman.json` aqui.

Se vires erro `Unexpected token` ao correr `npm run toconline:verify`, o ficheiro não era JSON — exporta outra vez ou edita para ter `{ "name": "...", "values": [ ... ] }`.

---

Coloca aqui o export Postman **sem** fazer commit:

1. No Postman: **Environments** → escolhe o ambiente TOConline → **Export** → grava como JSON.
2. Copia o ficheiro para:

   `secrets/toconline-postman.json`

3. Na raiz do projeto:

   ```bash
   npm run toconline:verify
   ```

O script lê automaticamente este ficheiro se existir (ou usa `TOCONLINE_POSTMAN_FILE` para outro caminho).

Variáveis reconhecidas no JSON (nomes comuns):

- `access_token` / `token` → `TOCONLINE_ACCESS_TOKEN`
- `base_url` / `api_url` → `TOCONLINE_API_URL`
- `oauth_url` → `TOCONLINE_OAUTH_URL`
- `client_id`, `client_secret`

Valores do tipo `{{variavel}}` não são aplicados (resolve no Postman antes de exportar ou define no ambiente).
