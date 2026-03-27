/**
 * Seletores DOM — ajustar ao DOM real (1–2 iterações típicas).
 * Copia para selectors.mjs (gitignored) ou edita aqui com cuidado.
 *
 * Ordem recomendada de testes: Anexos + download primeiro; Contabilidade/obra depois.
 *
 * @see scripts/toconline-rpa/README.md
 */

/** @type {Record<string, string>} */
export const SELECTORS = {
  /** Campo email / utilizador no login */
  email: 'input[type="email"], input[name="email"], input[name="username"], #email',
  /** Palavra-passe */
  password: 'input[type="password"]',
  /** Botão entrar / login */
  submit: 'button[type="submit"], button:has-text("Entrar"), [data-testid="login-submit"]',
  /** Separador «Anexos» — fallback se getByRole falhar (tab/link/botão variam na SPA) */
  anexosTab:
    '[role="tab"]:has-text("Anexos"), a:has-text("Anexos"), button:has-text("Anexos"), [data-testid*="anexo"]',
  /** Fallback CSS se getByText «Download ficheiro» / «Download ficheiro JPEG» falhar */
  downloadAttachment:
    'button:has-text("Download ficheiro"), button:has-text("Descarregar"), [download], a[href*="download"], button:has-text("Download")',
  /** Separador «Contabilidade» — só para tentar ler obra (não bloqueia download) */
  contabilidadeTab: 'a:has-text("Contabilidade"), button:has-text("Contabilidade")',
  /** Região onde aparece obra / centro de custo (muito dependente do ecrã) */
  obraOrCentro: '[data-obra], .obra, td:has-text("Obra")',
  /** Opcional: bloco de cabeçalho do documento (fornecedor / número) — deixar vazio e usar heurísticas */
  documentHeader: "",
  /** Opcional: fornecedor explícito no DOM */
  supplierField: "",
  /** Opcional: número FT / documento */
  numberField: "",
};
