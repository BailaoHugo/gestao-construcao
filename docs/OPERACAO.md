# OPERAÇÃO — Gestão Construção

## Objetivo
Este documento define o workflow operacional do projeto para desenvolvimento, base de dados, scripts, deploy e troubleshooting.

A regra principal é simples:

- **Cursor** = desenvolvimento
- **VM** = execução técnica
- **Supabase** = base de dados
- **Vercel** = produção

Nunca misturar tudo ao mesmo tempo.

---

## Stack do projeto

- **Frontend / App**: Next.js (App Router)
- **Runtime**: Node.js
- **Base de dados**: Supabase Postgres
- **Cliente DB**: `pg`
- **Deploy**: Vercel
- **Scripts técnicos**: executados na VM
- **Repositório**: GitHub

---

## Ambientes de trabalho

### 1. Cursor
Usar para:
- criar e editar código
- criar componentes
- alterar páginas
- preparar migrations
- rever diffs
- gerar prompts e instruções técnicas

Não usar como fonte de validação final de produção.

---

### 2. VM
Usar para:
- correr scripts
- correr comandos Git
- carregar `.env.local`
- validar imports
- executar comandos Node
- preparar e validar antes do deploy

Exemplos:
```bash
node scripts/import_artigos_master_to_artigos.mjs
git status
git pull --rebase origin main
git push origin main
