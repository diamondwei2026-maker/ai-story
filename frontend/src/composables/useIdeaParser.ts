import { computed, type Ref } from 'vue';

export interface SellPoint {
  index: number;
  title: string;
  coreSellPoint: string;
  marketScore: number;
  differentiation: string;
}

/**
 * 剥离 Markdown bold 标记，处理 AI 输出如 **核心卖点：** / **市场匹配度：** 等格式。
 * "**标签：**内容" → "标签：内容"，"**标签**：内容" → "标签：内容"
 */
function stripBoldMarkers(text: string): string {
  return text
    // 模式1: **标签：** 或 **标签:** → 标签：
    .replace(/\*\*([^*]+?)[：:]\*\*/g, '$1：')
    // 模式2: **标签**： 或 **标签**: → 标签：
    .replace(/\*\*([^*]+?)\*\*\s*[：:]/g, '$1：')
    // 模式3: 残留的独立 **...**（兜底）
    .replace(/\*\*([^*]+?)\*\*/g, '$1');
}

/**
 * P2 兜底解析：按 ## 标题分块，从每个含"卖点方案"或"核心卖点"的块中提取 SellPoint。
 * 处理 AI 输出标题格式偏差（如缺少编号、全角数字、多余空格等）。
 */
function parseByBlocks(text: string): SellPoint[] {
  const result: SellPoint[] = [];
  const blocks = text.split(/\n(?=##\s)/);
  let autoIndex = 0;

  for (const block of blocks) {
    // 只处理看起来像卖点方案的块
    if (!/卖点方案|核心卖点/.test(block)) continue;

    const cleanBody = stripBoldMarkers(
      block.replace(/^##\s*卖点方案\s*\d*\s*[:：]?\s*\n*/, '').replace(/^\s*\n+/, ''),
    );
    const titleMatch = cleanBody.match(/^([^\n-]+)/);

    const sellPointMatch =
      cleanBody.match(/核心卖点[：:]\s*(.+)/) ??
      cleanBody.match(/【核心卖点】[：:]?\s*(.+)/);
    const scoreMatch = cleanBody.match(/市场匹配度[：:]\s*([\d.]+)(?:\s*\/\s*10)?/);
    const diffMatch =
      cleanBody.match(/差异化分析[：:]\s*(.+)/) ??
      cleanBody.match(/差异化[：:]\s*(.+)/);

    // 尝试从块标题中提取编号
    const numFromHeader = block.match(/卖点方案\s*(\d+)/);
    const displayIndex = numFromHeader ? parseInt(numFromHeader[1], 10) - 1 : autoIndex;

    if (sellPointMatch || scoreMatch) {
      result.push({
        index: displayIndex,
        title: titleMatch ? titleMatch[1].trim() : `卖点方案 ${displayIndex + 1}`,
        coreSellPoint: sellPointMatch ? sellPointMatch[1].trim() : '',
        marketScore: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
        differentiation: diffMatch ? diffMatch[1].trim() : '',
      });
      autoIndex++;
    }
  }

  return result;
}

export function useIdeaParser(
  output: Ref<string | undefined | null>,
  review: Ref<Record<string, unknown> | undefined | null>,
) {
  const sellPoints = computed((): SellPoint[] => {
    const text = output.value ?? '';
    const result: SellPoint[] = [];

    // 兼容半角 : 和全角 ：的小标题分隔
    const HEADER_RE = /##\s*卖点方案\s*(\d+)\s*[:：]/g;
    const headers = [...text.matchAll(HEADER_RE)];
    if (headers.length === 0) {
      // ── P2 兜底：按 ## 标题分块模糊解析 ──
      const fallbackBlocks = parseByBlocks(text);
      if (fallbackBlocks.length > 0) return fallbackBlocks;

      if (text.trim().length > 0) {
        console.warn('[useIdeaParser] 解析 sellPoints 失败（header 匹配 + 块分拆均失败），output 前 200 字符:', text.substring(0, 200));
      }
      return result;
    }

    // 按 header index 切分 body
    const bodies: string[] = [];
    for (let i = 0; i < headers.length; i++) {
      const start = (headers[i].index ?? 0) + headers[i][0].length;
      const end = i + 1 < headers.length ? headers[i + 1].index : text.length;
      bodies.push(text.substring(start, end));
    }

    for (let i = 0; i < headers.length; i++) {
      const index = parseInt(headers[i][1], 10) - 1;
      const body = bodies[i] ?? '';

      // 去除 body 前导空白行，并剥离 Markdown bold 标记
      const cleanBody = stripBoldMarkers(body.replace(/^\s*\n+/, ''));
      const titleMatch = cleanBody.match(/^([^\n-]+)/);
      // 匹配核心卖点（bold 已在 stripBoldMarkers 中处理）
      const sellPointMatch =
        cleanBody.match(/核心卖点[：:]\s*(.+)/) ??
        cleanBody.match(/【核心卖点】[：:]?\s*(.+)/);
      // 市场匹配度支持 "8.5"、"8.5 / 10"
      const scoreMatch =
        cleanBody.match(/市场匹配度[：:]\s*([\d.]+)(?:\s*\/\s*10)?/);
      const diffMatch =
        cleanBody.match(/差异化分析[：:]\s*(.+)/) ??
        cleanBody.match(/差异化[：:]\s*(.+)/);

      result.push({
        index,
        title: titleMatch ? titleMatch[1].trim() : `卖点方案 ${index + 1}`,
        coreSellPoint: sellPointMatch ? sellPointMatch[1].trim() : '',
        marketScore: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
        differentiation: diffMatch ? diffMatch[1].trim() : '',
      });
    }

    if (result.length === 0 && text.trim().length > 0) {
      console.warn('[useIdeaParser] sellPoints 数组为空，output 前 200 字符:', text.substring(0, 200));
    }

    return result;
  });

  const hasSummary = computed(() => {
    const rv = review.value as Record<string, any> | null | undefined;
    if (rv?.summaryGenerated) return true;
    const text = output.value ?? '';
    return /#+\s*(?:一句话简介|500字简介)/.test(text);
  });

  const oneLiner = computed(() => {
    const rv = review.value as Record<string, any> | null | undefined;
    if (typeof rv?.oneLiner === 'string' && rv.oneLiner.length > 0) return rv.oneLiner;
    const text = output.value ?? '';
    const match = text.match(/#+\s*一句话简介[\s\S]*?\n([\s\S]*?)(?=\n#+\s|\n*$)/);
    return match ? match[1].trim() : '';
  });

  const fullSummary = computed(() => {
    const rv = review.value as Record<string, any> | null | undefined;
    if (typeof rv?.fullSummary === 'string' && rv.fullSummary.length > 0) return rv.fullSummary;
    const text = output.value ?? '';
    const parts = text.split(/#+\s*500字简介\s*\n/);
    if (parts.length < 2) return '';
    return parts[1].trim();
  });

  return { sellPoints, hasSummary, oneLiner, fullSummary };
}
