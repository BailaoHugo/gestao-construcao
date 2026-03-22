# TOConline — Diagnóstico: PDF do documento vs anexos (separador «Anexos»)

Documento de apoio à decisão técnica. **Não** substitui a documentação oficial nem o suporte TOConline.

## O que está coberto pela API (evidência no projeto + OpenAPI 1.0.0)

- **OAuth** (`scope` comercial) + pedidos com `Authorization: Bearer …`
- **Listagem / detalhe** de documentos de compra (`/api/v1/commercial_purchases_documents/`, variantes legado)
- **Linhas** (`/api/commercial_purchases_document_lines`, …)
- **Categorias de despesa** (`/api/expense_categories`, `/api/expense_categories/{id}`) para contexto contabilístico
- **PDF oficial do documento de compra** (não confundir com ficheiros do separador «Anexos»):
  - `GET /api/url_for_print/{id}?filter[type]=PurchasesDocument`
  - Resposta com `data.attributes.url` (`scheme`, `host`, `port`, `path`); o download do binário costuma ser via path tipo `/public-file/…`
  - Testes no repo: `npm run toconline:verify` (HEAD a URLs de download pode devolver 405; usar GET / Range conforme script)

## O que **não** está documentado como API pública

- **Listagem ou download** dos ficheiros do separador **«Anexos»** do documento (PDF/JPG fornecedor, etc.).
- O OpenAPI publicado (SwaggerHub `toconline.pt/toc-online_open_api` **1.0.0**) **não** inclui recursos nomeados para esses anexos.

Interpretação rigorosa: **não há API *oficial* para anexos da gaveta «Anexos»** com base na documentação analisada. Uma rota interna usada só pela UI **pode** existir, mas seria **não suportada**, instável e sujeita a alterações.

## Comportamento observado na interface (DevTools)

- Ficheiros podem ser pedidos com **nome opaco** e **initiator** no bundle JS (ex. `vendor.js`), com **sessão/cookies**.
- Isto indica fluxo **orientado ao browser**, não um link público reutilizável estável.

## Consequências para integração

| Necessidade | Abordagem típica |
|-------------|-------------------|
| Dados + PDF oficial do documento | **API** (token Bearer) |
| Ficheiros do separador **Anexos** | **Não coberto** pela API pública analisada → **suporte TOConline** (pergunta explícita por endpoint) ou **automação de browser (RPA)** com consciência de manutenção, ToS e autenticação |

## Riscos da automação de browser

- Alterações de UI e de rotas internas
- Sessão, expiração e possíveis 2FA
- Conformidade com termos de uso da plataforma

## Referências no repositório

- `docs/toconline-verificacao-api.md` — como correr `toconline:verify`
- `docs/toconline-rpa-mvp.md` — automação de browser (MVP) quando a API não expõe anexos da UI
- `scripts/toconline-verify.mjs` — testes mínimos API
- `docs/toconline-oauth-curl.md` — OAuth

---

*Última actualização: diagnóstico consolidado com testes reais na VM e revisão do OpenAPI 1.0.0.*
