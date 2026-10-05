import { marked } from 'marked';
import katex from 'katex';
import DOMPurify from 'dompurify';

export interface RenderMarkdownOptions {
  /** Treat a single newline as a hard line break (default: false, reflow into paragraphs). */
  breaks?: boolean;
}

/**
 * Render markdown containing LaTeX math into sanitized HTML.
 *
 * Pipeline order matters and must not be changed:
 *   1. lift `$$...$$` / `$...$` out into opaque placeholder tokens
 *   2. parse the remaining markdown with marked
 *   3. sanitize with DOMPurify
 *   4. splice the KaTeX HTML into the placeholders LAST
 *
 * Sanitizing after step 4 would strip KaTeX's MathML and <annotation> output.
 */
export function renderMarkdownWithMath(
  markdown: string,
  options: RenderMarkdownOptions = {}
): string {
  if (!markdown) return '';
  const { breaks = false } = options;

  const mathTokens: Array<{ token: string; math: string; display: boolean }> = [];
  let counter = 0;

  // 1. Extract display math $$...$$
  let processed = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    const token = `KATEXBLOCKTOKEN${counter++}X`;
    mathTokens.push({ token, math: math.trim(), display: true });
    return token;
  });

  // 2. Extract inline math $...$
  processed = processed.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (_, prefix, math) => {
    const token = `KATEXINLINETOKEN${counter++}X`;
    mathTokens.push({ token, math: math.trim(), display: false });
    return `${prefix}${token}`;
  });

  // 3. Parse markdown into HTML
  let html = marked.parse(processed, { async: false, gfm: true, breaks }) as string;

  // 4. Sanitize with DOMPurify
  html = DOMPurify.sanitize(html);

  // 5. Replace tokens with rendered KaTeX formulas
  for (const { token, math, display } of mathTokens) {
    try {
      const rendered = katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
      });
      html = html.replaceAll(token, rendered);
    } catch {
      html = html.replaceAll(token, display ? `$$${math}$$` : `$${math}$`);
    }
  }

  return html;
}