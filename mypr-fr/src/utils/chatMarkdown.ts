// Markdown mínimo para las respuestas del coach: negrita, cursiva, listas y encabezados.
// Todo el texto se escapa antes de aplicar formato, así que no se puede inyectar HTML.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** Quita los bloques internos que el backend procesa (plan JSON, título automático), incluso a medio streaming. */
export function stripInternalBlocks(text: string): string {
  return text
    .replace(/```json_plan[\s\S]*?(```|$)/g, '')
    .replace(/\[TITULO_AUTO:[^\]]*(\]|$)/g, '')
    .trim();
}

function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map(c => c.trim());
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSeparator = (l: string) => isTableRow(l) && splitRow(l).every(c => /^:?-+:?$/.test(c));

function renderTable(header: string[], aligns: string[], rows: string[][]): string {
  const cls = (i: number) => (aligns[i] ? ` class="${aligns[i]}"` : '');
  const th = header.map((c, i) => `<th${cls(i)}>${inline(c)}</th>`).join('');
  const body = rows
    .map(r => `<tr>${header.map((_, i) => `<td${cls(i)}>${inline(r[i] ?? '')}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="md-table-wrap"><table class="md-table"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function renderChatMarkdown(text: string): string {
  text = stripInternalBlocks(text);
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    // Tabla simple: fila de cabecera + separador (---) + filas
    if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      closeList();
      const header = splitRow(line);
      const aligns = splitRow(lines[i + 1]).map(c =>
        c.startsWith(':') && c.endsWith(':') ? 'al-c' : c.endsWith(':') ? 'al-r' : '');
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) rows.push(splitRow(lines[j++]));
      out.push(renderTable(header, aligns, rows));
      i = j - 1;
      continue;
    }

    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const h = line.match(/^#{1,4}\s+(.*)$/);

    if (ul || ol) {
      const type = ul ? 'ul' : 'ol';
      if (list !== type) {
        closeList();
        out.push(`<${type}>`);
        list = type;
      }
      out.push(`<li>${inline((ul || ol)![1])}</li>`);
      continue;
    }
    closeList();
    if (h) out.push(`<p class="md-heading">${inline(h[1])}</p>`);
    else if (line.trim() === '') out.push('<div class="md-gap"></div>');
    else out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('');
}
