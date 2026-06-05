/** Strip markdown inline formatting that AI may add to headers. */
function normalizeHeader(raw: string): string {
  return raw
    .replace(/^\*\*(.+?)\*\*$/, '$1')  // **Header**
    .replace(/^\*(.+?)\*$/, '$1')        // *Header*
    .trim();
}

export function parseSections(content: string): Record<string, string> {
  const normalized = content.replace(/\r\n/g, '\n');
  const sections: Record<string, string> = {};
  const lines = normalized.split('\n');

  let currentSection = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^##\s*(.+?)\s*$/);
    if (headerMatch) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = normalizeHeader(headerMatch[1]);
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentSection) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}
