import { numberToWordsPt } from "@/lib/numberToWords";
import type { ClausulaContrato } from "./domain";

export const EMPREITEIRO = {
  razaoSocial: "SOLID PROJECTS, LDA",
  nipc: "515 188 166",
  alvara: "91712 – PAR",
  morada: "Rua da Sociedade Farmacêutica, n.º 30B, 1150-341 Lisboa",
};

// Re-export numberToWordsPt so callers can use it via this module
export { numberToWordsPt };

interface ClausulaParams {
  referenciaProposta: string; // e.g. "P-2026-ABC – Revisão 1"
  dataProposta: string; // formatted date
  obraMorada: string;
  valorNumerico: string; // formatted EUR
  valorPorExtenso: string;
  dataConclusaoPrevista: string; // formatted date or "a definir"
}

export function buildClausulas(params: ClausulaParams): ClausulaContrato[] {
  const {
    referenciaProposta,
    dataProposta,
    obraMorada,
    valorNumerico,
    valorPorExtenso,
    dataConclusaoPrevista,
  } = params;
  return [
    {
      numero: 1,
      titulo: "Objeto do Contrato",
      texto: `O presente contrato tem por objeto a execução, pelo Empreiteiro, dos trabalhos de construção civil e especialidades constantes da Proposta n.º ${referenciaProposta}, datada de ${dataProposta}, apresentada pela ${EMPREITEIRO.razaoSocial}, a qual se anexa ao presente contrato e dele faz parte integrante, doravante designada por Orçamento. Os trabalhos serão executados no imóvel sito em ${obraMorada}.`,
    },
    {
      numero: 2,
      titulo: "Documentos Contratuais",
      texto: `Fazem parte integrante do presente contrato: o presente Contrato de Empreitada e a Proposta n.º ${referenciaProposta}, datada de ${dataProposta}, incluindo o respetivo articulado, medições, preços unitários, condições, notas e exclusões.`,
    },
    {
      numero: 3,
      titulo: "Preço da Empreitada",
      texto: `O preço global da empreitada é de ${valorNumerico} (${valorPorExtenso}), valor sem IVA, ao qual acresce o IVA à taxa legal em vigor.`,
    },
    {
      numero: 4,
      titulo: "Condições de Pagamento",
      texto: `O pagamento será efetuado com base em faturação quinzenal, correspondente aos autos de medição dos trabalhos efetivamente executados. A adjudicação será formalizada mediante pagamento de adiantamento de 30% do valor total, deduzido proporcionalmente em cada fatura. As faturas deverão ser liquidadas no prazo máximo de 5 dias após aprovação pelo Dono da Obra.`,
    },
    {
      numero: 5,
      titulo: "Prazo de Execução",
      texto: `A empreitada terá início após adjudicação formal e disponibilização do espaço. A data previsional de conclusão é ${dataConclusaoPrevista}, condicionada à entrega atempada dos projetos de execução e decisões por parte do Dono da Obra.`,
    },
    {
      numero: 6,
      titulo: "Obrigações do Empreiteiro",
      texto: `O Empreiteiro obriga-se a: (a) executar todos os trabalhos com boa arte, dentro dos prazos estabelecidos e em conformidade com as especificações do Orçamento contratual; (b) fornecer todos os materiais, equipamentos e mão de obra necessários à boa execução dos trabalhos; (c) cumprir todas as normas legais e regulamentares aplicáveis, nomeadamente as relativas à segurança e saúde no trabalho, ao ambiente e aos materiais de construção; (d) manter o estaleiro em condições de segurança, limpeza e ordem, garantindo o acesso condicionado ao local; (e) contratar e manter em vigor os seguros obrigatórios, incluindo de responsabilidade civil e de acidentes de trabalho; (f) comunicar de imediato ao Dono da Obra qualquer situação imprevista que possa afetar o prazo, o custo ou a qualidade dos trabalhos; (g) reparar, a suas expensas, todos os defeitos ou vícios que se manifestem durante o prazo legal de garantia de cinco anos.`,
    },
    {
      numero: 7,
      titulo: "Obrigações do Dono da Obra",
      texto: `O Dono da Obra obriga-se a: (a) permitir o acesso ao local de obra e fornecer todas as informações e projetos necessários à execução dos trabalhos em tempo útil; (b) efetuar os pagamentos nos termos e prazos acordados na Cláusula 4.ª; (c) aprovar ou solicitar esclarecimentos sobre os autos de medição apresentados pelo Empreiteiro no prazo máximo de 3 dias úteis; (d) tomar decisões e prestar aprovações necessárias ao avanço da obra em tempo oportuno, de forma a não prejudicar o cumprimento do prazo pelo Empreiteiro; (e) não contratar diretamente, sem acordo prévio escrito do Empreiteiro, outros prestadores de serviços cujos trabalhos se intersectem ou condicionem os da presente empreitada.`,
    },
    {
      numero: 8,
      titulo: "Trabalhos a Mais e Alterações ao Âmbito",
      texto: `Qualquer trabalho não previsto no Orçamento contratual, ou qualquer alteração ao âmbito dos trabalhos, deverá ser previamente orçamentado pelo Empreiteiro e aprovado por escrito pelo Dono da Obra antes do início da sua execução. Trabalhos a mais ou alterações executados sem aprovação prévia escrita não serão considerados para efeitos de faturação. O valor acumulado de trabalhos a mais não poderá exceder 20% do valor contratual sem que as partes celebrem um adendo ao presente contrato, devidamente assinado por ambas as partes.`,
    },
    {
      numero: 9,
      titulo: "Resolução de Litígios",
      texto: `As partes comprometem-se a resolver amigavelmente quaisquer divergências emergentes da interpretação ou execução do presente contrato. Na impossibilidade de acordo amigável no prazo de 30 dias, é competente o foro da comarca de Lisboa, com expressa renúncia a qualquer outro.`,
    },
    {
      numero: 10,
      titulo: "Disposições Finais",
      texto: `O presente contrato entra em vigor na data da sua assinatura por ambas as partes e rege-se pela legislação portuguesa aplicável, em particular pelo Código Civil e pelo regime jurídico da empreitada de obras particulares. Qualquer alteração ao presente contrato só produzirá efeitos se efetuada por escrito e assinada por ambas as partes. O presente contrato é celebrado em duplicado, ficando cada parte com um exemplar.`,
    },
  ];
}
