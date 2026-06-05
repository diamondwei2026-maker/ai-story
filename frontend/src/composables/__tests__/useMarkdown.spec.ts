import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '@/utils/markdown';

describe('renderMarkdown', () => {
  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('renders plain text as a paragraph', () => {
    const result = renderMarkdown('Hello world');
    expect(result).toBe('<p>Hello world</p>');
  });

  it('renders multiple paragraphs separated by blank lines', () => {
    const result = renderMarkdown('First paragraph.\n\nSecond paragraph.');
    expect(result).toContain('<p>First paragraph.</p>');
    expect(result).toContain('<p>Second paragraph.</p>');
  });

  it('renders ## headers as h3', () => {
    const result = renderMarkdown('## 时代背景');
    expect(result).toBe('<h3>时代背景</h3>');
  });

  it('renders # headers as h2', () => {
    const result = renderMarkdown('# 世界观');
    expect(result).toBe('<h2>世界观</h2>');
  });

  it('renders ### headers as h4', () => {
    const result = renderMarkdown('### 细分');
    expect(result).toBe('<h4>细分</h4>');
  });

  it('renders **bold** inline', () => {
    const result = renderMarkdown('这是**重点**内容');
    expect(result).toBe('<p>这是<strong>重点</strong>内容</p>');
  });

  it('renders *italic* inline', () => {
    const result = renderMarkdown('这是*强调*内容');
    expect(result).toBe('<p>这是<em>强调</em>内容</p>');
  });

  it('renders unordered lists', () => {
    const result = renderMarkdown('- 第一项\n- 第二项\n- 第三项');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>第一项</li>');
    expect(result).toContain('<li>第二项</li>');
    expect(result).toContain('<li>第三项</li>');
    expect(result).toContain('</ul>');
  });

  it('renders ordered lists', () => {
    const result = renderMarkdown('1. 第一步\n2. 第二步\n3. 第三步');
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>第一步</li>');
    expect(result).toContain('<li>第二步</li>');
    expect(result).toContain('<li>第三步</li>');
    expect(result).toContain('</ol>');
  });

  it('renders blockquotes', () => {
    const result = renderMarkdown('> 这是一段引用');
    expect(result).toContain('<blockquote>');
    expect(result).toContain('<p>这是一段引用</p>');
    expect(result).toContain('</blockquote>');
  });

  it('escapes HTML entities', () => {
    const result = renderMarkdown('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('renders bold inside headers', () => {
    const result = renderMarkdown('## **重要**标题');
    expect(result).toBe('<h3><strong>重要</strong>标题</h3>');
  });

  it('renders bold inside list items', () => {
    const result = renderMarkdown('- 这是**重点**项');
    expect(result).toContain('<li>这是<strong>重点</strong>项</li>');
  });

  it('renders horizontal rules', () => {
    const result = renderMarkdown('---');
    expect(result).toBe('<hr />');
  });

  it('handles mixed content: headers, lists, paragraphs', () => {
    const input = [
      '## 时代背景',
      '这是一个修真世界。',
      '',
      '- 正道联盟',
      '- 魔教',
      '',
      '结尾段落。',
    ].join('\n');

    const result = renderMarkdown(input);
    expect(result).toContain('<h3>时代背景</h3>');
    expect(result).toContain('<p>这是一个修真世界。</p>');
    expect(result).toContain('<li>正道联盟</li>');
    expect(result).toContain('<li>魔教</li>');
    expect(result).toContain('<p>结尾段落。</p>');
  });

  it('normalizes CRLF to LF', () => {
    const result = renderMarkdown('Line 1\r\n\r\nLine 2');
    expect(result).toContain('<p>Line 1</p>');
    expect(result).toContain('<p>Line 2</p>');
  });

  it('splits inline list items on "。 - " into separate lines', () => {
    const result = renderMarkdown(
      '- 魔力守恒：世界总魔力粒子仍在缓慢衰减，无法再生。 - 算法锁死：所有科技装备必须每日同步。 - 反噬风险：若强行破解会导致死亡。',
    );
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>魔力守恒：世界总魔力粒子仍在缓慢衰减，无法再生。</li>');
    expect(result).toContain('<li>算法锁死：所有科技装备必须每日同步。</li>');
    expect(result).toContain('<li>反噬风险：若强行破解会导致死亡。</li>');
    expect(result).toContain('</ul>');
  });

  it('splits inline list items on " - term：" pattern (no sentence-ending punctuation)', () => {
    const result = renderMarkdown(
      '- 魔法：需要魔力亲和力以及魔法粒子 - 魔力科技：需要魔力萃取器供能 - 纯科技：依赖工程制造与燃料',
    );
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>魔法：需要魔力亲和力以及魔法粒子</li>');
    expect(result).toContain('<li>魔力科技：需要魔力萃取器供能</li>');
    expect(result).toContain('<li>纯科技：依赖工程制造与燃料</li>');
    expect(result).toContain('</ul>');
  });

  it('keeps single-item list lines unchanged', () => {
    const result = renderMarkdown('- 单一规则项。');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>单一规则项。</li>');
    expect(result).toContain('</ul>');
  });

  it('does not split inline items without sentence-ending punctuation', () => {
    // " - " within a single item body should not be split
    const result = renderMarkdown('- 这是内容 - 包含破折号但不是列表分隔符');
    expect(result).toContain('<li>这是内容 - 包含破折号但不是列表分隔符</li>');
  });

  it('strips 【】 prompt markers from output', () => {
    const result = renderMarkdown('## 时代背景\n内容段落。\n【角色设定】\n## 主角\n名称：林夜');
    expect(result).toContain('<h3>时代背景</h3>');
    expect(result).toContain('<h3>主角</h3>');
    expect(result).not.toContain('【角色设定】');
  });
});
