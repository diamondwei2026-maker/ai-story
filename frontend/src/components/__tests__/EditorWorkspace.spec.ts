import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { ReviewResult } from "@/types";

// ─── ReviewResult fixture ────────────────────────────────────────────

function makeReviewResult(
  overrides: Partial<ReviewResult> = {},
): ReviewResult {
  return {
    verdict: "PASS",
    dimensions: {
      POLITICAL_SAFETY: { score: 10, issues: [] },
      SEXUAL_CONTENT: { score: 10, issues: [] },
      VIOLENCE: { score: 10, issues: [] },
      VALUES: { score: 10, issues: [] },
    },
    overallScore: 10,
    appealCount: 0,
    reviewedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

const defaultProps = {
  chapterId: "ch-1",
  chapterTitle: "第一章：天龙降世",
  chapterContent: "夜色如墨，李凡站在城墙之上。",
  chapterStatus: "COMPLETED" as const,
  targetWordCount: 3000,
  generationMode: "new-continue",
  isGenerating: false,
  isPaused: false,
  reviewResult: null as ReviewResult | null,
};

async function mountEditorWorkspace(
  overrides: Partial<typeof defaultProps> = {},
) {
  const { default: EditorWorkspace } = await import(
    "@/components/EditorWorkspace.vue"
  );
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(EditorWorkspace, {
    props: { ...defaultProps, ...overrides },
    global: { plugins: [pinia] },
  });
}

// ─── Test Suite ──────────────────────────────────────────────────────

describe("EditorWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════
  // 1. Basic rendering
  // ══════════════════════════════════════════════════════════════════

  describe("basic rendering", () => {
    it("renders the editor workspace container", async () => {
      const wrapper = await mountEditorWorkspace();
      expect(wrapper.find('[data-testid="editor-workspace"]').exists()).toBe(true);
    });

    it("renders chapter title in the workspace header", async () => {
      const wrapper = await mountEditorWorkspace({ chapterTitle: "第一章：天龙降世" });
      expect(wrapper.find('[data-testid="workspace-title"]').text()).toContain("第一章：天龙降世");
    });

    it("renders the ModeSwitcher component", async () => {
      const wrapper = await mountEditorWorkspace();
      expect(wrapper.find('[data-testid="mode-switcher"]').exists()).toBe(true);
    });

    it("renders the StreamingEditor component", async () => {
      const wrapper = await mountEditorWorkspace();
      expect(wrapper.find('[data-testid="streaming-editor"]').exists()).toBe(true);
    });

    it("renders the TextToolbar component", async () => {
      const wrapper = await mountEditorWorkspace();
      expect(wrapper.find('[data-testid="text-toolbar"]').exists()).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 2. Mode switching
  // ══════════════════════════════════════════════════════════════════

  describe("mode switching", () => {
    it("passes generationMode to ModeSwitcher", async () => {
      const wrapper = await mountEditorWorkspace({ generationMode: "paragraph-rewrite" });
      const switcher = wrapper.findComponent({ name: "ModeSwitcher" });
      expect(switcher.props("mode")).toBe("paragraph-rewrite");
    });

    it("emits mode-change when ModeSwitcher emits update:mode", async () => {
      const wrapper = await mountEditorWorkspace({ generationMode: "new-continue" });
      const switcher = wrapper.findComponent({ name: "ModeSwitcher" });
      await switcher.vm.$emit("update:mode", "style-upgrade");
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("mode-change")).toBeTruthy();
      expect(wrapper.emitted("mode-change")![0]).toEqual(["style-upgrade"]);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 3. StreamingEditor integration
  // ══════════════════════════════════════════════════════════════════

  describe("StreamingEditor integration", () => {
    it("passes content to StreamingEditor", async () => {
      const wrapper = await mountEditorWorkspace({ chapterContent: "测试正文内容" });
      const editor = wrapper.findComponent({ name: "StreamingEditor" });
      expect(editor.props("content")).toBe("测试正文内容");
    });

    it("sets isStreaming=true on StreamingEditor when generating", async () => {
      const wrapper = await mountEditorWorkspace({ isGenerating: true });
      const editor = wrapper.findComponent({ name: "StreamingEditor" });
      expect(editor.props("isStreaming")).toBe(true);
    });

    it("sets isStreaming=false when not generating", async () => {
      const wrapper = await mountEditorWorkspace({ isGenerating: false });
      const editor = wrapper.findComponent({ name: "StreamingEditor" });
      expect(editor.props("isStreaming")).toBe(false);
    });

    it("allows content editing when chapter is not generating", async () => {
      const wrapper = await mountEditorWorkspace({ isGenerating: false, chapterStatus: "DRAFT" });
      const editor = wrapper.findComponent({ name: "StreamingEditor" });
      expect(editor.props("isEditable")).toBe(true);
    });

    it("disallows editing when chapter is COMPLETED or DISPUTED", async () => {
      const wrapper = await mountEditorWorkspace({ isGenerating: false, chapterStatus: "COMPLETED" });
      const editor = wrapper.findComponent({ name: "StreamingEditor" });
      expect(editor.props("isEditable")).toBe(false);
    });

    it("emits content-change when editor content is updated", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "DRAFT" });
      const editor = wrapper.findComponent({ name: "StreamingEditor" });
      await editor.vm.$emit("update:content", "修改后的内容");
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("content-change")).toBeTruthy();
      expect(wrapper.emitted("content-change")![0]).toEqual(["修改后的内容"]);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 4. TextToolbar — pause / continue / retry
  // ══════════════════════════════════════════════════════════════════

  describe("TextToolbar controls", () => {
    it("passes isGenerating to TextToolbar", async () => {
      const wrapper = await mountEditorWorkspace({ isGenerating: true });
      const toolbar = wrapper.findComponent({ name: "TextToolbar" });
      expect(toolbar.props("isGenerating")).toBe(true);
    });

    it("passes isPaused to TextToolbar", async () => {
      const wrapper = await mountEditorWorkspace({ isGenerating: false, isPaused: true });
      const toolbar = wrapper.findComponent({ name: "TextToolbar" });
      expect(toolbar.props("isPaused")).toBe(true);
    });

    it("emits pause when TextToolbar emits pause", async () => {
      const wrapper = await mountEditorWorkspace({ isGenerating: true, isPaused: false });
      const toolbar = wrapper.findComponent({ name: "TextToolbar" });
      await toolbar.vm.$emit("pause");
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("pause")).toBeTruthy();
    });

    it("emits continue when TextToolbar emits continue", async () => {
      const wrapper = await mountEditorWorkspace({ isGenerating: false, isPaused: true, chapterContent: "edited by user after pause" });
      const toolbar = wrapper.findComponent({ name: "TextToolbar" });
      await toolbar.vm.$emit("continue");
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("continue")).toBeTruthy();
    });

    it("emits retry with feedback when TextToolbar emits retry", async () => {
      const wrapper = await mountEditorWorkspace({ isGenerating: false, isPaused: false });
      const toolbar = wrapper.findComponent({ name: "TextToolbar" });
      await toolbar.vm.$emit("retry", "希望主角性格更果断");
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("retry")).toBeTruthy();
      expect(wrapper.emitted("retry")![0]).toEqual(["希望主角性格更果断"]);
    });

    it("shows retry feedback input when not generating and chapter not completed", async () => {
      const wrapper = await mountEditorWorkspace({ isGenerating: false, chapterStatus: "DRAFT" });
      const toolbar = wrapper.findComponent({ name: "TextToolbar" });
      expect(toolbar.props("showRetryFeedback")).toBe(true);
    });

    it("hides retry feedback for completed chapters", async () => {
      const wrapper = await mountEditorWorkspace({ isGenerating: false, chapterStatus: "COMPLETED" });
      const toolbar = wrapper.findComponent({ name: "TextToolbar" });
      expect(toolbar.props("showRetryFeedback")).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 5. Stream disruption recovery (>=60% vs <60%)
  // ══════════════════════════════════════════════════════════════════

  describe("stream disruption recovery", () => {
    it("when content >=60% of targetWordCount: resume from saved content", async () => {
      const wrapper = await mountEditorWorkspace({
        chapterStatus: "DRAFT", targetWordCount: 3000,
        chapterContent: "A".repeat(2000), isGenerating: false, isPaused: true,
      });
      const editor = wrapper.findComponent({ name: "StreamingEditor" });
      expect(editor.props("content")).toBe("A".repeat(2000));
      expect(editor.props("isEditable")).toBe(true);
      const toolbar = wrapper.findComponent({ name: "TextToolbar" });
      expect(toolbar.props("isPaused")).toBe(true);
    });

    it("when content <60% of targetWordCount: triggers full retry", async () => {
      const wrapper = await mountEditorWorkspace({
        chapterStatus: "DRAFT", targetWordCount: 3000,
        chapterContent: "A".repeat(500), isGenerating: false, isPaused: false,
      });
      const toolbar = wrapper.findComponent({ name: "TextToolbar" });
      expect(toolbar.props("isPaused")).toBe(false);
      expect(toolbar.props("showRetryFeedback")).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 6. ReviewPanel integration
  // ══════════════════════════════════════════════════════════════════

  describe("ReviewPanel integration", () => {
    it("renders ReviewPanel when reviewResult is provided", async () => {
      const reviewResult = makeReviewResult({ verdict: "PASS" });
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      expect(wrapper.find('[data-testid="review-panel"]').exists()).toBe(true);
    });

    it("does not render ReviewPanel when reviewResult is null", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult: null });
      expect(wrapper.find('[data-testid="review-panel"]').exists()).toBe(false);
    });

    it("passes reviewResult and chapterStatus to ReviewPanel", async () => {
      const reviewResult = makeReviewResult({ verdict: "NEEDS_REVISION", overallScore: 5.5 });
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      const panel = wrapper.findComponent({ name: "ReviewPanel" });
      expect(panel.props("reviewResult")).toEqual(reviewResult);
      expect(panel.props("chapterStatus")).toBe("REVIEWING");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 7. PASS verdict — auto-confirm
  // ══════════════════════════════════════════════════════════════════

  describe("PASS verdict", () => {
    it("renders PASS verdict badge", async () => {
      const reviewResult = makeReviewResult({ verdict: "PASS" });
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      expect(wrapper.find('[data-testid="review-panel"]').exists()).toBe(true);
    });

    it("shows PASS text in verdict badge", async () => {
      const reviewResult = makeReviewResult({ verdict: "PASS" });
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      expect(wrapper.find('[data-testid="verdict-badge"]').text()).toMatch(/PASS/i);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 8. PASS_WITH_SUGGESTIONS — adopt / ignore
  // ══════════════════════════════════════════════════════════════════

  describe("PASS_WITH_SUGGESTIONS verdict", () => {
    let reviewResult: ReviewResult;
    beforeEach(() => {
      reviewResult = makeReviewResult({
        verdict: "PASS_WITH_SUGGESTIONS", overallScore: 7.0,
        dimensions: {
          POLITICAL_SAFETY: { score: 7, issues: [{ severity: "MEDIUM", location: "第3段", rule: "避免敏感隐喻", suggestion: "替换为中性表达", autoFixable: true }] },
          SEXUAL_CONTENT: { score: 10, issues: [] },
          VIOLENCE: { score: 10, issues: [] },
          VALUES: { score: 10, issues: [] },
        },
      });
    });

    it("renders adopt suggestions and ignore buttons", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      const labels = wrapper.findAll('[data-testid^="action-"]').map((b) => b.text());
      expect(labels).toEqual(expect.arrayContaining([expect.stringMatching(/采纳/i)]));
      expect(labels).toEqual(expect.arrayContaining([expect.stringMatching(/忽略/i)]));
    });

    it("emits adopt-suggestions when adopt button clicked", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      await wrapper.findComponent({ name: "ReviewPanel" }).vm.$emit("adopt-suggestions");
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("adopt-suggestions")).toBeTruthy();
    });

    it("emits confirm when ignore-and-confirm clicked", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      await wrapper.findComponent({ name: "ReviewPanel" }).vm.$emit("ignore-and-confirm");
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("confirm")).toBeTruthy();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 9. NEEDS_REVISION — adopt / manual-edit / appeal
  // ══════════════════════════════════════════════════════════════════

  describe("NEEDS_REVISION verdict", () => {
    let reviewResult: ReviewResult;
    beforeEach(() => {
      reviewResult = makeReviewResult({
        verdict: "NEEDS_REVISION", overallScore: 4.0,
        dimensions: {
          POLITICAL_SAFETY: { score: 4, issues: [{ severity: "HIGH", location: "第1段", rule: "禁止涉政", suggestion: "移除敏感隐喻", autoFixable: false }] },
          SEXUAL_CONTENT: { score: 10, issues: [] },
          VIOLENCE: { score: 10, issues: [] },
          VALUES: { score: 10, issues: [] },
        },
      });
    });

    it("renders 3 action buttons: adopt+re-review, manual-edit, appeal", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      expect(wrapper.findAll('[data-testid^="action-"]')).toHaveLength(3);
    });

    it("emits adopt-and-re-review event", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      await wrapper.findComponent({ name: "ReviewPanel" }).vm.$emit("adopt-and-re-review");
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("adopt-and-re-review")).toBeTruthy();
    });

    it("emits manual-edit event", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      await wrapper.findComponent({ name: "ReviewPanel" }).vm.$emit("manual-edit");
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("manual-edit")).toBeTruthy();
    });

    it("opens AppealModal when appeal button clicked", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      await wrapper.findComponent({ name: "ReviewPanel" }).vm.$emit("appeal");
      await wrapper.vm.$nextTick();
      const appealModal = wrapper.findComponent({ name: "AppealModal" });
      expect(appealModal.exists()).toBe(true);
      expect(appealModal.props("visible")).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 10. BLOCKED verdict — only manual-edit / appeal (no adopt)
  // ══════════════════════════════════════════════════════════════════

  describe("BLOCKED verdict", () => {
    let reviewResult: ReviewResult;
    beforeEach(() => {
      reviewResult = makeReviewResult({
        verdict: "BLOCKED", overallScore: 2.0,
        dimensions: {
          POLITICAL_SAFETY: { score: 1, issues: [{ severity: "CRITICAL", location: "全文", rule: "零容忍红线", suggestion: "需要完全重写", autoFixable: false }] },
          SEXUAL_CONTENT: { score: 10, issues: [] },
          VIOLENCE: { score: 10, issues: [] },
          VALUES: { score: 10, issues: [] },
        },
      });
    });

    it("renders exactly 2 action buttons (no one-click adopt)", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      expect(wrapper.findAll('[data-testid^="action-"]')).toHaveLength(2);
    });

    it("does NOT render any adopt button", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      expect(wrapper.find('[data-testid="action-adopt_suggestions"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="action-adopt_and_re_review"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="action-ignore_and_confirm"]').exists()).toBe(false);
    });

    it("renders manual-edit and appeal buttons", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      expect(wrapper.find('[data-testid="action-manual_edit"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="action-appeal"]').exists()).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 11. Appeal flow — modal + submit + second appeal prevention
  // ══════════════════════════════════════════════════════════════════

  describe("appeal flow", () => {
    it("renders AppealModal and closes on cancel", async () => {
      const reviewResult = makeReviewResult({ verdict: "NEEDS_REVISION" });
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      await wrapper.findComponent({ name: "ReviewPanel" }).vm.$emit("appeal");
      await wrapper.vm.$nextTick();
      let modal = wrapper.findComponent({ name: "AppealModal" });
      expect(modal.exists()).toBe(true);
      expect(modal.props("visible")).toBe(true);

      await modal.vm.$emit("cancel");
      await wrapper.vm.$nextTick();
      modal = wrapper.findComponent({ name: "AppealModal" });
      expect(modal.props("visible")).toBe(false);
    });

    it("emits appeal event with reason when AppealModal submits", async () => {
      const reviewResult = makeReviewResult({ verdict: "NEEDS_REVISION" });
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      await wrapper.findComponent({ name: "ReviewPanel" }).vm.$emit("appeal");
      await wrapper.vm.$nextTick();
      await wrapper.findComponent({ name: "AppealModal" }).vm.$emit("submit", "审核误判：此为文学性隐喻");
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("appeal")).toBeTruthy();
      expect(wrapper.emitted("appeal")![0]).toEqual(["审核误判：此为文学性隐喻"]);
    });

    it("prevents second appeal when appealCount >= 1", async () => {
      const reviewResult = makeReviewResult({ verdict: "NEEDS_REVISION", appealCount: 1 });
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      expect(wrapper.find('[data-testid="action-appeal"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="action-force_dispute"]').exists()).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 12. Force dispute flow
  // ══════════════════════════════════════════════════════════════════

  describe("force dispute flow", () => {
    it("opens and closes DisputeConfirm modal", async () => {
      const reviewResult = makeReviewResult({ verdict: "BLOCKED", appealCount: 1 });
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      await wrapper.findComponent({ name: "ReviewPanel" }).vm.$emit("force-dispute");
      await wrapper.vm.$nextTick();
      let modal = wrapper.findComponent({ name: "DisputeConfirm" });
      expect(modal.exists()).toBe(true);
      expect(modal.props("visible")).toBe(true);

      await modal.vm.$emit("cancel");
      await wrapper.vm.$nextTick();
      modal = wrapper.findComponent({ name: "DisputeConfirm" });
      expect(modal.props("visible")).toBe(false);
    });

    it("emits dispute event when DisputeConfirm confirms", async () => {
      const reviewResult = makeReviewResult({ verdict: "BLOCKED", appealCount: 1 });
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      await wrapper.findComponent({ name: "ReviewPanel" }).vm.$emit("force-dispute");
      await wrapper.vm.$nextTick();
      await wrapper.findComponent({ name: "DisputeConfirm" }).vm.$emit("confirm");
      await wrapper.vm.$nextTick();
      expect(wrapper.emitted("dispute")).toBeTruthy();
    });

    it("shows risk warning in DisputeConfirm", async () => {
      const reviewResult = makeReviewResult({ verdict: "BLOCKED", appealCount: 1 });
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult });
      await wrapper.findComponent({ name: "ReviewPanel" }).vm.$emit("force-dispute");
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-testid="risk-warning"]').exists()).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 13. Chapter status rendering in workspace
  // ══════════════════════════════════════════════════════════════════

  describe("chapter status rendering", () => {
    it("shows status badge in workspace header", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "DRAFT" });
      expect(wrapper.find('[data-testid="workspace-status-badge"]').exists()).toBe(true);
    });

    it("shows correct status text for REVIEWING", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "REVIEWING", reviewResult: makeReviewResult({ verdict: "PASS" }) });
      expect(wrapper.find('[data-testid="workspace-status-badge"]').text()).toContain("审核中");
    });

    it("shows correct status text for DISPUTED", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "DISPUTED" });
      expect(wrapper.find('[data-testid="workspace-status-badge"]').text()).toContain("已标记争议");
    });

    it("shows target word count in workspace", async () => {
      const wrapper = await mountEditorWorkspace({ targetWordCount: 3000, chapterContent: "测试" });
      expect(wrapper.text()).toContain("3000");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 14. Close workspace
  // ══════════════════════════════════════════════════════════════════

  describe("close workspace", () => {
    it("renders and emits close button", async () => {
      const wrapper = await mountEditorWorkspace();
      expect(wrapper.find('[data-testid="close-workspace-btn"]').exists()).toBe(true);
      await wrapper.find('[data-testid="close-workspace-btn"]').trigger("click");
      expect(wrapper.emitted("close")).toBeTruthy();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 15. Loading state
  // ══════════════════════════════════════════════════════════════════

  describe("loading state", () => {
    it("shows streaming indicator when generating", async () => {
      const wrapper = await mountEditorWorkspace({ isGenerating: true, chapterStatus: "DRAFT" });
      expect(wrapper.find('[data-testid="streaming-indicator"]').exists()).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 16. DISPUTED status — next chapter unlocked
  // ══════════════════════════════════════════════════════════════════

  describe("DISPUTED status behavior", () => {
    it("renders DISPUTED indicator and locks editing", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "DISPUTED" });
      expect(wrapper.find('[data-testid="workspace-status-badge"]').text()).toMatch(/争议/i);
      const editor = wrapper.findComponent({ name: "StreamingEditor" });
      expect(editor.props("isEditable")).toBe(false);
    });

    it("hides generate/retry buttons for DISPUTED chapters", async () => {
      const wrapper = await mountEditorWorkspace({ chapterStatus: "DISPUTED" });
      const toolbar = wrapper.findComponent({ name: "TextToolbar" });
      expect(toolbar.props("isGenerating")).toBe(false);
      expect(toolbar.props("showRetryFeedback")).toBe(false);
    });
  });
});
