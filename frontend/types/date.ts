export const formatarData = (dataSqlite: string) => {
  if (!dataSqlite) return "Sem data";

  // O SQLite usa espaço, o JS prefere o "T" para ISO
  const dataIso = dataSqlite.replace(" ", "T"); 
  const data = new Date(dataIso);

  if (isNaN(data.getTime())) return "Data inválida";

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};