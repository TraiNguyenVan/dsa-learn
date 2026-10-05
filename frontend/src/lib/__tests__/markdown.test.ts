import { describe, it, expect } from 'vitest';
import { renderMarkdownWithMath } from '../markdown';

// KaTeX intentionally embeds the original TeX inside
// <annotation encoding="application/x-tex"> for accessibility. That is rendered
// output, not leaked source, so strip it before asserting that nothing raw
// survives into what the user actually sees.
function withoutMathAnnotations(html: string): string {
  return html.replace(/<annotation[\s\S]*?<\/annotation>/g, '');
}

describe('renderMarkdownWithMath', () => {
  it('renders inline math and leaves no literal dollar signs', () => {
    const html = renderMarkdownWithMath('Lookup costs $O(1)$ on average.');
    expect(html).toContain('class="katex"');
    expect(withoutMathAnnotations(html)).not.toContain('$');
  });

  it('renders display math into a katex-display block', () => {
    const html = renderMarkdownWithMath('$$\\frac{a}{b}$$');
    expect(html).toContain('katex-display');
  });

  it('renders lesson-style math containing \\text{} with escaped underscores', () => {
    const html = renderMarkdownWithMath(
      '**Direct Indexing**: $arr[k] = \\text{base\\_address} + (k \\times \\text{element\\_size})$. Always $O(1)$.'
    );
    expect(html).toContain('<strong>');
    expect(html).toContain('class="katex"');
    expect(withoutMathAnnotations(html)).not.toContain('**');
    expect(withoutMathAnnotations(html)).not.toContain('base\\_address');
  });

  it('renders bold, bullets and nested lists', () => {
    const markdown = [
      '- **Hash Table Buckets & Collisions**: `std::unordered_map` uses:',
      '  - **Separate Chaining**: buckets point to a linked list.',
      '  - **Open Addressing**: entries reside in table slots.',
    ].join('\n');
    const html = renderMarkdownWithMath(markdown, { breaks: true });
    expect(html).toContain('<strong>');
    expect(html).toContain('<code>');
    expect(html).not.toContain('`');
    expect(html).not.toContain('**');
    // one outer list plus one nested list
    expect(html.match(/<ul>/g)?.length).toBe(2);
  });

  it('renders ordered lists without leaking the raw markers', () => {
    const html = renderMarkdownWithMath('1. First\n2. Second');
    expect(html).toContain('<ol>');
    expect(html).not.toContain('1. First');
  });

  it('strips scripts and event handlers (DOMPurify runs before KaTeX injection)', () => {
    const html = renderMarkdownWithMath(
      'hello <script>alert(1)</script> <img src="x" onerror="alert(2)"> $O(1)$'
    );
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).toContain('class="katex"');
  });

  it('does not throw on malformed math', () => {
    expect(() => renderMarkdownWithMath('broken $x^{$ math')).not.toThrow();
    expect(renderMarkdownWithMath('broken $x^{$ math')).toBeTypeOf('string');
  });

  it('returns an empty string for empty input', () => {
    expect(renderMarkdownWithMath('')).toBe('');
  });

  it('reflows single newlines by default and preserves them with breaks: true', () => {
    const prose = 'line one\nline two';
    expect(renderMarkdownWithMath(prose)).not.toContain('<br>');
    expect(renderMarkdownWithMath(prose, { breaks: true })).toContain('<br>');
  });
});