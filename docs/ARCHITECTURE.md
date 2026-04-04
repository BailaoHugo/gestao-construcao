# Arquitetura do Sistema — Gestão Construção
**Versão:** 2.0
**Data:** Abril 2026
**Estado:** Documento vivo — atualizar sempre que houver decisões arquiteturais relevantes

---

## 1. Contexto e Propósito

Software de gestão para empresa de **empreiteiro geral** em Portugal. Cobre o ciclo completo de uma obra: desde a angariação do cliente até ao encerramento financeiro. O TOConline mantém-se como sistema de contabilidade e emissão de faturas; esta aplicação é a fonte de verdade para tudo o resto.

---

## 2. Fluxo Principal de Negócio

```
Cliente → Proposta (com revisões) → Adjudicação → Contrato → Execução da Obra → Autos de Medição → Faturação (TOConline) → Relatório Final
```

Durante a execução da obra podem ocorrer **trabalhos a mais** e **trabalhos a menos**, que geram aditamentos ao contrato e afetam o valor faturável total.

---

## 3. Módulos do Sistema

### 3.1 Clientes
Entidade de referência simples. Criados e geridos nesta aplicação (importação inicial do TOConline).

**Campos:** nome, NIF, morada, telefone, email, notas
**Relações:** 1 cliente → N propostas → N contratos → N obras

---

### 3.2 Catálogo Ennova
**Um único catálogo unificado** baseado nos artigos CYPE Gerador de Preços Portugal (Obra Nova + Reabilitação), mas reorganizado segundo uma **estrutura de capítulos própria da Ennova**.

#### Origem dos dados
| Fonte CYPE | Artigos | Tipo |
|------------|---------|------|
| CYPE_Gerador_Precos_ObraNova_Portugal.csv | ~4.100 | `obra_nova` |
| CYPE_Gerador_Precos_Reabilitacao_Portugal.csv | ~4.600 | `reabilitacao` |

Os artigos CYPE são importados e remapeados para a hierarquia Ennova. O mapeamento é mantido numa tabela de correspondência (`cype_to_ennova_map`).

#### Estrutura de cada artigo
- `codigo` — código CYPE original (ex: `0XA110`)
- `descricao` — descrição do trabalho
- `capitulo_ennova` → `subcapitulo_ennova` — hierarquia Ennova a 2 níveis (substituiu a hierarquia CYPE)
- `categoria_cype` → `subcategoria_cype` → `seccao_cype` — hierarquia original CYPE (mantida para referência)
- `unidade` — unidade de medida (m², Ud, ml, kg, ...)
- `preco_custo` — preço de custo sugerido CYPE (€)
- `k_padrao` — coeficiente de venda padrão (default: **1,3**)
- `preco_venda_sugerido` = `preco_custo × k_padrao` (calculado)
- `tipo_catalogo` — `obra_nova` | `reabilitacao`

**Regra:** Os preços do catálogo são **sugestões**. Na proposta, custo e k são editáveis por artigo.

#### Capítulos Ennova
*(A definir em sessão dedicada — mapeamento das ~60 subcategorias CYPE para capítulos Ennova)*

---

### 3.3 Propostas
Documento comercial enviado ao cliente antes da adjudicação.

**Estados:** `rascunho` → `enviada` → `em_negociacao` → `adjudicada` | `rejeitada`

**Revisões:** Cada proposta tem N versões. Todas as versões são guardadas. A versão ativa é a mais recente, mas o histórico completo é acessível. Uma proposta adjudicada não pode ser editada — gera nova revisão ou aditamento.

**Estrutura:**
- Cabeçalho: cliente, obra, data, versão, notas, tipo (`obra_nova` | `reabilitacao`)
- Linhas: agrupadas por capítulos Ennova, cada linha tem:
  - artigo (do catálogo Ennova ou personalizado)
  - quantidade
  - unidade
  - custo unitário (editável, default do catálogo)
  - k (editável, default 1,3)
  - preço de venda unitário = custo × k
  - preço de venda total = preço unitário × quantidade
- Totais: subtotal por capítulo, total geral, margem prevista (€ e %)

**Margem prevista** = (preço venda total − custo total) / preço venda total

---

### 3.4 Contratos
Criado a partir da versão adjudicada de uma proposta.

**Campos adicionais:** data de início, prazo de execução, condições de pagamento, notas legais

**Valor do contrato:**
- `valor_base` — valor da proposta adjudicada (imutável)
- `valor_atual` = valor_base ± soma de aditamentos aprovados (nunca editável diretamente)

**Aditamentos (Trabalhos a Mais / Trabalhos a Menos):**
Cada aditamento representa uma alteração ao contrato original. Podem ocorrer durante a execução da obra.

Campos de um aditamento:
- tipo: `trabalho_a_mais` | `trabalho_a_menos`
- descrição
- artigos afetados (com quantidades e valores)
- valor total do aditamento (positivo para a mais, negativo para a menos)
- data de aprovação
- estado: `pendente` | `aprovado` | `rejeitado`

O histórico de aditamentos é mantido e o `valor_atual` do contrato reflete apenas os aditamentos aprovados.

---

### 3.5 Obras / Centros de Custo
Cada obra é um **centro de custo (CC)**. Criados e geridos nesta aplicação.

**Estados:** `ativo` | `concluido` | `suspenso` | `cancelado`

**Campos:** código CC, nome, cliente, data início, data fim prevista, descrição, estado

**Relações:**
- 1 obra → 1 contrato (opcional — pode existir obra sem proposta formal)
- 1 obra → N custos registados
- 1 obra → N autos de medição

---

### 3.6 Autos de Medição (Preparação de Faturação)
Preparados nesta aplicação, faturados no TOConline.

**Fluxo:**
1. Utilizador abre um auto de medição para uma obra
2. Por artigo, indica a **% de trabalho executado acumulada** até à data
3. O sistema calcula: valor a faturar neste auto = (% atual − % anteriores acumuladas) × valor contrato do artigo
4. Gera resumo do auto (PDF ou exportação) para emitir fatura no TOConline

**Regras:**
- A % acumulada por artigo nunca pode ultrapassar 100%
- O valor acumulado faturado nunca pode ultrapassar o `valor_atual` do contrato (base ± aditamentos aprovados)
- Cada auto fica registado com data, valores por artigo e estado

**Estados de um auto:** `em_preparacao` | `emitido`

---

### 3.7 Controlo de Obra (Custos Reais)
Registo de todos os custos incorridos por obra.

**Formas de entrada:**

1. **Scan de fatura** — leitura do QR Code (cabeçalho) + extração de texto/AI (linhas de artigos)
2. **Registo manual** — sem fatura associada
3. **Email para registardespesa@ennova.pt** — reencaminhamento de fatura por email com indicação do centro de custo no assunto ou no corpo do email

**Campos de um custo:**
- obra / centro de custo (obrigatório)
- fornecedor
- data
- tipo: `material` | `subempreitada` | `mao_de_obra` | `equipamento`
- descrição
- valor
- fatura associada (referência, ficheiro PDF)
- IVA

**Notificação automática TOConline:**
Sempre que é registado um custo com fatura, o sistema envia automaticamente um email para `515188166@my.toconline.pt` com:
- Assunto: código do centro de custo + número da fatura
- Corpo: detalhes do custo (fornecedor, data, valor, NIF)
- Anexo: PDF da fatura (quando disponível)

**Análise transversal:** Os custos têm dimensões analíticas além da obra — fornecedor, tipo, período. Deve ser possível analisar:
- Custos por obra (detalhe)
- Custos por fornecedor (histórico geral — não apenas por obra)
- Custos por tipo/categoria
- Custos por período (mês, trimestre, ano)

**Margem real por obra** = (valor faturado acumulado − custos reais acumulados) / valor faturado acumulado

---

### 3.8 Fornecedores
Base de dados de fornecedores e subempreiteiros (tratados da mesma forma).

**Campos:** nome, NIF, email, telefone, morada, tipo (`fornecedor` | `subempreiteiro` | `ambos`), ativo

**Nota:** subempreiteiros não têm contrato formal — são registados como fornecedores de serviço.

**Soft delete:** inativação em vez de eliminação (preserva histórico de custos associados).

---

### 3.9 Scan de Faturas
Ponto de entrada de custos com fatura.

**Abordagem híbrida (por ordem de fiabilidade):**
1. **QR Code** (obrigatório nas faturas portuguesas desde 2021) → extrai automaticamente:
   - NIF emitente, NIF adquirente
   - Data da fatura
   - Base tributável, IVA, total
   - Número de fatura
2. **Extração de texto + AI** → extrai linhas de artigos, descrições, quantidades (requer validação pelo utilizador)

**Fluxo:**
1. Upload do PDF
2. Leitura QR Code → preenche cabeçalho automaticamente (alta fiabilidade)
3. Extração de texto + AI → preenche linhas de artigos (para revisão)
4. Utilizador valida/corrige
5. Seleciona obra/CC
6. Confirma → cria registo de custo + notificação TOConline

**Email como alternativa:** o utilizador pode reencaminhar a fatura por email para registardespesa@ennova.pt indicando o CC no assunto ou corpo. O sistema processa o email, extrai o PDF em anexo e aplica o mesmo fluxo de scan.

---

### 3.10 Intake por Email (registardespesa@ennova.pt)
Canal alternativo de registo de custos.

**Tecnologia:** Postmark ou Mailgun (webhook de email entrada)

**Fluxo:**
1. Utilizador reencaminha fatura por email para registardespesa@ennova.pt
2. No assunto ou corpo do email indica o código do centro de custo
3. O webhook recebe o email e extrai: remetente, assunto, corpo, anexos PDF
4. O sistema identifica o CC a partir do texto
5. Aplica o fluxo de scan ao PDF em anexo (QR Code + AI)
6. Cria registo de custo em estado `pendente_validacao`
7. Notifica o utilizador (na app) para validar e confirmar

---

### 3.11 Dashboard (KPIs)
Página inicial com os indicadores mais importantes.

**Indicadores principais:**
- Obras em curso: quantas, valor total contratado, % faturado médio
- Alertas: obras com desvio de margem > X%
- Faturação do mês vs. mês anterior
- Custos registados no mês vs. mês anterior
- Margem média das obras ativas
- Top fornecedores por despesa acumulada (últimos 12 meses)

---

### 3.12 Relatório Final de Obra
Gerado quando uma obra é marcada como `concluida`.

**Conteúdo:**
- Resumo: cliente, datas, valor contratado vs. faturado
- Aditamentos: lista de trabalhos a mais/menos
- Margem prevista vs. margem real
- Desvio por capítulo/artigo
- Custos por tipo e por fornecedor
- Cronograma de autos de medição

---

## 4. Entidades Base e Relações

```
Cliente (1) ──────────────────────── (N) Proposta
Proposta (1) ──────────────────────── (N) PropostaVersao
PropostaVersao (N) ────────────────── (N) PropostaLinha [artigo, qty, custo, k]
PropostaVersao (1) ─────────────────── (0..1) Contrato
Contrato (1) ──────────────────────── (N) Aditamento
Contrato (1) ──────────────────────── (1) Obra
Obra (1) ───────────────────────────── (N) AutoMedicao
Obra (1) ───────────────────────────── (N) Custo
AutoMedicao (1) ────────────────────── (N) AutoMedicaoLinha [artigo, % executado]
Custo (N) ──────────────────────────── (1) Fornecedor
Custo (N) ──────────────────────────── (0..1) Fatura [PDF, QR Code data]
Fatura (0..1) ──────────────────────── (0..1) EmailIntake [remetente, assunto, CC detectado]
Artigo (N) ─────────────────────────── (1) CatalogoEnnova [capitulo, subcapitulo]
Artigo (N) ─────────────────────────── (1) FonteCYPE [categoria, subcategoria, seccao, tipo_catalogo]
```

---

## 5. Utilizadores e Permissões

| Papel | Permissões |
|-------|-----------|
| `gestor` | Leitura + escrita em todos os módulos. Vê margens, rentabilidade, KPIs globais. |
| `administrativo` | Apenas leitura. Não vê margens nem dados financeiros globais. |

*(A expandir no futuro com permissões por módulo e por obra)*

---

## 6. Integrações

### TOConline
- **Importação inicial:** extração do histórico existente (clientes, fornecedores, obras/CC) — operação única
- **Notificação automática:** sempre que é registado um custo com fatura, envio automático de email para `515188166@my.toconline.pt` com os dados do custo e PDF em anexo
- **Futuro:** integração em tempo real via API (a definir quando disponível)
- **Divisão de responsabilidades:**
  - TOConline: contabilidade, emissão de faturas, IRS/IRC
  - Esta app: comercial, orçamentação, controlo de obra, analytics

### CYPE Gerador de Preços
- Fonte dos artigos do Catálogo Ennova (Obra Nova + Reabilitação)
- Importação via CSV com remapeamento para estrutura Ennova
- Atualização manual quando houver nova versão CYPE

### Email (Postmark / Mailgun)
- **Inbound:** registardespesa@ennova.pt → webhook → processamento de faturas recebidas por email
- **Outbound:** notificações automáticas para TOConline (515188166@my.toconline.pt)

---

## 7. Regras de Negócio Críticas

1. **Imutabilidade de versões aprovadas** — uma proposta adjudicada não pode ser editada; gera nova versão ou aditamento ao contrato.
2. **Valor do contrato** = valor_base ± soma de aditamentos aprovados. Nunca editável diretamente.
3. **Faturação** não pode exceder o valor atual do contrato.
4. **% executada acumulada** por artigo nunca ultrapassa 100%.
5. **Custo unitário e k** são editáveis por artigo na proposta, mas o catálogo não é alterado.
6. **Soft delete** em fornecedores — inativação em vez de eliminação (preserva histórico).
7. **Obras** são centros de custo — toda a despesa deve estar associada a uma obra.
8. **Auditoria** — datas de criação e atualização em todas as entidades principais.
9. **Notificação TOConline** — qualquer custo com fatura gera envio automático para 515188166@my.toconline.pt.
10. **Email intake** — custos registados via email ficam em estado `pendente_validacao` até confirmação pelo utilizador.
11. **QR Code preferencial** — na leitura de faturas, o QR Code é a fonte primária de dados do cabeçalho (maior fiabilidade que OCR).
12. **Catálogo Ennova** — os artigos CYPE são remapeados para capítulos Ennova; o catálogo original CYPE é mantido como referência mas não exposto na UI.

---

## 8. O Que Existe vs. O Que Falta

### Existe (construído)
- Catálogo de artigos (estrutura simples — a migrar para Catálogo Ennova)
- Propostas com linhas e capítulos
- Contratos
- Obras / Centros de Custo (com campos completos: código, nome, cliente, datas, estado, descrição)
- Fornecedores (com CRUD completo, filtros, soft delete)
- Clientes
- Scan de faturas (extração texto + AI — melhorar com QR Code)
- Registo de custos por obra
- Faturação básica
- Dashboard com links para módulos principais

### Falta construir
- [ ] Catálogo Ennova (definição de capítulos + remapeamento CYPE + importação CSV)
- [ ] Revisões de proposta com histórico de versões
- [ ] Aditamentos ao contrato (trabalhos a mais/menos)
- [ ] Autos de medição (% por artigo, cálculo de valor a faturar, exportação)
- [ ] Leitura de QR Code nas faturas (complementar à extração AI existente)
- [ ] Email intake (registardespesa@ennova.pt via Postmark/Mailgun webhook)
- [ ] Notificação automática TOConline (envio email com fatura para 515188166@my.toconline.pt)
- [ ] Dashboard com KPIs
- [ ] Relatório final de obra
- [ ] Permissões por papel (gestor vs. administrativo)
- [ ] Análise transversal de custos (por fornecedor, tipo, período)
- [ ] Importação histórico TOConline

---

## 9. Stack Técnica

- **Frontend/Backend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Base de dados:** PostgreSQL via Supabase
- **Deploy:** Vercel
- **AI/Scan:** OpenAI API
- **Email inbound:** Postmark ou Mailgun (webhook)
- **Email outbound:** Postmark ou Mailgun (transacional)
- **Contabilidade:** TOConline (externo)
