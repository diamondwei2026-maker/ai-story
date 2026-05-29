import { computed, type Ref } from 'vue';
import type { SellPoint } from '@/components/MarketAnalysisCard.vue';

export function useIdeaParser(
  output: Ref<string | undefined | null>,
  review: Ref<Record<string, unknown> | undefined | null>,
) {
  const sellPoints = computed((): SellPoint[] => {
    const text = output.value ?? '';
    const result: SellPoint[] = [];
    const sections = text.split(/## 卖点方案 \d+:/g).slice(1);
    const headers = text.match(/## 卖点方案 (\d+):/g);
    if (!headers) return result;

    for (let i = 0; i < headers.length; i++) {
      const numMatch = headers[i].match(/卖点方案 (\d+):/);
      if (!numMatch) continue;
      const index = parseInt(numMatch[1], 10) - 1;
      const body = sections[i] ?? '';

      const titleMatch = body.match(/^([^\n-]+)/);
      const sellPointMatch = body.match(/核心卖点:\s*(.+)/);
      const scoreMatch = body.match(/市场匹配度:\s*([\d.]+)/);
      const refsMatch = body.match(/爆款参考:\s*(.+)/);
      const diffMatch = body.match(/差异化分析:\s*(.+)/);

      const hitReferences = refsMatch
        ? refsMatch[1]
            .split(/[，,《》]/)
            .filter(Boolean)
            .map((r) => {
              const cleaned = r.replace(/[《》]/g, '').trim();
              return cleaned ? `《${cleaned}》` : '';
            })
            .filter(Boolean)
        : [];

      result.push({
        index,
        title: titleMatch ? titleMatch[1].trim() : `卖点方案 ${index + 1}`,
        coreSellPoint: sellPointMatch ? sellPointMatch[1].trim() : '',
        marketScore: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
        hitReferences,
        differentiation: diffMatch ? diffMatch[1].trim() : '',
      });
    }

    return result;
  });

  const hasSummary = computed(() => {
    const rv = review.value as Record<string, any> | null | undefined;
    if (rv?.summaryGenerated) return true;
    const text = output.value ?? '';
    return /#+ (?:一句话简介|500字简介)/.test(text);
  });

  const oneLiner = computed(() => {
    const rv = review.value as Record<string, any> | null | undefined;
    if (typeof rv?.oneLiner === 'string' && rv.oneLiner.length > 0) return rv.oneLiner;
    const text = output.value ?? '';
    const match = text.match(/#+ 一句话简介\n([\s\S]*?)(?=\n#+ |$)/);
    return match ? match[1].trim() : '';
  });

  const fullSummary = computed(() => {
    const rv = review.value as Record<string, any> | null | undefined;
    if (typeof rv?.fullSummary === 'string' && rv.fullSummary.length > 0) return rv.fullSummary;
    const text = output.value ?? '';
    const parts = text.split(/#+ 500字简介\n/);
    if (parts.length < 2) return '';
    return parts[1].trim();
  });

  return { sellPoints, hasSummary, oneLiner, fullSummary };
}
