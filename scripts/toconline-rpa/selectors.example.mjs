/**
 * Seletores DOM — ajustar ao DOM real (1–2 iterações típicas).
 * Copia para selectors.mjs (gitignored) ou edita aqui com cuidado.
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
  /** Separador «Contabilidade» — no mvp.mjs usa-se também getByRole('tab', …) como fallback */
  contabilidadeTab: 'a:has-text("Contabilidade"), button:has-text("Contabilidade")',
  /** Botão/link de download de anexo (ajustar ao ícone real) */
  downloadAttachment: '[download], a[href*="download"], button:has-text("Descarregar")',
  /** Região onde aparece obra / centro de custo (muito dependente do ecrã) */
  obraOrCentro: '[data-obra], .obra, td:has-text("Obra")',
};
