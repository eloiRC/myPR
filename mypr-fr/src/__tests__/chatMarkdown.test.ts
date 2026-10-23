import { describe, it, expect } from 'vitest';
import { renderChatMarkdown } from '../utils/chatMarkdown';

describe('renderChatMarkdown', () => {
  it('escapes HTML', () => {
    expect(renderChatMarkdown('<img src=x onerror=alert(1)>')).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  });

  it('renders bold, italics and code', () => {
    expect(renderChatMarkdown('**Press** *banca* `4x8`')).toBe('<p><strong>Press</strong> <em>banca</em> <code>4x8</code></p>');
  });

  it('groups list items', () => {
    expect(renderChatMarkdown('- a\n- b\n1. c')).toBe('<ul><li>a</li><li>b</li></ul><ol><li>c</li></ol>');
  });

  it('renders headings and blank lines', () => {
    expect(renderChatMarkdown('## Plan\n\nhola')).toBe('<p class="md-heading">Plan</p><div class="md-gap"></div><p>hola</p>');
  });
});

describe('tables', () => {
  it('renders a pipe table with alignment', () => {
    const md = '| Ejercicio | Series |\n|:--|--:|\n| Press **banca** | 4x8 |\n| Remo | 3x10 |';
    expect(renderChatMarkdown(md)).toBe(
      '<div class="md-table-wrap"><table class="md-table"><thead><tr><th>Ejercicio</th><th class="al-r">Series</th></tr></thead>' +
      '<tbody><tr><td>Press <strong>banca</strong></td><td class="al-r">4x8</td></tr><tr><td>Remo</td><td class="al-r">3x10</td></tr></tbody></table></div>');
  });

  it('escapes HTML inside cells', () => {
    const out = renderChatMarkdown('| <b> |\n|---|\n| <img onerror=x> |');
    expect(out).toContain('&lt;b&gt;');
    expect(out).toContain('&lt;img onerror=x&gt;');
    expect(out).not.toContain('<img');
  });

  it('keeps a lone header row as text (streaming) and pads short rows', () => {
    expect(renderChatMarkdown('| a | b |')).toBe('<p>| a | b |</p>');
    expect(renderChatMarkdown('| a | b |\n|---|---|\n| 1 |')).toContain('<td>1</td><td></td>');
  });

  it('continues with normal markdown after the table', () => {
    expect(renderChatMarkdown('| a |\n|---|\n| 1 |\ntexto')).toMatch(/<\/table><\/div><p>texto<\/p>$/);
  });
});

describe('stripInternalBlocks', () => {
  it('removes complete and partial json_plan blocks and auto titles', () => {
    const done = 'Listo\n```json_plan\n[{"ExerciciId":1}]\n```\n[TITULO_AUTO: Pierna]';
    expect(renderChatMarkdown(done)).toBe('<p>Listo</p>');
    expect(renderChatMarkdown('Añado\n```json_plan\n[{"Exer')).toBe('<p>Añado</p>');
  });
});
