import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import path from 'path';
import type { Fatura } from '@/faturas/domain';

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo-ennova.png');

const PRIMARY  = '#0073AA';
const INK      = '#333333';
const INK_MID  = '#555555';
const INK_SOFT = '#999999';
const RULE     = '#E0E0E0';
const BG_GREY  = '#F5F5F5';

function dataPt(iso: string | null): string {
  if (!iso) return '–';
  const s = String(iso);
  const d = new Date(s.includes('T') ? s : s + 'T00:00:00');
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-PT');
}

function eur(v: number): string {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

function tipoLabel(f: Fatura): string {
  return f.tipo === 'adjudicacao' ? 'Fatura de Adjudicação' : `Auto de Medição Nº ${f.numeroAuto}`;
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: '#fff', paddingHorizontal: 48, paddingTop: 40, paddingBottom: 60 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  logo:        { width: 130, height: 44, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: PRIMARY, marginBottom: 4 },
  headerSub:   { fontSize: 10, color: INK_SOFT },
  badge:     { borderRadius: 3, paddingHorizontal: 7, paddingVertical: 2, marginTop: 6, alignSelf: 'flex-end' },
  badgeText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fff' },
  rule: { borderBottomWidth: 1, borderBottomColor: RULE, marginVertical: 14 },
  infoRow:       { flexDirection: 'row', gap: 20, marginBottom: 14 },
  infoBlock:     { flex: 1 },
  infoLabel:     { fontSize: 7.5, color: INK_SOFT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  infoValue:     { fontSize: 9.5, color: INK },
  infoValueBold: { fontSize: 9.5, color: INK, fontFamily: 'Helvetica-Bold' },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: PRIMARY, marginTop: 16, marginBottom: 6 },
  tHead:     { flexDirection: 'row', backgroundColor: PRIMARY, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 2 },
  tHeadText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#fff' },
  tRow:      { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: RULE },
  tRowAlt:   { backgroundColor: BG_GREY },
  tCell:     { fontSize: 8.5, color: INK },
  tCellR:    { fontSize: 8.5, color: INK, textAlign: 'right' },
  totals:       { marginTop: 20, alignSelf: 'flex-end', width: 270 },
  tLine:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 8 },
  tLineSep:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: RULE },
  tLineTotal:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 8, backgroundColor: PRIMARY, borderRadius: 3, marginTop: 4 },
  tLabel:       { fontSize: 8.5, color: INK_MID },
  tValue:       { fontSize: 8.5, color: INK, fontFamily: 'Helvetica-Bold' },
  tLabelTotal:  { fontSize: 10, color: '#fff', fontFamily: 'Helvetica-Bold' },
  tValueTotal:  { fontSize: 10, color: '#fff', fontFamily: 'Helvetica-Bold' },
  notes: { fontSize: 8.5, color: INK_MID, marginTop: 4 },
  footer:      { position: 'absolute', bottom: 24, left: 48, right: 48 },
  footerLine:  { borderTopWidth: 1, borderTopColor: RULE, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:  { fontSize: 7.5, color: INK_SOFT },
});

function Header({ f }: { f: Fatura }) {
  const badgeColor = f.estado === 'PAGA' ? '#16a34a' : f.estado === 'EMITIDA' ? PRIMARY : '#9ca3af';
  return (
    <View style={s.header}>
      <Image src={LOGO_PATH} style={s.logo} />
      <View style={s.headerRight}>
        <Text style={s.headerTitle}>{tipoLabel(f)}</Text>
        <Text style={s.headerSub}>{f.numero}</Text>
        <View style={[s.badge, { backgroundColor: badgeColor }]}>
          <Text style={s.badgeText}>{f.estado}</Text>
        </View>
      </View>
    </View>
  );
}

function InfoGrid({ f }: { f: Fatura }) {
  return (
    <>
      <View style={s.infoRow}>
        <View style={s.infoBlock}>
          <Text style={s.infoLabel}>Cliente</Text>
          <Text style={s.infoValueBold}>{f.clienteNome}</Text>
        </View>
        <View style={s.infoBlock}>
          <Text style={s.infoLabel}>Proposta</Text>
          <Text style={s.infoValue}>{f.propostaCodigo}</Text>
        </View>
        <View style={s.infoBlock}>
          <Text style={s.infoLabel}>Valor do Contrato</Text>
          <Text style={s.infoValue}>{eur(f.contratoValorTotal)}</Text>
        </View>
      </View>
      <View style={s.infoRow}>
        <View style={s.infoBlock}>
          <Text style={s.infoLabel}>Data de Emissão</Text>
          <Text style={s.infoValue}>{dataPt(f.dataEmissao)}</Text>
        </View>
        <View style={s.infoBlock}>
          <Text style={s.infoLabel}>Vencimento</Text>
          <Text style={s.infoValue}>{dataPt(f.dataVencimento)}</Text>
        </View>
        <View style={s.infoBlock}>
          <Text style={s.infoLabel}>Taxa IVA</Text>
          <Text style={s.infoValue}>{f.taxaIva}%</Text>
        </View>
      </View>
    </>
  );
}

function AdjudicacaoBody({ f }: { f: Fatura }) {
  return (
    <>
      <Text style={s.sectionTitle}>Detalhe da Fatura</Text>
      <View style={s.tHead}>
        <Text style={[s.tHeadText, { flex: 4 }]}>Descrição</Text>
        <Text style={[s.tHeadText, { flex: 1, textAlign: 'right' }]}>Percentagem</Text>
        <Text style={[s.tHeadText, { flex: 1.5, textAlign: 'right' }]}>Valor</Text>
      </View>
      <View style={s.tRow}>
        <Text style={[s.tCell, { flex: 4 }]}>Adjudicação de obra — adiantamento inicial</Text>
        <Text style={[s.tCellR, { flex: 1 }]}>{f.percentagemAdjudicacao}%</Text>
        <Text style={[s.tCellR, { flex: 1.5 }]}>{eur(f.valorBase)}</Text>
      </View>
    </>
  );
}

function AutoBody({ f }: { f: Fatura }) {
  return (
    <>
      <Text style={s.sectionTitle}>Avanço por Capítulo</Text>
      <View style={s.tHead}>
        <Text style={[s.tHeadText, { flex: 0.6 }]}>Cap.</Text>
        <Text style={[s.tHeadText, { flex: 3.5 }]}>Descrição</Text>
        <Text style={[s.tHeadText, { flex: 1.2, textAlign: 'right' }]}>Valor Obra</Text>
        <Text style={[s.tHeadText, { flex: 0.8, textAlign: 'right' }]}>% Ant.</Text>
        <Text style={[s.tHeadText, { flex: 0.8, textAlign: 'right' }]}>% Atual</Text>
        <Text style={[s.tHeadText, { flex: 1.2, textAlign: 'right' }]}>Valor Auto</Text>
      </View>
      {f.capitulos.map((cap, i) => {
        const valorAuto = cap.valorContrato * (cap.percentagemAtual - cap.percentagemAnterior) / 100;
        return (
          <View key={cap.id} style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}]}>
            <Text style={[s.tCell,  { flex: 0.6 }]}>{cap.capitulo}</Text>
            <Text style={[s.tCell,  { flex: 3.5 }]}>{cap.descricao}</Text>
            <Text style={[s.tCellR, { flex: 1.2 }]}>{eur(cap.valorContrato)}</Text>
            <Text style={[s.tCellR, { flex: 0.8 }]}>{cap.percentagemAnterior}%</Text>
            <Text style={[s.tCellR, { flex: 0.8 }]}>{cap.percentagemAtual}%</Text>
            <Text style={[s.tCellR, { flex: 1.2 }]}>{eur(valorAuto)}</Text>
          </View>
        );
      })}
    </>
  );
}

function Totals({ f }: { f: Fatura }) {
  return (
    <View style={s.totals}>
      {f.tipo === 'auto' && (
        <>
          <View style={s.tLine}>
            <Text style={s.tLabel}>Valor dos Trabalhos</Text>
            <Text style={s.tValue}>{eur(f.valorTrabalhosBruto)}</Text>
          </View>
          <View style={s.tLine}>
            <Text style={s.tLabel}>Desconto Adjudicação ({f.percentagemAdjudicacao}%)</Text>
            <Text style={s.tValue}>– {eur(f.descontoAdjudicacao)}</Text>
          </View>
        </>
      )}
      <View style={s.tLineSep}>
        <Text style={s.tLabel}>Base Tributável</Text>
        <Text style={s.tValue}>{eur(f.valorBase)}</Text>
      </View>
      <View style={s.tLine}>
        <Text style={s.tLabel}>IVA ({f.taxaIva}%)</Text>
        <Text style={s.tValue}>{eur(f.valorIva)}</Text>
      </View>
      <View style={s.tLineTotal}>
        <Text style={s.tLabelTotal}>TOTAL A PAGAR</Text>
        <Text style={s.tValueTotal}>{eur(f.valorTotal)}</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <View style={s.footerLine}>
        <Text style={s.footerText}>Ennova – Engenharia e Gestão de Obra | Solid Projects Unip Lda | NIF 515188166</Text>
        <Text style={s.footerText}>Rua da Sociedade Farmacêutica 30B, 1150-341 Lisboa | geral@ennova.pt</Text>
      </View>
    </View>
  );
}

export async function renderFaturaPdf(fatura: Fatura): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        <Header f={fatura} />
        <View style={s.rule} />
        <InfoGrid f={fatura} />
        <View style={s.rule} />
        {fatura.tipo === 'adjudicacao' ? <AdjudicacaoBody f={fatura} /> : <AutoBody f={fatura} />}
        <Totals f={fatura} />
        {fatura.notas && (
          <>
            <Text style={s.sectionTitle}>Notas</Text>
            <Text style={s.notes}>{fatura.notas}</Text>
          </>
        )}
        <Footer />
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
