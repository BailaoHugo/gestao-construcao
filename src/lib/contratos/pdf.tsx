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
import type { Contrato } from "@/contratos/domain";
import { EMPREITEIRO } from "@/contratos/clausulas";

// ── Assets ──────────────────────────────────────────────────────────────────
const LOGO_PATH = path.join(process.cwd(), "public", "logo-ennova.png");

// ── Palette ─────────────────────────────────────────────────────────────────
const PRIMARY = "#0073AA";
const INK = "#333333";
const INK_MID = "#555555";
const INK_SOFT = "#999999";
const RULE = "#E0E0E0";
const BG_GREY = "#F0F0F0";

// ── Helpers ──────────────────────────────────────────────────────────────────
function dataPt(iso?: string | null): string {
  if (!iso) return "—";
  const s = String(iso);
  const d = new Date(s.includes("T") ? s : s + "T00:00:00");
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-PT");
}

function eur(v: number): string {
  return v.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Cover page
  coverPage: { fontFamily: "Helvetica", backgroundColor: "#fff" },
  coverHeader: {
    paddingHorizontal: 56,
    paddingTop: 48,
    paddingBottom: 28,
  },
  coverLogo: { height: 36, objectFit: "contain" },
  coverAccentLine: {
    height: 1,
    backgroundColor: PRIMARY,
    marginHorizontal: 56,
    marginBottom: 32,
  },
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

  // Two-party columns
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

  // Value box
  coverTotalBox: {
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    backgroundColor: BG_GREY,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
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

  // Content pages
  contentPage: {
    fontFamily: "Helvetica",
    paddingTop: 62,
    paddingBottom: 52,
    paddingHorizontal: 42,
  },

  // Header: white bg, 3px blue top stripe
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

  // Clause styles
  clausulaContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  clausulaTitulo: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    marginBottom: 5,
  },
  clausulaTexto: {
    fontSize: 8.5,
    color: INK,
    lineHeight: 1.6,
  },

  // Signature page
  signTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: INK,
    marginBottom: 24,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  signCols: {
    flexDirection: "row",
    gap: 32,
    marginTop: 16,
  },
  signCol: {
    flex: 1,
  },
  signColLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: INK_SOFT,
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  signFieldRow: {
    marginBottom: 5,
  },
  signFieldKey: {
    fontSize: 7.5,
    color: INK_SOFT,
  },
  signFieldVal: {
    fontSize: 9,
    color: INK,
    marginBottom: 4,
  },
  signLine: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: INK,
    marginTop: 24,
    marginBottom: 8,
  },
  signDateLabel: {
    fontSize: 8,
    color: INK_MID,
  },
});

// ── Cover page ────────────────────────────────────────────────────────────────
function CoverPage({ contrato }: { contrato: Contrato }) {
  const referencia = `${contrato.propostaCodigo} – Revisão ${contrato.revisaoNumero}`;

  return (
    <Page size="A4" style={s.coverPage}>
      {/* Logo */}
      <View style={s.coverHeader}>
        <Image src={LOGO_PATH} style={s.coverLogo} />
      </View>

      {/* Blue accent line */}
      <View style={s.coverAccentLine} />

      {/* Document identity */}
      <View style={s.coverBody}>
        <Text style={s.coverDocTitle}>CONTRATO DE EMPREITADA</Text>
        <Text style={s.coverDocRef}>Ref. {referencia}</Text>
        <Text style={s.coverDocDate}>{dataPt(contrato.dataContrato)}</Text>

        {/* Two-party columns */}
        <View style={s.coverCols}>
          {/* Empreiteiro */}
          <View style={s.coverCol}>
            <Text style={s.coverColLabel}>EMPREITEIRO</Text>
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>Razão Social</Text>
              <Text style={s.coverFieldVal}>{EMPREITEIRO.razaoSocial}</Text>
            </View>
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>NIPC</Text>
              <Text style={s.coverFieldVal}>{EMPREITEIRO.nipc}</Text>
            </View>
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>Morada</Text>
              <Text style={s.coverFieldVal}>{EMPREITEIRO.morada}</Text>
            </View>
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>Representante</Text>
              <Text style={s.coverFieldVal}>
                {contrato.signatarioEmpreiteiroNome || "—"}
                {contrato.signatarioEmpreiteiroFuncao
                  ? ` (${contrato.signatarioEmpreiteiroFuncao})`
                  : ""}
              </Text>
            </View>
          </View>

          {/* Dono da Obra */}
          <View style={[s.coverCol, { paddingRight: 0 }]}>
            <Text style={s.coverColLabel}>DONO DA OBRA</Text>
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>Nome</Text>
              <Text style={s.coverFieldVal}>{contrato.clienteNome || "—"}</Text>
            </View>
            {contrato.clienteNipc ? (
              <View style={s.coverFieldRow}>
                <Text style={s.coverFieldKey}>NIF/NIPC</Text>
                <Text style={s.coverFieldVal}>{contrato.clienteNipc}</Text>
              </View>
            ) : null}
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>Obra</Text>
              <Text style={s.coverFieldVal}>{contrato.obraNome || "—"}</Text>
            </View>
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>Morada</Text>
              <Text style={s.coverFieldVal}>{contrato.obraMorada || "—"}</Text>
            </View>
            <View style={s.coverFieldRow}>
              <Text style={s.coverFieldKey}>Representante</Text>
              <Text style={s.coverFieldVal}>
                {contrato.signatarioDonoNome || "—"}
                {contrato.signatarioDonoFuncao
                  ? ` (${contrato.signatarioDonoFuncao})`
                  : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Value box */}
        <View style={s.coverTotalBox}>
          <Text style={s.coverTotalLabel}>VALOR DA EMPREITADA</Text>
          <Text style={s.coverTotalValue}>{eur(contrato.totalVenda)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={s.coverFooterBar}>
        <Text style={s.coverFooterText}>
          {EMPREITEIRO.razaoSocial} · NIPC {EMPREITEIRO.nipc} · Alvará{" "}
          {EMPREITEIRO.alvara}
        </Text>
        <Text style={s.coverFooterText}>{EMPREITEIRO.morada}</Text>
      </View>
    </Page>
  );
}

// ── Fixed header ──────────────────────────────────────────────────────────────
function Hdr({ referencia }: { referencia: string }) {
  return (
    <View fixed style={s.hdr}>
      <Image src={LOGO_PATH} style={s.hdrLogo} />
      <Text style={s.hdrRef}>Contrato de Empreitada · {referencia}</Text>
    </View>
  );
}

// ── Fixed footer ──────────────────────────────────────────────────────────────
function Ftr() {
  return (
    <View fixed style={s.ftr}>
      <Text style={s.ftrText}>{EMPREITEIRO.razaoSocial} · NIPC {EMPREITEIRO.nipc}</Text>
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

// ── Clauses page ──────────────────────────────────────────────────────────────
function ClausulasPage({ contrato }: { contrato: Contrato }) {
  const referencia = `${contrato.propostaCodigo} – Revisão ${contrato.revisaoNumero}`;

  return (
    <Page size="A4" style={s.contentPage}>
      <Hdr referencia={referencia} />
      {contrato.clausulas.map((clausula) => (
        <View key={clausula.numero} style={s.clausulaContainer}>
          <Text style={s.clausulaTitulo}>
            Cláusula {clausula.numero}.ª – {clausula.titulo}
          </Text>
          <Text style={s.clausulaTexto}>{clausula.texto}</Text>
        </View>
      ))}
      <Ftr />
    </Page>
  );
}

// ── Signature page ────────────────────────────────────────────────────────────
function AssinaturasPage({ contrato }: { contrato: Contrato }) {
  const referencia = `${contrato.propostaCodigo} – Revisão ${contrato.revisaoNumero}`;

  return (
    <Page size="A4" style={s.contentPage}>
      <Hdr referencia={referencia} />

      <Text style={s.signTitle}>LOCAL E DATA DE ASSINATURA</Text>

      <View style={s.signCols}>
        {/* Empreiteiro */}
        <View style={s.signCol}>
          <Text style={s.signColLabel}>Empreiteiro</Text>
          <View style={s.signFieldRow}>
            <Text style={s.signFieldKey}>Nome</Text>
            <Text style={s.signFieldVal}>{contrato.signatarioEmpreiteiroNome || "—"}</Text>
          </View>
          <View style={s.signFieldRow}>
            <Text style={s.signFieldKey}>Função</Text>
            <Text style={s.signFieldVal}>{contrato.signatarioEmpreiteiroFuncao || "—"}</Text>
          </View>
          <View style={s.signLine} />
          <Text style={s.signDateLabel}>Data: ____/____/________</Text>
        </View>

        {/* Dono da Obra */}
        <View style={s.signCol}>
          <Text style={s.signColLabel}>Dono da Obra</Text>
          <View style={s.signFieldRow}>
            <Text style={s.signFieldKey}>Nome</Text>
            <Text style={s.signFieldVal}>{contrato.signatarioDonoNome || "—"}</Text>
          </View>
          <View style={s.signFieldRow}>
            <Text style={s.signFieldKey}>Função</Text>
            <Text style={s.signFieldVal}>{contrato.signatarioDonoFuncao || "—"}</Text>
          </View>
          <View style={s.signLine} />
          <Text style={s.signDateLabel}>Data: ____/____/________</Text>
        </View>
      </View>

      <Ftr />
    </Page>
  );
}

// ── Main document ─────────────────────────────────────────────────────────────
function ContratoPDF({ contrato }: { contrato: Contrato }) {
  const referencia = `${contrato.propostaCodigo} – Revisão ${contrato.revisaoNumero}`;

  return (
    <Document
      title={`Contrato de Empreitada – ${referencia}`}
      author={EMPREITEIRO.razaoSocial}
      creator={EMPREITEIRO.razaoSocial}
      subject="Contrato de Empreitada"
    >
      <CoverPage contrato={contrato} />
      <ClausulasPage contrato={contrato} />
      <AssinaturasPage contrato={contrato} />
    </Document>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function renderContratoPdf(contrato: Contrato): Promise<Buffer> {
  return await renderToBuffer(<ContratoPDF contrato={contrato} />);
}
