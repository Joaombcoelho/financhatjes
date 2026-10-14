import type { Transaction } from "./types";
export function safeCell(value: string): string {
  return /^[\s]*[=+@\-\t\r]/.test(value) ? `'${value}` : value;
}
export function transactionCSV(items: Transaction[]): string {
  const rows = [
    ["Data", "Descrição", "Tipo", "Categoria", "Valor (R$)", "Exemplo"],
    ...items.map((t) => [
      t.date,
      safeCell(t.description),
      t.type === "receita" ? "Receita" : "Despesa",
      t.category,
      t.amount.toFixed(2).replace(".", ","),
      t.sample ? "Sim" : "Não",
    ]),
  ];
  return (
    "\ufeff" +
    rows.map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n")
  );
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportTransactions(items: Transaction[], format: "csv" | "xlsx" | "pdf") {
  if (format === "csv")
    return download(
      new Blob([transactionCSV(items)], { type: "text/csv;charset=utf-8" }),
      "FinanChat-historico.csv",
    );
  if (format === "xlsx") {
    const { Workbook } = await import("exceljs");
    const book = new Workbook();
    const sheet = book.addWorksheet("Histórico");
    sheet.columns = [
      { header: "Data", key: "date", width: 14 },
      { header: "Descrição", key: "description", width: 40 },
      { header: "Tipo", key: "type", width: 14 },
      { header: "Categoria", key: "category", width: 20 },
      { header: "Valor (R$)", key: "amount", width: 18 },
      { header: "Exemplo", key: "sample", width: 12 },
    ];
    items.forEach((t) =>
      sheet.addRow({
        date: t.date,
        description: t.description,
        type: t.type === "receita" ? "Receita" : "Despesa",
        category: t.category,
        amount: t.amount,
        sample: t.sample ? "Sim" : "Não",
      }),
    );
    sheet.getColumn("amount").numFmt = "#,##0.00";
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    const buffer = await book.xlsx.writeBuffer();
    download(
      new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "FinanChat-historico.xlsx",
    );
    return;
  }
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("FinanChat - Histórico de transações", 14, 18);
  doc.setFontSize(10);
  doc.text(`${items.length} lançamentos - valores em R$`, 14, 26);
  autoTable(doc, {
    startY: 32,
    head: [["Data", "Descrição", "Tipo", "Categoria", "Valor (R$)"]],
    body: items.map((t) => [
      t.date.split("-").reverse().join("/"),
      `${t.description}${t.sample ? " (Exemplo)" : ""}`,
      t.type === "receita" ? "Receita" : "Despesa",
      t.category,
      t.amount.toFixed(2).replace(".", ","),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 1: { cellWidth: 60 } },
    theme: "grid",
  });
  doc.save("FinanChat-historico.pdf");
}
