/**
 * Minimal CSV utilities for client-side export.
 * Escapes values per RFC 4180: wraps in quotes if value contains a comma, quote, or newline;
 * doubles up any embedded quotes.
 */

export function toCsvRow(values: Array<string | number | boolean | null | undefined>): string {
  return values
    .map((v) => {
      if (v == null) return '';
      const s = String(v);
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(',');
}

export function toCsv(rows: Array<Array<string | number | boolean | null | undefined>>): string {
  return rows.map(toCsvRow).join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
