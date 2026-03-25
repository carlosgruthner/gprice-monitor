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
  const [idEditando, setIdEditando] = useState(null); // Novo: controla se estamos editando
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);

  const carregar = () =>
    axios.get(`${API}/produtos`).then((r) => setProdutos(r.data));

  useEffect(() => {
    carregar();
  }, []);

  // --- FUNÇÃO ADICIONAR OU SALVAR EDIÇÃO ---
  const salvar = async () => {
    if (!nome || !url) return toast.error("Preencha Nome e Link");
    setLoadingAdd(true);
    try {
      if (idEditando) {
        // Se houver um ID, chama o PUT (Editar)
        await axios.put(`${API}/produtos/${idEditando}`, { nome, url });
        toast.success("✅ Produto atualizado!");
      } else {
        // Se não, chama o POST (Adicionar)
        const res = await axios.post(`${API}/produtos`, { nome, url });
        toast.success(
          `✅ Adicionado! Preço: R$ ${res.data.preco_encontrado || "—"}`,
        );
      }

      cancelarEdicao();
      carregar();
    } catch (e) {
      toast.error("Erro ao processar. Verifique os dados.");
    }
    setLoadingAdd(false);
  };

  // --- FUNÇÃO EXCLUIR ---
  const excluir = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await axios.delete(`${API}/produtos/${id}`);
      toast.success("🗑️ Produto removido");
      carregar();
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
  };

  // --- PREPARAR EDIÇÃO ---
  const prepararEdicao = (p: any) => {
    setIdEditando(p.id);
    setNome(p.nome);
    setUrl(p.url);
    window.scrollTo({ top: 0, behavior: "smooth" }); // Sobe para o formulário
  };

  const cancelarEdicao = () => {
    setIdEditando(null);
    setNome("");
    setUrl("");
  };

  const atualizarAgora = async () => {
    setLoadingRefresh(true);
    await axios.post(`${API}/atualizar`);
    toast.success("🔄 Todos verificados!");
    carregar();
    setLoadingRefresh(false);
  };

  return (
    <div className="min-h-screen bg-black/55 text-white p-6">
      <Toaster position="top-center" />
      <div className="w-full flex items-start">
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
      <h1 className="text-3xl font-bold text-center mb-8 text-green-500">
        MONITOR DE PREÇOS
      </h1>

      {/* Formulário */}
      <div
        className={`max-w-xl mx-auto bg-zinc-950 p-6 rounded-4xl mb-8 border-2 ${idEditando ? "border-sky-500" : "border-green-500"}`}
      >
        <h2 className="text-xl mb-4 font-bold text-zinc-400">
          {idEditando ? "✏️ Editando Produto" : "➕ Adicionar novo produto"}
        </h2>
        <input
          placeholder="Nome do produto"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full p-2 bg-zinc-800 rounded-xl mb-3 border border-zinc-700 outline-none focus:border-green-600"
        />
        <input
          placeholder="Link completo do produto"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-2 bg-zinc-800 rounded-xl mb-3 border border-zinc-700 outline-none focus:border-green-600"
        />
        <div className="flex gap-2">
          <button
            onClick={salvar}
            disabled={loadingAdd}
            className={`flex-1 py-3 rounded-xl font-bold text-md transition-colors hover:cursor-pointer text-zinc-300 ${idEditando ? "bg-sky-600 hover:bg-sky-500" : "bg-green-800 hover:bg-green-600"}`}
          >
            {loadingAdd
              ? "🔍 Processando..."
              : idEditando
                ? "Salvar Alterações"
                : "✅ Adicionar + Buscar Preço"}
          </button>

          {idEditando && (
            <button
              onClick={cancelarEdicao}
              className="px-6 bg-zinc-700 rounded-xl hover:bg-zinc-600"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="max-w-6xl mx-auto">
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex justify-between items-center ">
            <h2 className="text-xl font-semibold text-neutral-400">
              📦 Produtos monitorados (
              <span className="text-green-600">{produtos.length}</span>)
            </h2>
          </div>
          {!idEditando && (
            <button
              onClick={atualizarAgora}
              disabled={loadingRefresh}
              className=" w-1/4  border border-blue-800 text-blue-300 py-2 rounded-xl font-medium hover:bg-blue-800 hover:text-white transition-all hover:cursor-pointer"
            >
              {loadingRefresh
                ? "🔄 Verificando..."
                : "🔄 Atualizar todos agora"}
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-green-800">
          <table className="w-full bg-black">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="p-4 text-left">Produto</th>
                <th className="p-4 text-center">Loja</th>
                <th className="p-4 text-center">Preço Atual</th>
                <th className="p-4 text-center">Menor Preço</th>
                <th className="p-4 text-center">Última verificação</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p: any) => {
                const isBestPrice =
                  p.ultimo_preco <= p.menor_preco && p.ultimo_preco > 0;

                return (
                  <tr
                    key={p.id}
                    className="border-t border-zinc-800 hover:bg-green-500/10 transition-colors"
                  >
                    <td className="p-4 w-2/5">
                      <a
                        href={p.url}
                        target="_blank"
                        className="text-sky-400 hover:underline font-medium"
                      >
                        {p.nome}
                      </a>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs text-zinc-500 uppercase font-bold">
                        {p.loja}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col">
                        <span
                          className={`font-bold text-xl ${isBestPrice ? "text-emerald-400" : "text-white"}`}
                        >
                          R$ {p.ultimo_preco?.toFixed(2) || "—"}
                        </span>
                        {isBestPrice && (
                          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                            🔥 Melhor Preço!
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-zinc-400 font-medium">
                        R$ {p.menor_preco?.toFixed(2) || "—"}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-500 text-sm text-center">
                      {new Date(p.ultima_verificacao).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-4 text-right">
                      {/* ... Seus botões de edição e exclusão permanecem iguais ... */}
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => prepararEdicao(p)}
                          className="p-2 border border-blue-800 rounded hover:bg-blue-800 hover:text-white transition-all cursor-pointer"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => excluir(p.id)}
                          className="p-2 border border-red-800  rounded hover:bg-red-800 hover:text-white transition-all cursor-pointer"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {produtos.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-zinc-600">
                    Nenhum produto cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
