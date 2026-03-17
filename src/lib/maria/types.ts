export type MariaIntent =
  | { intent: "searchArtigos"; payload: { q: string } }
  | { intent: "getArtigoByCodigo"; payload: { codigo: string } }
  | {
      intent: "addLinhaFromCatalogo";
      payload: { codigoArtigo: string; quantidade: number };
    };

export type MariaResultadoArtigo = {
  id?: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  grande_capitulo?: string | null;
  capitulo: string | null;
  preco_custo_unitario: number | null;
  preco_venda_unitario: number | null;
};

