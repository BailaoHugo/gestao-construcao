# TASK — MÓDULO CATÁLOGO / ARTIGOS

## Descrição da tarefa atual

Evoluir o módulo **Catálogo** para suportar criação e gestão leve de artigos de obra, respeitando o princípio de **fonte única de verdade** na tabela `artigos`.

O foco imediato é:

- criar artigos novos a partir da página `/catalogo`
- sugerir códigos automaticamente por capítulo
- ativar / inativar artigos diretamente na grelha
- preparar o terreno para futura edição completa de artigos

## Contexto (a partir de `@ai/context.md`)

- **Frontend**: Next.js (App Router) + React + TypeScript  
- **Backend**: Next.js API Routes  
- **Base de dados**: Supabase (PostgreSQL)  
- **Tabela principal**: `artigos` (fonte única de verdade para catálogo, propostas, IA e importações)  
- **Princípio chave**: propostas **não** são o catálogo; linhas de proposta são um **snapshot** do momento.

## Ficheiros relevantes

- Página catálogo:
  - `src/app/catalogo/page.tsx`
- Endpoints já existentes:
  - `GET /api/catalogo`
  - `POST /api/catalogo`
  - `GET /api/catalogo/capitulos`
  - `GET /api/catalogo/proximo-codigo`
  - `PATCH /api/catalogo/[id]`
- Contexto de IA (para futuras integrações com artigos):
  - `src/app/api/ia/orcamento/route.ts`

## Backend existente (não alterar sem necessidade)

- `POST /api/catalogo`  
  Criação de artigo na tabela `artigos`.

- `PATCH /api/catalogo/[id]`  
  Atualiza apenas o campo `ativo` de um artigo.

- `GET /api/catalogo/capitulos`  
  Devolve grandes capítulos e capítulos autorizados (com código e descrição).

- `GET /api/catalogo/proximo-codigo?capitulo=E5`  
  Sugere o próximo código disponível dentro de um capítulo, no formato `E5.00NN`.

## Regras de implementação

- **Alterações pequenas e seguras**
  - trabalhar em passos incrementais
  - testar sempre `/catalogo` após cada mudança

- **Não refatorizar sem necessidade**
  - não mover ficheiros
  - não mudar arquitetura global da página
  - reutilizar `fetchCatalogo()` sempre que for preciso refrescar a lista

- **Não alterar schema**
  - nenhuma migration nova para esta tarefa
  - trabalhar apenas com colunas já existentes em `artigos`

- **Respeitar o princípio de fonte única de verdade**
  - toda a criação/edição de artigos deve passar por `artigos`
  - não replicar catálogo noutras tabelas

## Sub-tarefas atuais

1. **Criar artigo via modal em `/catalogo`**
   - Formulário no modal “Novo artigo” já existente.
   - Usar `GET /api/catalogo/capitulos` para popular selects de grande capítulo e capítulo.
   - Usar `GET /api/catalogo/proximo-codigo` para preencher automaticamente o campo `codigo`.
   - Enviar `POST /api/catalogo` com payload limpo (trim, nulls onde apropriado).
   - Em sucesso:
     - fechar modal
     - limpar formulário
     - chamar `fetchCatalogo()` para atualizar a listagem.

2. **Ativar / inativar artigos na grelha**
   - Coluna “Ativo” deve mostrar estado (`Sim`/`Não`) e botão “Ativar”/“Inativar”.
   - Botão chama `PATCH /api/catalogo/[id]` com `{ ativo: !atual }`.
   - Desativar botão enquanto o pedido está em curso.
   - Em sucesso, reutilizar `fetchCatalogo()` para refrescar.

3. **Preparar edição futura**
   - Manter o código do modal organizado para, mais tarde, reutilizar campos para edição.
   - Não implementar ainda `PUT /api/catalogo/[id]` nem edição completa.

## Resultado esperado

- Página `/catalogo` permite:
  - ver a lista de artigos filtrável
  - criar **novos** artigos no catálogo através do modal “Novo artigo”
  - ativar/inativar artigos diretamente na grelha
- Nenhuma proposta é afetada diretamente; continuam a ser snapshot das linhas no momento da criação/edição.


