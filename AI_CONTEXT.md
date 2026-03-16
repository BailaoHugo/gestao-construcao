# AI CONTEXT — GESTAO CONSTRUÇÃO

Este ficheiro descreve a arquitetura e regras principais do software de gestão de construção.

Objetivo: permitir que assistentes de IA compreendam rapidamente o sistema sem contexto adicional.

---

# STACK

Frontend
- Next.js
- React
- TypeScript

Backend
- Next.js API Routes

Base de dados
- Supabase (PostgreSQL)

Deploy
- Vercel

---

# PRINCÍPIO ARQUITETURAL

Existe **uma única fonte de verdade** para artigos de obra:

Tabela:

artigos

Todos os módulos utilizam esta tabela.

- catálogo
- propostas
- IA
- importações

As propostas **não são o catálogo**.

As linhas de proposta são um snapshot do momento.

---

# TABELA PRINCIPAL

artigos

Campos principais:

id  
codigo  
descricao  
unidade  
grande_capitulo  
capitulo  
pu_custo  
pu_venda  
ativo  
origem  
created_at  
updated_at  

---

# CATÁLOGO

Página:

/catalogo

Objetivo:

gestão oficial de artigos.

Funcionalidades atuais ou previstas:

- consultar artigos
- criar artigo
- editar artigo
- ativar / inativar artigo

Regra importante:

O código do artigo **não é escrito manualmente**.

É sugerido automaticamente pela API:

GET /api/catalogo/proximo-codigo

Formato do código:

CAPITULO.NNNN

Exemplo:

E5.0001  
E5.0002  

---

# APIs DO CATÁLOGO

Pesquisa de artigos:

GET /api/catalogo/search?q=

Características:

- pesquisa por codigo
- pesquisa por descricao
- sem acentos
- máximo 10 resultados

---

Lista de capítulos autorizados:

GET /api/catalogo/capitulos

Devolve:

grandes_capitulos  
capitulos

Evita criação de capítulos inválidos.

---

Próximo código de artigo:

GET /api/catalogo/proximo-codigo?capitulo=E5

Resposta exemplo:

{
  "codigo": "E5.0004"
}

Lógica:

- procurar maior código existente
- incrementar número
- formatar com 4 dígitos

---

# PROPOSTAS

Páginas:

/propostas/nova  
/propostas/[id]

Editor principal:

LinhasEditor.tsx

---

# FORMATO DAS LINHAS DE ORÇAMENTO

Todas as linhas devem ter **8 colunas**.

Formato obrigatório:

CAPÍTULO  
LISTAGEM DE TRABALHOS  
UN.  
QTD.  
UNITÁRIO VENDA  
TOTAL VENDA  
UNITÁRIO CUSTO  
TOTAL CUSTO  

---

# IMPORTAÇÃO DE LINHAS

Parser:

src/lib/propostas/parseImportedLines.ts

Separadores suportados:

TAB  
|  
;  
2 ou mais espaços

Validações:

- exactamente 8 colunas
- números normalizados
- cálculo automático de totais

---

# IA — GERAÇÃO DE LINHAS

Endpoint:

POST /api/ia/orcamento

Utiliza OpenAI.

A IA deve devolver linhas no formato:

CAPÍTULO;LISTAGEM;UN.;QTD.;UNITÁRIO VENDA;TOTAL VENDA;UNITÁRIO CUSTO;TOTAL CUSTO

Sem cabeçalho.

As linhas são depois processadas pelo parser.

---

# REGRAS IMPORTANTES DO PROJETO

Nunca quebrar propostas existentes.

Não alterar schema sem necessidade.

Supabase é a única fonte de verdade.

IA deve consultar catálogo antes de sugerir novos artigos.

Linhas criadas em propostas **não devem automaticamente criar artigos no catálogo**.

Artigos novos devem passar por validação no módulo catálogo.

---

# OBJETIVO FUTURO

Permitir que a IA:

1. consulte catálogo
2. reutilize artigos existentes
3. sugira novos artigos quando necessário
4. mantenha o catálogo consistente

---

# NOTA PARA IA

Ao modificar código neste projeto:

- evitar refatorizações grandes
- fazer alterações pequenas e seguras
- manter compatibilidade com propostas existentes
- respeitar o formato de 8 colunas nas linhas de orçamento
