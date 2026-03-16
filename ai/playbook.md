# AI PLAYBOOK — GESTAO CONSTRUÇÃO

Guia prático para assistentes de IA a trabalhar neste repositório.

---

## 1. O que ler ANTES de mexer em código

Ler **sempre**, por esta ordem:

- `ai/context.md`  
  - Stack (Next.js, React, TypeScript, Supabase/PostgreSQL, Vercel)  
  - Fonte única de verdade: tabela `artigos`  
  - Propostas **não** são catálogo; linhas de proposta são snapshot.
- `ai/architecture.md`  
  - Módulos (Catálogo, Propostas, IA, etc.)  
  - Endpoints existentes do catálogo.
- `ai/dev_rules.md`  
  - Regras de desenvolvimento e limites (alterações pequenas, sem schema, etc.).
- `ai/tasks.md`  
  - Tarefa atual, ficheiros e endpoints relevantes, resultado esperado.

Nunca executar mudanças significativas sem alinhar com estes ficheiros.

---

## 2. Estratégia geral de implementação

- **Passo 1 — Compreender a tarefa**
  - Ler `ai/tasks.md` e identificar:
    - ficheiros alvo
    - endpoints/backend envolvidos
    - restrições (ex.: “não alterar schema”, “não refatorizar página”).

- **Passo 2 — Localizar código relevante**
  - Para frontend:
    - abrir a página mencionada (ex.: `src/app/catalogo/page.tsx`).
  - Para backend:
    - abrir a rota indicada (ex.: `src/app/api/catalogo/route.ts`).

- **Passo 3 — Planear alterações pequenas**
  - Preferir **funções locais e estados adicionais** em vez de refatorizações grandes.
  - Seguir o padrão já existente na página / rota (mesmos hooks, mesmo estilo).

- **Passo 4 — Implementar incrementalmente**
  - Introduzir um estado ou função de cada vez.
  - Testar `/api/...` ou `/pagina` logo após cada bloco de alterações.

- **Passo 5 — Validar e resumir**
  - Correr `npm run build` se a alteração for relevante.
  - Confirmar que o fluxo descrito em `ai/tasks.md` funciona.

---

## 3. Regras para frontend (Next.js / React / TypeScript)

- **Arquitetura**
  - Usar componentes existentes sempre que possível (ex.: `LinhasEditor`).
  - Não mover ficheiros entre pastas sem tarefa explícita.

- **Estado e hooks**
  - Usar `useState`, `useEffect`, `useCallback`, `useMemo` de forma mínima e clara.
  - Agrupar `useState` relacionados perto uns dos outros.
  - Não introduzir bibliotecas de estado novas.

- **Estilo / UI**
  - Reutilizar classes Tailwind já presentes (bordas, espaçamentos, cores).
  - Manter a linguagem visual: cartões, cabeçalhos, tabelas com `bg-slate-*` e `border-slate-*`.
  - Para botões:
    - primário: `bg-slate-900 text-white hover:bg-slate-800`
    - secundário: `border border-slate-200 bg-white text-slate-700`

- **TypeScript**
  - Tipar props e estados (ex.: `type NovoArtigoForm`, `type Artigo`).
  - Evitar `any`; preferir tipos derivados dos existentes.

---

## 4. Regras para backend (API Routes Next.js)

- **Conexão à BD**
  - Usar sempre `pool` a partir de `@/lib/db`.
  - Nunca criar novas pools locais.

- **Validação e erros**
  - Validar `params` e `body`:
    - se faltar algo → `400` com `{ error: "..." }`.
  - Em erros inesperados:
    - `console.error("[api/...]", message);`
    - responder `500` com mensagem genérica.

- **Queries**
  - Usar `parameterized queries` (`$1`, `$2`, ...) para evitar SQL injection.
  - Reutilizar padrões existentes:
    - `select ... from artigos where ...`
    - `update ... returning ...`.

- **Schema**
  - **Nunca** alterar o schema da base de dados (`artigos` ou outras) sem tarefa explícita.
  - Não criar migrations novas a partir deste playbook.

---

## 5. Checklist mínimo de testes

Antes de considerar a tarefa concluída:

- **APIs**
  - Testar manualmente os endpoints relevantes, por exemplo:
    - `curl` ou browser: `GET /api/catalogo?...`
    - `POST /api/catalogo` com payload realista.
    - `PATCH /api/catalogo/[id]` para ativar/inativar.

- **Páginas**
  - Abrir a página afetada em `npm run dev` (ex.: `/catalogo`, `/propostas/nova`, `/propostas/[id]`).
  - Validar:
    - não há erros na consola do browser.
    - novo fluxo funciona (botões, modais, formulários).

- **Build**
  - Executar `npm run build` se:
    - mexeste em lógica de página/rotas relevantes, ou
    - tocaste em tipos partilhados.
  - Confirmar ausência de erros TypeScript.

---

## 6. Formato da resposta final do assistente

Sempre que completares uma tarefa, a resposta deve incluir, de forma concisa:

- **1. Ficheiros criados/alterados**
  - Lista em bullet points, ex.:
    - `src/app/catalogo/page.tsx`
    - `src/app/api/catalogo/[id]/route.ts`

- **2. Resumo objetivo**
  - 3–6 frases curtas a explicar:
    - que comportamento foi adicionado/mudado,
    - que endpoints/páginas foram afetados,
    - se agora há criação/edição/ativação real.

- **3. Instruções rápidas de teste local**
  - Passos concretos:
    - comando (`npm run dev`, `npm run build`),
    - URLs a visitar (`/catalogo`, `/propostas/nova`),
    - ações a executar (clicar em botões, preencher formulários).

- **4. Confirmações finais**
  - Indicar explicitamente:
    - se houve ou não alterações de schema / migrations,
    - se o backend existente foi respeitado,
    - se a lógica de propostas foi mantida (quando relevante).

Evitar respostas longas e teóricas; focar no que foi realmente implementado e em como o utilizador pode verificar. 
