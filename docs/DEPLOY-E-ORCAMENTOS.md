# Deploy e orçamentos (registo até 2026-03-06)

## Resumo

- A app está em produção na **Vercel** (ex.: `gestao2026.vercel.app`).
- Os orçamentos são guardados na **Supabase** (PostgreSQL).
- Podes criar, gravar, listar e abrir orçamentos a partir de **qualquer browser** e dispositivo, usando o mesmo URL.

## Configuração na Vercel

1. **Variável de ambiente**
   - Nome: `DATABASE_URL`
   - Valor: connection string do Supabase (ver abaixo).
   - Definir para: **Production**, **Preview** e **Development** se quiseres que a lista e o detalhe funcionem também em preview.

2. **Connection string do Supabase**
   - No Supabase: **Settings** → **Database** → **Connection string**.
   - Usar o modo **Transaction pooler** (recomendado para serverless), não "Direct connection".
   - Formato típico: `postgresql://postgres.[ref]:[PASSWORD]@aws-0-XX.pooler.supabase.com:6543/postgres`
   - Copiar e colar em `DATABASE_URL` na Vercel. Qualquer alteração à variável exige **Redeploy**.

## Base de dados (Supabase)

- Tabelas: `budgets` (cabeçalho + meta) e `budget_items` (linhas), com relação por `budget_id`.
- Tabela **`custom_articles`**: artigos criados pelo utilizador em "Novo orçamento" quando marca "Adicionar também ao catálogo". Para criar a tabela, executar o SQL em `supabase/migrations/20260304000000_create_custom_articles.sql` no Supabase (SQL Editor).
- O código usa apenas `process.env.DATABASE_URL` (ficheiro `src/lib/db.ts`).

## Correções feitas (resumo técnico)

- **ENOTFOUND** ao gravar: trocar para connection string do **Transaction pooler** e garantir que `DATABASE_URL` é do projeto Supabase correto (gestao-construcao).
- **Validação e DNS**: na API `POST /api/orcamentos` passamos a validar `DATABASE_URL` e a fazer `dns.lookup` do host antes de ligar à BD; em falha devolve 503 com mensagem clara.
- **Lista vazia**: páginas "Orçamentos guardados" e detalhe `/orcamentos/[id]` com `dynamic = "force-dynamic"` e `revalidate = 0` para não servirem cache antigo; log quando há fallback para ficheiros.
- **404 ao clicar "Abrir"**: em Next.js 16 o `params` da página dinâmica é uma `Promise`; na página `/orcamentos/[id]` passamos a fazer `const { id } = await params` antes de carregar o orçamento.

## Onde está o código relevante

| Função | Ficheiro |
|--------|----------|
| Ligação à BD (Pool, SSL para Supabase) | `src/lib/db.ts` |
| Gravar orçamento (POST) | `src/app/api/orcamentos/route.ts` |
| Lista de orçamentos guardados | `src/app/orcamentos/guardados/page.tsx` |
| Detalhe de um orçamento | `src/app/orcamentos/[id]/page.tsx` |
| Artigos custom (GET/POST) | `src/app/api/artigos/route.ts` |
| Form "Novo artigo" e catálogo merge | `src/orcamentos/OrcamentoBuilder.tsx` |

## Checklist: verificar na Vercel e no Supabase

**Vercel** (Dashboard do projeto → Settings → Environment Variables):

| Variável       | O que verificar |
|----------------|------------------|
| `DATABASE_URL` | Existe e está definida para **Production** (e Preview se usares previews). Valor = connection string do Supabase (Transaction pooler, porta 6543). Após alterar, fazer **Redeploy**. |

**Supabase** (Dashboard do projeto):

1. **Settings → Database → Connection string**  
   Copiar a URI em modo **Transaction pooler** (host `*.pooler.supabase.com`, porta **6543**) para colar na Vercel em `DATABASE_URL`.

2. **SQL Editor**  
   Garantir que as migrações foram executadas:
   - `supabase/migrations/20260304000000_create_custom_articles.sql` (tabela `custom_articles`)
   - Tabelas `budgets` e `budget_items` (criação inicial do projeto)
   - `supabase/migrations/20260306120000_add_status_to_budgets.sql` (coluna `status` em `budgets`)

3. **Table Editor**  
   Opcional: confirmar que a tabela `budgets` tem a coluna `status` (tipo text, default `EM_EXECUCAO`).

Se os orçamentos gravados não aparecerem na lista: a lista usa apenas a BD quando `DATABASE_URL` está definido; se a ligação falhar, aparece um aviso amarelo em vez de dados antigos. Verificar a variável na Vercel e o Redeploy.

## Fallback para ficheiros (VM / sem internet)

Em ambiente sem acesso ao Supabase (ex.: VM sem saída), a lista e o detalhe tentam primeiro a BD e, em caso de erro, usam os ficheiros em `data/orcamentos/saved/` (e subpastas). Na Vercel não há ficheiros, portanto a app depende sempre da BD.

---

*Documento criado para registar o estado do deploy e orçamentos até à data indicada.*
