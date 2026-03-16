# ARQUITETURA DO PROJETO

Fonte única de verdade:
Supabase / PostgreSQL
Tabela principal: artigos

Módulos principais:
Catálogo
Propostas
IA para geração de orçamento
Planeamento
Controlo de custos

Regras arquiteturais:
propostas não substituem catálogo
catálogo é oficial
linhas de proposta são snapshot
evitar duplicados no catálogo

Estado atual do catálogo:

GET /api/catalogo
POST /api/catalogo
GET /api/catalogo/capitulos
GET /api/catalogo/proximo-codigo
PATCH /api/catalogo/[id]

Página:
/catalogo

Funcionalidades atuais:

listagem
filtros
criação de artigos
código automático
ativar / inativar

