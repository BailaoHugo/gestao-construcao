import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import path from "path";
import type { Proposta, PropostaLinha, PropostaRevisao } from "@/propostas/domain";

// ── Company constants ──────────────────────────────────────────────────────
const LOGO_PATH = path.join(process.cwd(), "public", "logo-ennova.png");
const LOGO_WHITE_PATH = path.join(process.cwd(), "public", "logo-ennova-white.png");

const EMPRESA = {
  razaoSocial: "Solid Projects Unip Lda",
  nomeComercial: "Ennova — Engenharia e Gestão de Obra",
  nif: "515188166",
  alvara: "91712 - PAR",
  morada: "Rua da Sociedade Farmacêutica nº 30B, 1150-341 Lisboa",
  telefone: "919 535 438 | 937 214 336",
  email: "geral@ennova.pt",
  website: "ennova.pt",
};

const CONDICOES: [string, string][] = [
  ["Validade do orçamento", "30 dias a partir da data de emissão."],
  [
    "Forma de pagamento",
    "30% na adjudicação; restante liquidado por autos de medição mensais.",
  ],
  ["Prazo de execução", "A definir em sede de adjudicação."],
  ["IVA", "Os preços apresentados incluem IVA à taxa legal em vigor."],
  [
    "Trabalhos adicionais",
    "Quaisquer trabalhos adicionais ou alterações de âmbito serão objeto de orçamento suplementar, previamente aceite pelo cliente.",
  ],
];

// ── Palette ────────────────────────────────────────────────────────────────
const PRIMARY  = "#0073AA";
const INK      = "#333333";
const INK_MID  = "#555555";
const INK_SOFT = "#999999";
const RULE     = "#E0E0E0";
const BG_SOFT  = "#F8F8F8";
const BG_ALT   = "#FAFAFA";
const BG_GREY  = "#F0F0F0";

// ── Helpers ────────────────────────────────────────────────────────────────
function eur(v: number): string {
  return v.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function dataPt(iso?: string | null | Date): string {
  if (!iso) return "—";
  const s = String(iso);
  const d = new Date(s.includes("T") ? s : s + "T00:00:00");
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-PT");
}

function groupLinhas(linhas: PropostaLinha[]): [string, PropostaLinha[]][] {
  const map = new Map<string, PropostaLinha[]>();
  for (const l of linhas) {
    const k = l.grandeCapitulo?.trim() || l.capitulo?.trim() || "Sem capítulo";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(l);
  }
  return [...map];
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Cover page ────────────────────────────────────────────────────────────
  coverPage: { fontFamily: "Helvetica", backgroundColor: "#fff" },

  // Logo area at top
  coverHeader: {
    paddingHorizontal: 56,
    paddingTop: 48,
    paddingBottom: 28,
  },
  coverLogo: { height: 36, objectFit: "contain" },

  // Thin blue accent line below logo
  coverAccentLine: {
    height: 1,
    backgroundColor: PRIMARY,
    marginHorizontal: 56,
    marginBottom: 32,
  },

  // Document identity block
  coverBody: {
    flex: 1,
    paddingHorizontal: 56,
    paddingBottom: 16,
  },
  coverDocTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: INK,
    marginBottom: 8,
  },
  coverDocRef: { fontSize: 11, color: INK_MID, marginBottom: 3 },
  coverDocDate: { fontSize: 9, color: INK_SOFT, marginBottom: 32 },

  // 3-column data grid
  coverCols: { flexDirection: "row", marginBottom: 32 },
  coverCol: { flex: 1, paddingRight: 12 },
  coverColLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: INK_SOFT,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  coverFieldRow: { marginBottom: 5 },
  coverFieldKey: { fontSize: 7.5, color: INK_SOFT },
  coverFieldVal: { fontSize: 9, color: INK },

  // Total box: light grey bg + left blue border
  coverTotalBox: {
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    backgroundColor: BG_GREY,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  coverTotalLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: INK_SOFT,
    marginBottom: 5,
  },
  coverTotalValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: INK,
  },

  // Company footer
  coverFooterBar: {
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 14,
    paddingHorizontal: 56,
    paddingBottom: 28,
  },
  coverFooterText: { fontSize: 7.5, color: INK_SOFT, marginBottom: 2 },

  // ── Content pages ─────────────────────────────────────────────────────────
  contentPage: {
    fontFamily: "Helvetica",
    paddingTop: 62,
    paddingBottom: 52,
    paddingHorizontal: 42,
  },

  // Header: white bg, 3 px blue top stripe
  hdr: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 46,
    backgroundColor: "#fff",
    borderTopWidth: 3,
    borderTopColor: PRIMARY,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 42,
  },
  hdrLogo: { height: 22, objectFit: "contain" },
  hdrRef: { marginLeft: "auto", fontSize: 8, color: INK_SOFT },

  // Footer
  ftr: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    borderTopWidth: 1,
    borderTopColor: RULE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 42,
  },
  ftrText: { fontSize: 7, color: INK_SOFT },

  // ── Section titles ────────────────────────────────────────────────────────
  secTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    letterSpacing: 0.8,
  },
  secTitleFirst: { marginTop: 0 },

  // ── Table shared ──────────────────────────────────────────────────────────
  tblHead: {
    flexDirection: "row",
    backgroundColor: BG_GREY,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tblHeadCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: INK },
  tblRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: BG_GREY,
  },
  tblRowAlt: { backgroundColor: BG_ALT },
  tblCell: { fontSize: 7.5, color: INK },

  // Summary total row
  tblTotal: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: BG_GREY,
    borderTopWidth: 1,
    borderTopColor: RULE,
  },
  tblTotalLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: INK },
  tblTotalValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: PRIMARY },

  // ── Detail: chapter group ─────────────────────────────────────────────────
  chapHdr: {
    backgroundColor: BG_SOFT,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  chapHdrText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: INK },
  chapSubtotal: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: BG_GREY,
    borderTopWidth: 1,
    borderTopColor: RULE,
    marginBottom: 6,
  },
  chapSubtotalLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: INK_MID },
  chapSubtotalValue: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: PRIMARY },

  // ── Conditions ────────────────────────────────────────────────────────────
  condItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  condTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: PRIMARY, marginBottom: 3 },
  condBody: { fontSize: 8.5, color: INK_MID, lineHeight: 1.5 },
  condNote: { fontSize: 7.5, color: INK_SOFT, marginTop: 16, lineHeight: 1.5 },
});

// ── Cover page ─────────────────────────────────────────────────────────────
function CoverPage({ p, rev }: { p: Proposta; rev: PropostaRevisao }) {
  const fr = rev.folhaRosto;
  const validade =
    fr.validadeTexto || (fr.validadeDias ? `${fr.validadeDias} dias` : "—");

  return (
    <Page size="A4" style={s.coverPage}>
      {/* Logo on white */}
      <View style={s.coverHeader}>
        <Image src={LOGO_PATH} style={s.coverLogo} />
      </View>

      {/* Thin blue separator line */}
      <View style={s.coverAccentLine} />

      {/* Document identity */}
      <View style={s.coverBody}>
        <Text style={s.coverDocTitle}>Proposta de Orçamento</Text>
        <Text style={s.coverDocRef}>
          {p.codigo} · Revisão {rev.numeroRevisao}
        </Text>
        <Text style={s.coverDocDate}>{dataPt(fr.dataProposta)}</Text>

        {/* Three columns: Obra | Cliente | Proposta */}
        <View style={s.coverCols}>
          <View style={s.coverCol}>
            <Text style={s.coverColLabel}>OBRA</Text>
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>Nome</Text>
              <Text style={s.coverFieldVal}>{fr.obraNome || "—"}</Text>
            </View>
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>Morada</Text>
              <Text style={s.coverFieldVal}>{fr.obraMorada || "—"}</Text>
            </View>
          </View>

          <View style={s.coverCol}>
            <Text style={s.coverColLabel}>CLIENTE</Text>
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>Nome</Text>
              <Text style={s.coverFieldVal}>{fr.clienteNome || "—"}</Text>
            </View>
            {fr.clienteContacto ? (
              <View style={s.coverFieldRow}>
                <Text style={s.coverFieldKey}>Contacto</Text>
                <Text style={s.coverFieldVal}>{fr.clienteContacto}</Text>
              </View>
            ) : null}
            {fr.clienteEmail ? (
              <View style={s.coverFieldRow}>
                <Text style={s.coverFieldKey}>Email</Text>
                <Text style={s.coverFieldVal}>{fr.clienteEmail}</Text>
              </View>
            ) : null}
          </View>

          <View style={[s.coverCol, { paddingRight: 0 }]}>
            <Text style={s.coverColLabel}>PROPOSTA</Text>
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>Data</Text>
              <Text style={s.coverFieldVal}>{dataPt(fr.dataProposta)}</Text>
            </View>
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>Validade</Text>
              <Text style={s.coverFieldVal}>{validade}</Text>
            </View>
          </View>
        </View>

        {/* Total box */}
        <View style={s.coverTotalBox}>
          <Text style={s.coverTotalLabel}>VALOR TOTAL DA PROPOSTA</Text>
          <Text style={s.coverTotalValue}>{eur(rev.totalVenda)}</Text>
        </View>
      </View>

      {/* Company footer */}
      <View style={s.coverFooterBar}>
        <Text style={s.coverFooterText}>
          {EMPRESA.razaoSocial} · NIF {EMPRESA.nif} · Alvará {EMPRESA.alvara}
        </Text>
        <Text style={s.coverFooterText}>{EMPRESA.morada}</Text>
        <Text style={s.coverFooterText}>
          Tel: {EMPRESA.telefone} · {EMPRESA.email} · {EMPRESA.website}
        </Text>
      </View>
    </Page>
  );
}

// ── Fixed header (white + blue top stripe) ─────────────────────────────────
function Hdr({ p, rev }: { p: Proposta; rev: PropostaRevisao }) {
  return (
    <View fixed style={s.hdr}>
      <Image src={LOGO_PATH} style={s.hdrLogo} />
      <Text style={s.hdrRef}>
        {p.codigo} · Rev. {rev.numeroRevisao}
      </Text>
    </View>
  );
}

// ── Fixed footer ───────────────────────────────────────────────────────────
function Ftr() {
  return (
    <View fixed style={s.ftr}>
      <Text style={s.ftrText}>
        {EMPRESA.nomeComercial} · NIF {EMPRESA.nif}
      </Text>
      <Text
        style={s.ftrText}
        render={({
          pageNumber,
          totalPages,
        }: {
          pageNumber: number;
          totalPages: number;
        }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}

// ── Section: Resumo por capítulos ──────────────────────────────────────────
function Resumo({ rev }: { rev: PropostaRevisao }) {
  const grupos = groupLinhas(rev.linhas);
  return (
    <View>
      <Text style={[s.secTitle, s.secTitleFirst]}>Resumo por Capítulos</Text>
      <View style={s.tblHead}>
        <Text style={[s.tblHeadCell, { flex: 1 }]}>Capítulo / Descrição</Text>
        <Text style={[s.tblHeadCell, { width: 90, textAlign: "right" }]}>
          Total (€)
        </Text>
      </View>
      {grupos.map(([cap, linhas], i) => {
        const total = linhas.reduce((a, l) => a + l.totalVendaLinha, 0);
        return (
          <View
            key={cap}
            style={i % 2 === 1 ? [s.tblRow, s.tblRowAlt] : s.tblRow}
          >
            <Text style={[s.tblCell, { flex: 1 }]}>{cap}</Text>
            <Text style={[s.tblCell, { width: 90, textAlign: "right" }]}>
              {eur(total)}
            </Text>
          </View>
        );
      })}
      <View style={s.tblTotal}>
        <Text style={[s.tblTotalLabel, { flex: 1 }]}>TOTAL GERAL</Text>
        <Text style={[s.tblTotalValue, { width: 90, textAlign: "right" }]}>
          {eur(rev.totalVenda)}
        </Text>
      </View>
    </View>
  );
}

// ── Section: Detalhe exaustivo ─────────────────────────────────────────────
function Detalhe({ rev }: { rev: PropostaRevisao }) {
  const grupos = groupLinhas(rev.linhas);
  return (
    <View>
      <Text style={s.secTitle}>Detalhe Exaustivo</Text>
      <View style={s.tblHead}>
        <Text style={[s.tblHeadCell, { width: "11%" }]}>Cód.</Text>
        <Text style={[s.tblHeadCell, { width: "43%" }]}>Descrição</Text>
        <Text style={[s.tblHeadCell, { width: "8%", textAlign: "center" }]}>
          Un.
        </Text>
        <Text style={[s.tblHeadCell, { width: "10%", textAlign: "right" }]}>
          Qtd.
        </Text>
        <Text style={[s.tblHeadCell, { width: "14%", textAlign: "right" }]}>
          P. Unit.
        </Text>
        <Text style={[s.tblHeadCell, { width: "14%", textAlign: "right" }]}>
          Total
        </Text>
      </View>
      {grupos.map(([cap, linhas]) => {
        const subtotal = linhas.reduce((a, l) => a + l.totalVendaLinha, 0);
        return (
          <View key={cap}>
            <View style={s.chapHdr}>
              <Text style={s.chapHdrText}>{cap}</Text>
            </View>
            {linhas.map((l, i) => (
              <View
                key={l.id}
                wrap={false}
                style={i % 2 === 1 ? [s.tblRow, s.tblRowAlt] : s.tblRow}
              >
                <Text style={[s.tblCell, { width: "11%" }]}>
                  {l.codigoArtigo ?? ""}
                </Text>
                <Text style={[s.tblCell, { width: "43%" }]}>
                  {l.descricao}
                </Text>
                <Text style={[s.tblCell, { width: "8%", textAlign: "center" }]}>
                  {l.unidade}
                </Text>
                <Text style={[s.tblCell, { width: "10%", textAlign: "right" }]}>
                  {l.quantidade.toLocaleString("pt-PT", {
                    maximumFractionDigits: 3,
                  })}
                </Text>
                <Text style={[s.tblCell, { width: "14%", textAlign: "right" }]}>
                  {eur(l.precoVendaUnitario)}
                </Text>
                <Text style={[s.tblCell, { width: "14%", textAlign: "right" }]}>
                  {eur(l.totalVendaLinha)}
                </Text>
              </View>
            ))}
            <View style={s.chapSubtotal}>
              <Text style={[s.chapSubtotalLabel, { flex: 1 }]}>Subtotal</Text>
              <Text style={s.chapSubtotalValue}>{eur(subtotal)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Section: Condições gerais ──────────────────────────────────────────────
function Condicoes() {
  return (
    <View>
      <Text style={s.secTitle}>Condições Gerais</Text>
      {CONDICOES.map(([titulo, corpo]) => (
        <View key={titulo} style={s.condItem}>
          <Text style={s.condTitle}>{titulo}</Text>
          <Text style={s.condBody}>{corpo}</Text>
        </View>
      ))}
      <Text style={s.condNote}>
        Este documento foi gerado automaticamente pelo sistema de gestão da{" "}
        {EMPRESA.razaoSocial} ({EMPRESA.nomeComercial}).{"\n"}
        NIF: {EMPRESA.nif} · Alvará: {EMPRESA.alvara}
      </Text>
    </View>
  );
}

// ── Main document ──────────────────────────────────────────────────────────
function PropostaPDF({ p, rev }: { p: Proposta; rev: PropostaRevisao }) {
  return (
    <Document
      title={`${p.codigo} Rev.${rev.numeroRevisao} - Proposta de Orçamento`}
      author={EMPRESA.razaoSocial}
      creator={EMPRESA.nomeComercial}
      subject="Proposta de Orçamento"
    >
      <CoverPage p={p} rev={rev} />
      <Page size="A4" style={s.contentPage}>
        <Hdr p={p} rev={rev} />
        <Resumo rev={rev} />
        <Detalhe rev={rev} />
        <Condicoes />
        <Ftr />
      </Page>
    </Document>
  );
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function renderPropostaPdf(
  proposta: Proposta,
  revisao: PropostaRevisao,
): Promise<Buffer> {
  return await renderToBuffer(<PropostaPDF p={proposta} rev={revisao} />);
}
