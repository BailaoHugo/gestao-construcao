# TOConline — tudo na VM (nada no PC local)

Objetivo: **repositório, `secrets/`, Postman export e `npm run toconline:verify`** correrem **apenas** na máquina virtual (VM), sem depender de ficheiros no teu computador.

## 1. Código na VM

- Faz **clone** / **pull** do repo na VM (SSH ou Git no servidor).
- Trabalha no projeto **só** nesse caminho (ex.: `/home/bailan/gestao-construcao`).

## 2. Credenciais só na VM

**Não** commits `secrets/*.json` nem tokens — já estão no `.gitignore`.

Na VM, cria o ficheiro (um dos métodos):

### A) Copiar da VM para a VM (se já tens o JSON noutro sítio no servidor)

```bash
mkdir -p ~/gestao-construcao/secrets
nano ~/gestao-construcao/secrets/toconline-postman.json
# Cola o conteúdo do Postman Environment (export JSON), guarda e sai.
```

### B) Enviar **uma vez** do teu PC para a VM (scp)

Isto só usa o PC como canal de ficheiro; depois podes apagar a cópia local.

```bash
# No teu PC (exemplo):
scp "/caminho/TOConline.postman_environment.json" usuario@IP_DA_VM:~/gestao-construcao/secrets/toconline-postman.json
```

Depois na VM:

```bash
chmod 600 ~/gestao-construcao/secrets/toconline-postman.json
```

### C) Variáveis de ambiente na VM (sem ficheiro Postman)

Na VM, no `~/.bashrc` ou num script **privado** (não no repo):

```bash
export TOCONLINE_API_URL="https://api17.toconline.pt"
export TOCONLINE_ACCESS_TOKEN="..."
```

Ou um ficheiro `~/gestao-construcao/secrets/toconline.env` (também ignorado se adicionares ao `.gitignore` — opcional).

## 3. Instalar Node/npm na VM (se ainda não existir)

Na raiz do projeto na VM:

```bash
cd ~/gestao-construcao
npm install
```

## 4. Correr a verificação **só na VM**

```bash
cd ~/gestao-construcao
npm run toconline:verify
```

## 5. Postman

- **Opcional na VM:** podes instalar Postman **dentro da VM** (Linux) se quiseres a UI lá; não é obrigatório — basta o JSON do environment ou as variáveis `export`.
- Se **não** quiseres Postman em lado nenhum: OAuth só com terminal — **`docs/toconline-oauth-curl.md`** (scripts `toconline-oauth-auth-url.sh` e `toconline-oauth-token.sh`).

## 6. Cursor / VS Code

Se editas o projeto por **SSH Remote** para a VM, estás a trabalhar **só na VM**; o PC só mostra o ecrã — os ficheiros continuam no servidor.

---

**Resumo:** coloca `secrets/toconline-postman.json` **na VM**, corre `npm run toconline:verify` **na VM**, e não guardes tokens no repositório git.
