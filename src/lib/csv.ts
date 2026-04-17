/**
 * Tiny CSV utilities — avoid pulling in a dependency.
 */

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // RFC 4180: quote if contains comma, quote, CR, or LF
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function toCsv(
  rows: Array<Record<string, unknown>>,
  headers?: string[],
): string {
  if (rows.length === 0) return (headers ?? []).join(',')
  const keys = headers ?? Object.keys(rows[0])
  const head = keys.map(escapeCsvCell).join(',')
  const body = rows
    .map((row) => keys.map((k) => escapeCsvCell(row[k])).join(','))
    .join('\n')
  return `${head}\n${body}`
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
