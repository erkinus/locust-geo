// Экспорт текущей таблицы в CSV (prompts/06_popups_panels.md, п.3).

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows, columns) {
  const header = columns.map((c) => csvEscape(c.label)).join(";");
  const body = rows
    .map((row) => columns.map((c) => csvEscape(c.value(row))).join(";"))
    .join("\n");
  return "﻿" + header + "\n" + body; // BOM — чтобы Excel корректно открыл кириллицу
}

export function downloadCsv(filename, csvString) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
