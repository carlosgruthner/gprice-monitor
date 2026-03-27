"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";

const API = "http://localhost:4000";

export default function Home() {
  const [produtos, setProdutos] = useState([]);
  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const [idEditando, setIdEditando] = useState(null);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [intervalo, setIntervalo] = useState(10);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    carregar();
  }, []);

  const carregar = () =>
    axios.get(`${API}/produtos`).then((r) => setProdutos(r.data));

  const mudarIntervaloIndividual = async (
    id: number,
    novoIntervalo: number,
  ) => {
    try {
      await axios.patch(`${API}/produtos/${id}/intervalo`, {
        intervalo: novoIntervalo,
      });
      toast.success("Intervalo atualizado!");
      carregar();
    } catch (e) {
      toast.error("Erro ao mudar intervalo");
    }
  };

  const mudarTodosIntervalos = async () => {
    if (
      !confirm(
        `Deseja mudar o monitoramento de TODOS para ${intervalo} minutos?`,
      )
    )
      return;
    try {
      await axios.patch(`${API}/produtos/intervalo/todos`, {
        intervalo: intervalo,
      });
      toast.success("Todos os produtos foram atualizados!");
      carregar();
    } catch (e) {
      toast.error("Erro ao atualizar todos");
    }
  };

  const mudarStatus = async (id: number, novo: string) => {
    await axios.patch(`${API}/produtos/${id}/status`, { novoStatus: novo });
    carregar();
  };

  const salvar = async () => {
    if (!nome || !url) return toast.error("Preencha Nome e Link");
    setLoadingAdd(true);
    try {
      if (idEditando) {
        await axios.put(`${API}/produtos/${idEditando}`, {
          nome,
          url,
          intervalo_minutos: intervalo,
        });
        toast.success("✅ Produto atualizado!");
      } else {
        const res = await axios.post(`${API}/produtos`, {
          nome,
          url,
          intervalo_minutos: intervalo,
        });
        toast.success(
          `✅ Adicionado! Preço: R$ ${res.data.preco_encontrado || "—"}`,
        );
      }
      cancelarEdicao();
      carregar();
    } catch (e) {
      toast.error("Erro ao processar.");
    }
    setLoadingAdd(false);
  };

  const excluir = async (id: number) => {
    if (!confirm("Tem certeza?")) return;
    try {
      await axios.delete(`${API}/produtos/${id}`);
      toast.success("🗑️ Removido");
      carregar();
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
  };

  const prepararEdicao = (p: any) => {
    setIdEditando(p.id);
    setNome(p.nome);
    setUrl(p.url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicao = () => {
    setIdEditando(null);
    setNome("");
    setUrl("");
  };

  const atualizarAgora = async () => {
    setLoadingRefresh(true);
    try {
      await axios.post(`${API}/atualizar`);
      toast.success("🔄 Todos verificados!");
      carregar();
    } catch (e) {
      toast.error("Erro ao atualizar.");
    }
    setLoadingRefresh(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-6">
      <Toaster position="top-center" />

      <div className="w-full mb-6">
        <Link href="/">
          <Image
            src="/assets/icons/precos-baixos.png"
            alt="Logo"
            width={50}
            height={50}
            className="mx-auto"
          />
        </Link>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-center mb-8 text-green-500">
        MONITOR DE PREÇOS
      </h1>

      {/* Formulário */}
      <div
        className={`max-w-xl mx-auto bg-black p-5 rounded-3xl mb-10 border-2 ${idEditando ? "border-sky-500" : "border-green-900/50"}`}
      >
        <h2 className="text-lg mb-4 font-bold text-zinc-400">
          {idEditando ? "✏️ Editando Produto" : "➕ Novo produto"}
        </h2>
        <div className="space-y-3">
          <input
            placeholder="Nome do produto"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full p-3 bg-zinc-900 rounded-xl border border-zinc-800 outline-none focus:border-green-600 transition-all"
          />
          <input
            placeholder="Link do produto"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-3 bg-zinc-900 rounded-xl border border-zinc-800 outline-none focus:border-green-600 transition-all"
          />
          <div className="flex gap-2">
            <button
              onClick={salvar}
              disabled={loadingAdd}
              className={`flex-1 py-3 rounded-xl font-bold transition-all active:scale-95 cursor-pointer ${idEditando ? "bg-sky-600" : "bg-green-700 hover:bg-green-600"}`}
            >
              {loadingAdd
                ? "Processando..."
                : idEditando
                  ? "Salvar Alterações"
                  : "Adicionar Produto"}
            </button>
            {idEditando && (
              <button
                onClick={cancelarEdicao}
                className="px-5 bg-zinc-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cabeçalho de Ações da Tabela */}
      <div className="max-w-6xl mx-auto mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-300">
              📦 Monitorados{" "}
              <span className="text-green-500">({produtos.length})</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 ml-1">
                Frequência Global
              </label>
              <select
                value={intervalo}
                onChange={(e) => setIntervalo(Number(e.target.value))}
                className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800 text-sm outline-none cursor-pointer"
              >
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1 hora</option>
              </select>
            </div>
            <button
              onClick={mudarTodosIntervalos}
              className="h-10 px-4 border border-green-700 rounded-lg text-sm font-medium hover:bg-green-900/30 cursor-pointer"
            >
              Aplicar Todos
            </button>
            <button
              onClick={atualizarAgora}
              disabled={loadingRefresh}
              className="h-10 px-4 bg-blue-700 rounded-lg text-sm font-bold hover:bg-blue-600 disabled:opacity-50 cursor-pointer"
            >
              {loadingRefresh ? "🔄..." : "🔄 Atualizar Tudo"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabela Responsiva */}
      <div className="max-w-6xl mx-auto">
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
          <table className="w-full border-collapse">
            <thead className="hidden md:table-header-group bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 text-left">Produto</th>
                <th className="p-4 text-center">Preços</th>
                <th className="p-4 text-center">Frequência</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group">
              {produtos.map((p: any) => {
                const isBestPrice =
                  p.ultimo_preco <= p.menor_preco && p.ultimo_preco > 0;
                return (
                  <tr
                    key={p.id}
                    className="block md:table-row border-b border-green-600 hover:bg-green-900/30 transition-all"
                  >
                    {/* Produto */}
                    <td className="block md:table-cell p-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold md:hidden">
                          Produto
                        </span>
                        <a
                          href={p.url}
                          target="_blank"
                          className="text-sky-400 hover:underline font-medium line-clamp-1 md:line-clamp-2"
                        >
                          {p.nome}
                        </a>
                        <span className="text-[10px] text-zinc-500 uppercase">
                          {p.loja || "Loja não detectada"}
                        </span>
                      </div>
                    </td>

                    {/* Preços */}
                    <td className="block md:table-cell p-4 md:text-center border-t border-zinc-900 md:border-none">
                      <div className="flex md:flex-col justify-between items-center md:justify-center gap-2">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold md:hidden">
                          Preço Atual / Menor
                        </span>
                        <div className="text-right md:text-center">
                          <div
                            className={`text-lg font-bold ${isBestPrice ? "text-emerald-400" : "text-white"}`}
                          >
                            {isBestPrice && "🔥 "}R${" "}
                            {p.ultimo_preco?.toFixed(2) || "—"}
                          </div>
                          <div className="text-xs text-zinc-500">
                            Menor: R$ {p.menor_preco?.toFixed(2) || "—"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Frequência / Última Verif */}
                    <td className="block md:table-cell p-4 md:text-center border-t border-zinc-900 md:border-none">
                      <div className="flex md:flex-col justify-between items-center md:justify-center gap-2">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold md:hidden">
                          Monitoramento
                        </span>
                        <div className="flex flex-col items-end md:items-center">
                          <select
                            value={p.intervalo_minutos}
                            onChange={(e) =>
                              mudarIntervaloIndividual(
                                p.id,
                                Number(e.target.value),
                              )
                            }
                            className="bg-zinc-900 text-xs p-1.5 rounded border border-zinc-800 outline-none cursor-pointer"
                          >
                            <option value={5}>5 min</option>
                            <option value={10}>10 min</option>
                            <option value={20}>20 min</option>
                            <option value={30}>30 min</option>
                            <option value={60}>1h</option>
                          </select>
                          <span className="text-[9px] text-zinc-600 mt-1">
                            Verificado:
                            {isClient
                              ? new Date(
                                  p.ultima_verificacao,
                                ).toLocaleTimeString("pt-BR")
                              : "..."}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="block md:table-cell p-4 md:text-center border-t border-zinc-900 md:border-none">
                      <div className="flex md:flex-col justify-between items-center md:justify-center">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold md:hidden">
                          Status
                        </span>
                        <select
                          value={p.status}
                          onChange={(e) => mudarStatus(p.id, e.target.value)}
                          className={`p-1.5 rounded-lg text-[10px] font-black uppercase outline-none cursor-pointer ${
                            p.status === "ativo"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : p.status === "pausado"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          <option value="ativo">Ativo</option>
                          <option value="pausado">Pausado</option>
                          <option value="concluido">Concluído</option>
                        </select>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="block md:table-cell p-4 text-right border-t border-zinc-900 md:border-none bg-zinc-900/20 md:bg-transparent">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => prepararEdicao(p)}
                          className="p-2.5 bg-zinc-800 rounded-lg hover:bg-sky-900/40 transition-colors cursor-pointer"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => excluir(p.id)}
                          className="p-2.5 bg-zinc-800 rounded-lg hover:bg-red-900/40 transition-colors cursor-pointer"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
