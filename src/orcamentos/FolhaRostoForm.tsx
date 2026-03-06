"use client";

import { useBudgetDraft } from "./BudgetDraftContext";

export function FolhaRostoForm() {
  const { meta, setMeta } = useBudgetDraft();

  function update<K extends keyof typeof meta>(key: K, value: (typeof meta)[K]) {
    setMeta((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Folha de rosto
          </h2>
          <p className="text-xs text-slate-500">
            Informação que irá compor a primeira página da proposta comercial.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Formulário de edição */}
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cliente
              </h3>
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-slate-700">
                  Nome do cliente
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                    value={meta.clienteNome}
                    onChange={(e) => update("clienteNome", e.target.value)}
                    placeholder="Ex.: João Silva"
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-700">
                  Entidade / empresa
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                    value={meta.clienteEntidade}
                    onChange={(e) => update("clienteEntidade", e.target.value)}
                    placeholder="Ex.: HB Construções, Lda."
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-700">
                  Contacto
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                    value={meta.clienteContacto}
                    onChange={(e) => update("clienteContacto", e.target.value)}
                    placeholder="Email ou telefone principal"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Obra
              </h3>
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-slate-700">
                  <span>Nome da obra</span>
                  <span className="ml-0.5 text-[11px] font-semibold text-red-600">
                    *
                  </span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                    value={meta.obraNome}
                    onChange={(e) => update("obraNome", e.target.value)}
                    placeholder="Ex.: Remodelação T3 Rua X"
                    required
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-700">
                  Morada / localização
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                    value={meta.obraEndereco}
                    onChange={(e) => update("obraEndereco", e.target.value)}
                    placeholder="Rua, nº, código postal, localidade"
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-700">
                  <span>Nº de obra</span>
                  <span className="ml-0.5 text-[11px] font-semibold text-red-600">
                    *
                  </span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                    value={meta.obraNumero}
                    onChange={(e) => update("obraNumero", e.target.value)}
                    placeholder="Número interno da obra"
                    required
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-700">
                  Código interno (gerado automaticamente)
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs shadow-sm outline-none text-slate-700"
                    value={meta.codigoInternoObra ?? ""}
                    readOnly
                    disabled
                    placeholder="Será gerado a partir da data, nº de obra e nome da obra"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Proposta
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="block text-[11px] font-medium text-slate-700">
                  Título da proposta
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                    value={meta.tituloProposta}
                    onChange={(e) => update("tituloProposta", e.target.value)}
                    placeholder="Ex.: Proposta de execução da obra"
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-700">
                  <span>Data da proposta</span>
                  <span className="ml-0.5 text-[11px] font-semibold text-red-600">
                    *
                  </span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none focus:border-slate-400"
                    value={meta.dataProposta}
                    onChange={(e) => update("dataProposta", e.target.value)}
                    required
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-700">
                  Validade (dias)
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none focus:border-slate-400"
                    value={meta.validadeDias}
                    onChange={(e) =>
                      update("validadeDias", Number(e.target.value) || 0)
                    }
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Responsável
              </h3>
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-slate-700">
                  Nome
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                    value={meta.responsavelNome}
                    onChange={(e) => update("responsavelNome", e.target.value)}
                    placeholder="Ex.: Hugo Bailão"
                  />
                </label>
                <label className="block text-[11px] font-medium text-slate-700">
                  Função
                  <input
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                    value={meta.responsavelFuncao}
                    onChange={(e) => update("responsavelFuncao", e.target.value)}
                    placeholder="Ex.: Diretor de obra"
                  />
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Email
                    <input
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                      value={meta.responsavelEmail}
                      onChange={(e) =>
                        update("responsavelEmail", e.target.value)
                      }
                      placeholder="email@empresa.pt"
                    />
                  </label>
                  <label className="block text-[11px] font-medium text-slate-700">
                    Telefone
                    <input
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                      value={meta.responsavelTelefone}
                      onChange={(e) =>
                        update("responsavelTelefone", e.target.value)
                      }
                      placeholder="+351 ..."
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700">
              Resumo / nota inicial
              <textarea
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                rows={3}
                value={meta.notasResumo}
                onChange={(e) => update("notasResumo", e.target.value)}
                placeholder="Breve enquadramento da proposta, condições especiais ou notas relevantes."
              />
            </label>
          </div>
        </div>

        {/* Preview visual da folha de rosto */}
        <div className="hidden h-full rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-[11px] text-slate-700 shadow-sm lg:block">
          <div className="mb-4 border-b border-slate-200 pb-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Preview folha de rosto
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <div className="text-xs font-semibold text-slate-900">
                {meta.tituloProposta || "Proposta de orçamento"}
              </div>
              <div className="text-[10px] text-slate-600">
                {meta.dataProposta && (
                  <span className="mr-2">
                    <span className="font-medium">Data: </span>
                    {meta.dataProposta}
                  </span>
                )}
                {meta.validadeDias > 0 && (
                  <span>
                    <span className="font-medium">Validade: </span>
                    {meta.validadeDias} dias
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {(meta.clienteNome ||
              meta.clienteEntidade ||
              meta.clienteContacto) && (
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Cliente
                </div>
                <div className="space-y-0.5">
                  {meta.clienteNome && (
                    <div>
                      <span className="font-medium text-slate-800">Nome: </span>
                      <span>{meta.clienteNome}</span>
                    </div>
                  )}
                  {meta.clienteEntidade && (
                    <div>
                      <span className="font-medium text-slate-800">
                        Entidade:{" "}
                      </span>
                      <span>{meta.clienteEntidade}</span>
                    </div>
                  )}
                  {meta.clienteContacto && (
                    <div>
                      <span className="font-medium text-slate-800">
                        Contacto:{" "}
                      </span>
                      <span>{meta.clienteContacto}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(meta.obraNome || meta.obraEndereco || meta.obraNumero) && (
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Obra
                </div>
                <div className="space-y-0.5">
                  {meta.obraNome && (
                    <div>
                      <span className="font-medium text-slate-800">
                        Nome da obra:{" "}
                      </span>
                      <span>{meta.obraNome}</span>
                    </div>
                  )}
                  {meta.obraEndereco && (
                    <div>
                      <span className="font-medium text-slate-800">
                        Morada:{" "}
                      </span>
                      <span>{meta.obraEndereco}</span>
                    </div>
                  )}
                  {meta.obraNumero && (
                    <div>
                      <span className="font-medium text-slate-800">
                        Nº de obra:{" "}
                      </span>
                      <span>{meta.obraNumero}</span>
                    </div>
                  )}
                  {/* Código interno fica apenas no formulário; não aparece em preview */}
                </div>
              </div>
            )}

            {(meta.responsavelNome ||
              meta.responsavelFuncao ||
              meta.responsavelEmail ||
              meta.responsavelTelefone) && (
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Responsável
                </div>
                <div className="space-y-0.5">
                  {meta.responsavelNome && (
                    <div>
                      <span className="font-medium text-slate-800">Nome: </span>
                      <span>{meta.responsavelNome}</span>
                    </div>
                  )}
                  {meta.responsavelFuncao && (
                    <div>
                      <span className="font-medium text-slate-800">
                        Função:{" "}
                      </span>
                      <span>{meta.responsavelFuncao}</span>
                    </div>
                  )}
                  {meta.responsavelEmail && (
                    <div>
                      <span className="font-medium text-slate-800">
                        Email:{" "}
                      </span>
                      <span>{meta.responsavelEmail}</span>
                    </div>
                  )}
                  {meta.responsavelTelefone && (
                    <div>
                      <span className="font-medium text-slate-800">
                        Telefone:{" "}
                      </span>
                      <span>{meta.responsavelTelefone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {meta.notasResumo && (
              <div className="space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Resumo / nota inicial
                </div>
                <p className="text-[11px] leading-relaxed text-slate-800">
                  {meta.notasResumo}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

