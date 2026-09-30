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

describe('stripInternalBlocks', () => {
  it('removes complete and partial json_plan blocks and auto titles', () => {
    const done = 'Listo\n```json_plan\n[{"ExerciciId":1}]\n```\n[TITULO_AUTO: Pierna]';
    expect(renderChatMarkdown(done)).toBe('<p>Listo</p>');
    expect(renderChatMarkdown('Añado\n```json_plan\n[{"Exer')).toBe('<p>Añado</p>');
  });
});
