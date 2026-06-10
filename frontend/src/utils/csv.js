/**
 * CSV export utility.
 * Converts an array of objects to CSV and triggers a browser download.
 */

const BOM = "\uFEFF";

function fmt(val) {
  if (val == null) return "";
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Export an array of objects as a CSV file.
 * @param {object[]} data       - Array of row objects
 * @param {string}   filename   - Output filename (without extension)
 * @param {{ key: string, label: string }[]} columns - Column definitions (optional).
 *        If omitted, columns are inferred from the keys of the first row.
 */
export function exportToCsv(data, filename, columns) {
  if (!data || data.length === 0) return;

  const headers = columns
    ? columns.map((c) => c.label || c.key)
    : Object.keys(data[0]);
  const keys = columns
    ? columns.map((c) => c.key)
    : Object.keys(data[0]);

  const rows = [headers.map(fmt).join(",")];
  for (const row of data) {
    rows.push(keys.map((k) => fmt(row[k])).join(","));
  }

  const blob = new Blob([BOM + rows.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
