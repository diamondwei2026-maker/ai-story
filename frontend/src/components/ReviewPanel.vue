<template>
  <div data-testid="review-panel" class="review-panel">
    <!-- Header -->
    <div class="review-panel__title-row">
      <h3 class="review-panel__title">内容安全审核结果</h3>
      <button class="review-panel__back-btn" @click="$emit('back')">
        <EditOutlined />
        返回编辑
      </button>
    </div>

    <!-- Conclusion Banner -->
    <div data-testid="verdict-banner" class="review-panel__conclusion" :class="conclusionClass">
      <SafetyOutlined class="review-panel__conclusion-icon" />
      <div>
        <div class="review-panel__conclusion-label">{{ verdictLabel }} — {{ reviewResult.verdict }}</div>
        <p class="review-panel__conclusion-desc">{{ conclusionDesc }}</p>
      </div>
    </div>

    <!-- Dimension Scores -->
    <div class="review-panel__dimensions">
      <h4 class="review-panel__dimensions-title">四维度评分</h4>
      <div class="review-panel__dimensions-list">
        <div
          v-for="dim in dimensionScores"
          :key="dim.key"
          data-testid="`dimension-${dim.key}`"
          class="review-panel__dim-row"
        >
          <div class="review-panel__dim-score">
            <span class="review-panel__dim-badge" :class="scoreBadgeClass(dim.score)">
              {{ dim.score }} 分
            </span>
            <span class="review-panel__dim-label">{{ dim.label }}</span>
          </div>
          <div class="review-panel__dim-bar">
            <div class="review-panel__dim-bar-bg">
              <div
                class="review-panel__dim-bar-fill"
                :class="scoreBarClass(dim.score)"
                :style="{ width: dim.score * 10 + '%' }"
              />
            </div>
            <p class="review-panel__dim-suggestion">{{ dim.suggestion }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Issues list -->
    <div
      v-if="allIssues.length > 0"
      data-testid="review-issues"
      class="review-panel__issues"
    >
      <div
        v-for="(issue, idx) in allIssues"
        :key="idx"
        class="review-issue"
      >
        <a-tag :color="severityTagColor(issue.severity)" class="review-issue__severity">
          {{ issue.severity }}
        </a-tag>
        <span class="review-issue__location">{{ issue.location }}</span>
        <span class="review-issue__suggestion">{{ issue.suggestion }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="review-panel__actions">
      <!-- PASS -->
      <button
        v-if="reviewResult.verdict === 'PASS'"
        class="review-panel__btn review-panel__btn--confirm"
        @click="$emit('confirm')"
      >
        <CheckOutlined />
        确认完成
      </button>

      <!-- PASS_WITH_SUGGESTIONS / NEEDS_REVISION -->
      <template v-if="reviewResult.verdict === 'PASS_WITH_SUGGESTIONS' || reviewResult.verdict === 'NEEDS_REVISION'">
        <button
          class="review-panel__btn review-panel__btn--confirm"
          @click="$emit('confirm')"
        >
          <CheckOutlined />
          忽略建议，直接确认
        </button>
        <button
          class="review-panel__btn review-panel__btn--edit"
          @click="$emit('back')"
        >
          <EditOutlined />
          手动修改后重新审核
        </button>
      </template>

      <!-- BLOCKED -->
      <button
        v-if="reviewResult.verdict === 'BLOCKED'"
        class="review-panel__btn review-panel__btn--blocked-edit"
        @click="$emit('back')"
      >
        <EditOutlined />
        返回修改正文
      </button>

      <!-- Common: Appeal + Dispute -->
      <button
        v-if="(reviewResult.appealCount ?? 0) === 0"
        class="review-panel__btn review-panel__btn--appeal"
        @click="showAppeal = !showAppeal"
      >
        <MessageOutlined />
        提出上诉
      </button>
      <button
        class="review-panel__btn review-panel__btn--dispute"
        @click="$emit('dispute')"
      >
        <ExclamationCircleOutlined />
        标记为争议
      </button>
    </div>

    <!-- Appeal Input -->
    <div v-if="showAppeal" class="review-panel__appeal">
      <div class="review-panel__appeal-header">
        <MessageOutlined />
        <div>
          <span class="review-panel__appeal-title">提交上诉说明</span>
          <p class="review-panel__appeal-hint">每章仅限上诉一次，请详细说明理由</p>
        </div>
      </div>
      <textarea
        v-model="appealText"
        placeholder="请详细说明本章内容的创作意图和无害性理由..."
        class="review-panel__appeal-textarea"
        rows="3"
      />
      <button
        class="review-panel__appeal-submit"
        :disabled="!appealText.trim()"
        @click="$emit('appeal', appealText)"
      >
        <SendOutlined />
        提交上诉
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" data-testid="review-loading-indicator" class="review-panel__loading">
      处理中...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  SafetyOutlined,
  CheckOutlined,
  EditOutlined,
  MessageOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
} from '@ant-design/icons-vue';
import type { ReviewIssue, ReviewResult } from '@/types';

const props = withDefaults(defineProps<{
  reviewResult: ReviewResult;
  chapterStatus: string;
  loading?: boolean;
}>(), {
  loading: false,
});

const emit = defineEmits<{
  'back': [];
  'confirm': [];
  'dispute': [];
  'appeal': [reason: string];
}>();

const showAppeal = ref(false);
const appealText = ref('');

const dimensions = [
  { key: 'POLITICAL_SAFETY', label: '政治安全' },
  { key: 'SEXUAL_CONTENT', label: '色情尺度' },
  { key: 'VIOLENCE', label: '暴力渲染' },
  { key: 'VALUES', label: '价值观' },
];

const SUGGESTION_FALLBACK: Record<string, string> = {
  POLITICAL_SAFETY: '内容不涉及敏感政治隐喻，通过',
  SEXUAL_CONTENT: '无不当内容，通过',
  VIOLENCE: '战斗描写较为激烈，建议适当软化打斗细节中的血腥描写',
  VALUES: '主角动机正向，通过',
};

const dimensionScores = computed(() => {
  const dims = props.reviewResult.dimensions;
  return dimensions.map((d) => {
    const dimData = dims?.[d.key as keyof typeof dims];
    const score = dimData?.score ?? 0;
    // Derive suggestion text from issues or use fallback
    const issues = dimData?.issues ?? [];
    const suggestion = issues.length > 0
      ? issues.map((i) => i.suggestion).join('；')
      : SUGGESTION_FALLBACK[d.key] ?? '通过';
    return { ...d, score, suggestion };
  });
});

const verdictLabels: Record<string, string> = {
  PASS: '审核通过',
  PASS_WITH_SUGGESTIONS: '通过（含建议）',
  NEEDS_REVISION: '需要修改',
  BLOCKED: '审核拦截',
};

const verdictLabel = computed(() => {
  return verdictLabels[props.reviewResult.verdict] ?? props.reviewResult.verdict ?? '未知';
});

const conclusionDescs: Record<string, string> = {
  PASS: '所有维度均达标，章节可直接标记为已完成',
  PASS_WITH_SUGGESTIONS: '基本通过，部分维度有优化建议，可采纳后重新审核，也可直接确认',
  NEEDS_REVISION: '存在需要修改的内容，建议按修改意见调整后重新提交审核',
  BLOCKED: '存在不合规内容，必须手动修改正文后重新提交，或提出上诉',
};

const conclusionDesc = computed(() => {
  return conclusionDescs[props.reviewResult.verdict] ?? '';
});

const conclusionClasses: Record<string, string> = {
  PASS: 'conclusion--pass',
  PASS_WITH_SUGGESTIONS: 'conclusion--suggestions',
  NEEDS_REVISION: 'conclusion--revision',
  BLOCKED: 'conclusion--blocked',
};

const conclusionClass = computed(() => {
  return conclusionClasses[props.reviewResult.verdict] ?? '';
});

const allIssues = computed((): ReviewIssue[] => {
  const dims = props.reviewResult.dimensions;
  return [
    ...(dims?.POLITICAL_SAFETY?.issues ?? []),
    ...(dims?.SEXUAL_CONTENT?.issues ?? []),
    ...(dims?.VIOLENCE?.issues ?? []),
    ...(dims?.VALUES?.issues ?? []),
  ];
});

function scoreBadgeClass(score: number): string {
  if (score >= 7) return 'score--high';
  if (score >= 5) return 'score--mid';
  return 'score--low';
}

function scoreBarClass(score: number): string {
  if (score >= 7) return 'bar--high';
  if (score >= 5) return 'bar--mid';
  return 'bar--low';
}

function severityTagColor(severity: string): string {
  const map: Record<string, string> = {
    CRITICAL: 'red',
    HIGH: 'volcano',
    MEDIUM: 'orange',
    LOW: 'blue',
  };
  return map[severity] ?? 'default';
}
</script>

<style scoped>
.review-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Title Row ────────────────────────────────────── */
.review-panel__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.review-panel__title {
  font-size: var(--font-size-section);
  font-weight: 600;
  color: #111827;
  margin: 0;
}
.review-panel__back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-body);
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
}
.review-panel__back-btn:hover { color: #374151; }

/* ── Conclusion Banner ────────────────────────────── */
.review-panel__conclusion {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid;
}
.review-panel__conclusion-icon { flex-shrink: 0; margin-top: 2px; font-size: 18px; }
.review-panel__conclusion-label { font-size: var(--font-size-body); font-weight: 500; }
.review-panel__conclusion-desc { font-size: var(--font-size-body); margin: 2px 0 0; opacity: 0.9; }

.conclusion--pass {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #065f46;
}
.conclusion--suggestions {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}
.conclusion--revision {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #9a3412;
}
.conclusion--blocked {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

/* ── Dimensions ───────────────────────────────────── */
.review-panel__dimensions {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}
.review-panel__dimensions-title {
  font-size: var(--font-size-body);
  color: #374151;
  margin: 0 0 12px;
}
.review-panel__dimensions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.review-panel__dim-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.review-panel__dim-score {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.review-panel__dim-badge {
  font-size: var(--font-size-caption);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}
.score--high {
  background: #d1fae5;
  color: #059669;
}
.score--mid {
  background: #fef3c7;
  color: #d97706;
}
.score--low {
  background: #fee2e2;
  color: #dc2626;
}
.review-panel__dim-label {
  font-size: var(--font-size-body);
  color: #374151;
}

.review-panel__dim-bar {
  flex: 1;
  min-width: 0;
}
.review-panel__dim-bar-bg {
  width: 100%;
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  margin-bottom: 4px;
}
.review-panel__dim-bar-fill {
  height: 6px;
  border-radius: 3px;
}
.bar--high { background: #10b981; }
.bar--mid { background: #f59e0b; }
.bar--low { background: #ef4444; }
.review-panel__dim-suggestion {
  font-size: var(--font-size-caption);
  color: #6b7280;
  margin: 0;
}

/* ── Issues ───────────────────────────────────────── */
.review-panel__issues {
  max-height: 200px;
  overflow-y: auto;
}
.review-issue {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f3f4f6;
  font-size: var(--font-size-body);
  flex-wrap: wrap;
}
.review-issue__severity { font-size: var(--font-size-caption); }
.review-issue__location { color: #6b7280; word-break: break-all; }
.review-issue__suggestion { color: #374151; flex: 1; }

/* ── Actions ──────────────────────────────────────── */
.review-panel__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.review-panel__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-body);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  background: transparent;
  color: #374151;
}
.review-panel__btn:hover { background: #f9fafb; }
.review-panel__btn--confirm {
  background: #059669;
  color: #fff;
  border-color: #059669;
}
.review-panel__btn--confirm:hover { background: #047857; }
.review-panel__btn--edit {
  border-color: #e5e7eb;
  color: #374151;
}
.review-panel__btn--blocked-edit {
  border-color: #fecaca;
  color: #dc2626;
}
.review-panel__btn--blocked-edit:hover { background: #fef2f2; }
.review-panel__btn--appeal {
  color: #4b5563;
}
.review-panel__btn--dispute {
  border-color: #fde68a;
  color: #92400e;
}
.review-panel__btn--dispute:hover { background: #fffbeb; }

/* ── Appeal ───────────────────────────────────────── */
.review-panel__appeal {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.review-panel__appeal-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #6b7280;
  font-size: var(--font-size-body);
}
.review-panel__appeal-title { font-size: var(--font-size-body); color: #374151; }
.review-panel__appeal-hint { font-size: var(--font-size-caption); color: #9ca3af; margin: 1px 0 0; }
.review-panel__appeal-textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  font-size: var(--font-size-body);
  resize: none;
  outline: none;
  min-height: 80px;
  box-sizing: border-box;
}
.review-panel__appeal-textarea:focus {
  border-color: #9ca3af;
  box-shadow: 0 0 0 1px #9ca3af;
}
.review-panel__appeal-submit {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #111827;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: var(--font-size-body);
  border: none;
  cursor: pointer;
  align-self: flex-start;
}
.review-panel__appeal-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.review-panel__appeal-submit:hover:not(:disabled) { background: #374151; }

/* ── Loading ──────────────────────────────────────── */
.review-panel__loading {
  text-align: center;
  color: #6b7280;
  padding: 8px;
  font-size: var(--font-size-body);
}
</style>
