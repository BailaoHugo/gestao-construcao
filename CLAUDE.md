# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint

# TOConline integration
npm run toconline:rpa              # Playwright RPA for invoice downloads
npm run toconline:verify           # Verify TOConline API
npm run toconline:organize-by-obra # Organize invoices by obra
npm run toconline:extract:batch    # Batch extract invoices
npm run toconline:canonical:etl    # Run canonical ETL pipeline
```

There is no test runner configured.

## Architecture

### Stack
- **Next.js 16** (App Router) + React 19 + TypeScript
- **PostgreSQL** via `pg` (direct SQL, no ORM) hosted on Supabase
- **OpenAI** for AI-assisted budget line generation
- **Playwright** for RPA automation (TOConline invoice downloads)
- **Tailwind CSS v4**, `react-data-grid` for tables

### Single Source of Truth: `artigos` table
All modules (catalog, proposals, AI, imports) read from the `artigos` table. Proposal lines are **snapshots** — they do not automatically create catalog articles. New articles must go through catalog validation at `/catalogo`.

Article codes are auto-generated via `GET /api/catalogo/proximo-codigo?capitulo=E5` → format `CAPITULO.NNNN` (e.g., `E5.0004`).

### Domain modules
- **`/catalogo`** — Article catalog management (`/api/catalogo/*`)
- **`/propostas`** — Proposals with revisioning; each revision is immutable, edits create new revisions
- **`/orcamentos`** — Budget module (`/api/orcamentos/*`)
- **`/obras`** — Construction works and expense tracking (`/api/obras/*`)
- **`/api/ia/orcamento`** — OpenAI-powered budget line generation

### Proposal data model
```
propostas (header: client, work, code)
  └── proposta_revisoes (R1, R2, … — state: RASCUNHO | EMITIDA)
        └── proposta_linhas (line items: article, qty, prices, costs)
```

### 8-column line format
Every budget/proposal line must have exactly 8 columns:
1. CAPÍTULO
2. LISTAGEM DE TRABALHOS
3. UN.
4. QTD.
5. UNITÁRIO VENDA
6. TOTAL VENDA
7. UNITÁRIO CUSTO
8. TOTAL CUSTO

The parser at `src/lib/propostas/parseImportedLines.ts` accepts TAB, `|`, `;`, or 2+ spaces as delimiters. The AI endpoint must return lines in this format (semicolon-delimited, no header).

### Database
- Migrations in `supabase/migrations/` — apply via Supabase CLI
- DB connection and transaction helper: `src/lib/db.ts` (`withTransaction<T>()`)
- Connection uses `DATABASE_URL` env var with Supabase SSL

### Key source locations
- `src/propostas/domain.ts` — TypeScript interfaces for proposal domain
- `src/propostas/db.ts` — All proposal DB queries
- `src/components/propostas/LinhasEditor.tsx` — Main proposal line editor
- `src/lib/propostas/parseImportedLines.ts` — Line import parser
- `scripts/toconline-rpa/mvp.mjs` — Playwright RPA script

## Rules

- Make small, safe changes. Avoid large refactors.
- Never break existing proposals or alter schema without necessity.
- Supabase is the sole source of truth; do not introduce local state that bypasses it.
- AI must query the catalog before suggesting new articles.
- Always respect the 8-column line format.

## Environment variables

Required in `.env.local`:
```
DATABASE_URL=          # Supabase PostgreSQL connection string
OPENAI_API_KEY=        # OpenAI key for AI budget generation
```

TOConline integration (optional, needed for RPA/ETL scripts) — see `secrets/toconline.env`.
