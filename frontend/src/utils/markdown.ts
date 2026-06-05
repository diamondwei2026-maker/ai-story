/**
 * Lightweight Markdown → HTML renderer.
 *
 * Handles the subset of Markdown that AI prompt templates are designed to produce:
 *   ## / ### / #### headers
 *   **bold** / *italic*
 *   - unordered list items
 *   1. ordered list items
 *   > blockquote
 *   blank-line-separated paragraphs
 *
 * Security: HTML entities in the input are escaped before rendering.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/**
 * AI models sometimes output multiple list items on one line:
 *   "- 规则一。 - 规则二。 - 规则三。"
 * Split these into proper one-item-per-line format before parsing.
 */
/**
 * Try to split a list-item body into multiple items.
 * AI often outputs "- A desc。- B desc。- C desc" or "- A：B - C：D" on one line.
 *
 * Strategy (tried in order):
 *   1. Split on sentence-ending punctuation + " - "  (。 - 、； - )
 *   2. Split on " - " followed by a short term + colon  ( - 魔力科技：)
 */
function splitInlineListItems(body: string): string[] | null {
  // Strategy 1: sentence-ending punctuation before " - "
  const parts1 = body.split(/(?<=[。；！？）])[\s]*\-[\s]+/);
  if (parts1.length > 1) return parts1;

  // Strategy 2: " - " followed by Chinese term ending with ：or :
  // Pattern: space-dash-space + 1-15 chars (term name) + colon
  const parts2 = body.split(/[\s]*\-[\s]+(?=[^\s]{1,20}[：:])/);
  if (parts2.length > 1) return parts2;

  return null;
}

/** Strip prompt-structure markers that AI may accidentally echo into output. */
function stripPromptMarkers(raw: string): string {
  // Remove lines that are ONLY a 【】 marker (e.g. "【角色设定】")
  return raw
    .split('\n')
    .filter((line) => !/^【[^】]+】\s*$/.test(line.trim()))
    .join('\n');
}

function normalizeInlineLists(raw: string): string {
  return raw
    .split('\n')
    .map((line) => {
      // Unordered list marker?
      const um = line.match(/^([-*+])\s/);
      if (um) {
        const marker = um[0];
        const body = line.slice(marker.length);
        const parts = splitInlineListItems(body);
        if (parts) return parts.map((p) => marker + p).join('\n');
        return line;
      }
      // Ordered list marker?
      const om = line.match(/^(\d+\.)\s/);
      if (om) {
        const marker = om[0];
        const body = line.slice(marker.length);
        // Split on sentence-ending punctuation followed by " N. "
        const parts = body.split(/(?<=[。；！？）])[\s]*\d+\.[\s]+/);
        if (parts.length > 1) {
          let counter = parseInt(om[1], 10);
          return parts.map((p) => `${counter++}. ${p}`).join('\n');
        }
        return line;
      }
      return line;
    })
    .join('\n');
}

export function renderMarkdown(raw: string): string {
  if (!raw) return '';

  const normalized = stripPromptMarkers(normalizeInlineLists(raw.replace(/\r\n/g, '\n')));
  const lines = normalized.split('\n');

  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line → skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // ### / ## / # header → h2–h6
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const tag = `h${Math.min(level + 1, 6)}`;
      html.push(`<${tag}>${renderInline(escapeHtml(headerMatch[2]))}</${tag}>`);
      i++;
      continue;
    }

    // > blockquote
    if (line.startsWith('> ')) {
      const content = renderInline(escapeHtml(line.slice(2)));
      html.push(`<blockquote><p>${content}</p></blockquote>`);
      i++;
      continue;
    }

    // --- horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      html.push('<hr />');
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      html.push('<ul>');
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        const item = lines[i].replace(/^[-*+]\s+/, '');
        html.push(`<li>${renderInline(escapeHtml(item))}</li>`);
        i++;
      }
      html.push('</ul>');
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      html.push('<ol>');
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const item = lines[i].replace(/^\d+\.\s+/, '');
        html.push(`<li>${renderInline(escapeHtml(item))}</li>`);
        i++;
      }
      html.push('</ol>');
      continue;
    }

    // Paragraph: accumulate lines until blank / special token
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,4}\s|>\s|[-*+]\s|\d+\.\s|[-*_]{3,}\s*$)/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      const content = renderInline(escapeHtml(paraLines.join('\n')));
      html.push(`<p>${content}</p>`);
    }
  }

  return html.join('\n');
}
