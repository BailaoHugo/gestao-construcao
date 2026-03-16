# AI CONTEXT — GESTAO CONSTRUÇÃO

Este ficheiro descreve a arquitetura e regras principais do software de gestão de construção.

Objetivo: permitir que assistentes de IA compreendam rapidamente o sistema sem contexto adicional.

STACK

Frontend
Next.js
React
TypeScript

Backend
Next.js API Routes

Base de dados
Supabase (PostgreSQL)

Deploy
Vercel

PRINCÍPIO ARQUITETURAL

Existe uma única fonte de verdade para artigos de obra:

Tabela:
artigos

Todos os módulos utilizam esta tabela:
catálogo
propostas
IA
importações

As propostas não são o catálogo.

As linhas de proposta são um snapshot do momento.

AI assistants must NEVER modify the database schema without an explicit task.
All changes must be incremental and safe.

# IMPORTANT

Before modifying code:

1. read ai/context.md
2. read ai/architecture.md
3. follow ai/dev_rules.md
4. implement ai/tasks.md

Purpose:
Ensure any AI assistant working in this repository always reads the project context and rules before implementing tasks.


