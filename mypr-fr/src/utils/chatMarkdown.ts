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

export function renderChatMarkdown(text: string): string {
  text = stripInternalBlocks(text);
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
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
