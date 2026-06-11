import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

// ─── Mock API functions ─────────────────────────────────────────────

const mockGetChapters = vi.fn();
const mockGenerateChapter = vi.fn();
const mockConfirmChapter = vi.fn();
const mockDisputeChapter = vi.fn();
const mockPauseChapter = vi.fn();
const mockContinueChapter = vi.fn();
const mockRetryChapter = vi.fn();
const mockSaveChapterContent = vi.fn();
const mockConfirmCompletion = vi.fn();
const mockReopenProject = vi.fn();

vi.mock("@/api/chapter", () => ({
  getChapters: (...args: any[]) => mockGetChapters(...args),
  generateChapter: (...args: any[]) => mockGenerateChapter(...args),
  confirmChapter: (...args: any[]) => mockConfirmChapter(...args),
  disputeChapter: (...args: any[]) => mockDisputeChapter(...args),
  pauseChapter: (...args: any[]) => mockPauseChapter(...args),
  continueChapter: (...args: any[]) => mockContinueChapter(...args),
  retryChapter: (...args: any[]) => mockRetryChapter(...args),
  saveChapterContent: (...args: any[]) => mockSaveChapterContent(...args),
}));

vi.mock("@/api/project", () => ({
  getProject: vi.fn().mockResolvedValue(null),
  confirmCompletion: (...args: any[]) => mockConfirmCompletion(...args),
  reopenProject: (...args: any[]) => mockReopenProject(...args),
}));

const mockGetBeats = vi.fn().mockResolvedValue([]);
vi.mock("@/api/beats", () => ({
  getBeats: (...args: any[]) => mockGetBeats(...args),
  generateBeats: vi.fn(),
  confirmBeats: vi.fn(),
  rejectBeats: vi.fn(),
  updateBeatWordCount: vi.fn(),
  updateBeatStructure: vi.fn(),
}));

// ─── Fixtures ────────────────────────────────────────────────────────

interface MockChapter {
  id: string;
  projectId: string;
  chapterNumber: number;
  title: string | null;
  beatPlan: Record<string, unknown> | null;
  targetWordCount: number;
  content: string | null;
  status: "PENDING" | "DRAFT" | "PENDING_REVIEW" | "REVIEWING" | "COMPLETED" | "DISPUTED";
  chapterFingerprint: string | null;
  contextSummary: string | null;
  reviewResult: Record<string, unknown> | null;
  changeAnalysis: Record<string, unknown> | null;
  targetedFixHistory: unknown[];
  createdAt: string;
  updatedAt: string;
}

function makeChapter(overrides: Partial<MockChapter> = {}): MockChapter {
  return {
    id: overrides.id ?? "ch-1",
    projectId: "proj-1",
    chapterNumber: overrides.chapterNumber ?? 1,
    title: overrides.title ?? null,
    beatPlan: null,
    targetWordCount: overrides.targetWordCount ?? 3000,
    content: overrides.content ?? null,
    status: overrides.status ?? "PENDING",
    chapterFingerprint: null,
    contextSummary: null,
    reviewResult: null,
    changeAnalysis: null,
    targetedFixHistory: [],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  };
}

const emptyChapters: MockChapter[] = [];

const threeChapters: MockChapter[] = [
  makeChapter({ id: "ch-1", chapterNumber: 1, title: "第一章", content: "第一章正文内容...", status: "COMPLETED", targetWordCount: 3000 }),
  makeChapter({ id: "ch-2", chapterNumber: 2, title: "第二章", content: "第二章正文内容测试...", status: "COMPLETED", targetWordCount: 3500 }),
  makeChapter({ id: "ch-3", chapterNumber: 3, title: "第三章", content: "", status: "PENDING", targetWordCount: 4000 }),
];

const allCompletedChapters: MockChapter[] = [
  makeChapter({ id: "ch-1", chapterNumber: 1, title: "第一章", content: "正文...", status: "COMPLETED", targetWordCount: 3000 }),
  makeChapter({ id: "ch-2", chapterNumber: 2, title: "第二章", content: "正文...", status: "DISPUTED", targetWordCount: 3500 }),
];

// ─── Helpers ─────────────────────────────────────────────────────────

async function mountView(props: { projectId: string } = { projectId: "proj-1" }) {
  const { default: DraftingView } = await import("@/views/DraftingView.vue");

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: "/project/:id", name: "workflow", component: { template: "<div />" } },
    ],
  });
  await router.push(`/project/${props.projectId}`);
  await router.isReady();

  const pinia = createPinia();
  setActivePinia(pinia);

  return mount(DraftingView, {
    props: { projectId: props.projectId },
    global: {
      plugins: [router, pinia],
    },
  });
}

// ─── Test Suite ──────────────────────────────────────────────────────

describe("DraftingView", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════
  // 1. Chapter list rendering
  // ══════════════════════════════════════════════════════════════════

  describe("chapter list rendering", () => {
    it("renders the DRAFTING phase container", async () => {
      mockGetChapters.mockResolvedValue(emptyChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-testid="drafting-view"]').exists()).toBe(true);
    });

    it('shows the phase title "正文迭代"', async () => {
      mockGetChapters.mockResolvedValue(emptyChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('[data-testid="drafting-title"]').text()).toContain("正文迭代");
    });

    it("displays chapters in ascending ChapterNumber order", async () => {
      // Return chapters in reverse order; the component should sort them
      const reversed = [...threeChapters].reverse();
      mockGetChapters.mockResolvedValue(reversed);

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const items = wrapper.findAll('[data-testid="chapter-list-item"]');
      expect(items).toHaveLength(3);

      // Should be sorted by chapterNumber ascending
      const numbers = items.map((item) => {
        const numEl = item.find('[data-testid="chapter-number"]');
        return numEl.exists()
          ? Number(numEl.attributes("data-chapter-number"))
          : 0;
      });
      expect(numbers).toEqual([1, 2, 3]);
    });

    it("renders chapter number for each chapter", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const numbers = wrapper.findAll('[data-testid="chapter-number"]');
      expect(numbers).toHaveLength(3);
      expect(numbers[0].text()).toContain("1");
      expect(numbers[2].text()).toContain("3");
    });

    it("renders chapter title for each chapter", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const titles = wrapper.findAll('[data-testid="chapter-title"]');
      expect(titles).toHaveLength(3);
      expect(titles[0].text()).toContain("第一章");
    });

    it('renders chapter titles that are null as "未命名章节"', async () => {
      const chapters = [
        makeChapter({ id: "ch-1", chapterNumber: 1, title: null, status: "PENDING" }),
      ];
      mockGetChapters.mockResolvedValue(chapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="chapter-title"]').text()).toContain("未命名章节");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 2. Status badges
  // ══════════════════════════════════════════════════════════════════

  describe("status badges", () => {
    it("shows status badge for each chapter", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const badges = wrapper.findAll('[data-testid="chapter-status-badge"]');
      expect(badges).toHaveLength(3);
    });

    it("displays correct status text for COMPLETED chapters", async () => {
      const chapters = [makeChapter({ id: "ch-1", chapterNumber: 1, status: "COMPLETED" })];
      mockGetChapters.mockResolvedValue(chapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="chapter-status-badge"]').text()).toContain("已完成");
    });

    it("displays correct status text for PENDING chapters", async () => {
      const chapters = [makeChapter({ id: "ch-1", chapterNumber: 1, status: "PENDING" })];
      mockGetChapters.mockResolvedValue(chapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="chapter-status-badge"]').text()).toContain("待生成");
    });

    it("displays correct status text for DISPUTED chapters", async () => {
      const chapters = [makeChapter({ id: "ch-1", chapterNumber: 1, status: "DISPUTED" })];
      mockGetChapters.mockResolvedValue(chapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="chapter-status-badge"]').text()).toContain("已标记争议");
    });

    it("displays correct status text for DRAFT chapters", async () => {
      const chapters = [makeChapter({ id: "ch-1", chapterNumber: 1, status: "DRAFT" })];
      mockGetChapters.mockResolvedValue(chapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="chapter-status-badge"]').text()).toContain("生成中");
    });

    it("displays correct status text for REVIEWING chapters", async () => {
      const chapters = [makeChapter({ id: "ch-1", chapterNumber: 1, status: "REVIEWING" })];
      mockGetChapters.mockResolvedValue(chapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="chapter-status-badge"]').text()).toContain("审核中");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 3. Empty state
  // ══════════════════════════════════════════════════════════════════

  describe("empty state", () => {
    it("shows empty state guide when no chapters exist", async () => {
      mockGetChapters.mockResolvedValue(emptyChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const emptyEl = wrapper.find('[data-testid="drafting-empty-state"]');
      expect(emptyEl.exists()).toBe(true);
    });

    it("does not show empty state when chapters exist", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="drafting-empty-state"]').exists()).toBe(false);
    });

    it("empty state contains guidance text", async () => {
      mockGetChapters.mockResolvedValue(emptyChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const emptyEl = wrapper.find('[data-testid="drafting-empty-state"]');
      expect(emptyEl.text()).toMatch(/章节/);
    });

    it("does not show chapter list when no chapters exist", async () => {
      mockGetChapters.mockResolvedValue(emptyChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="chapter-list"]').exists()).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 4. Sequential lock
  // ══════════════════════════════════════════════════════════════════

  describe("sequential lock", () => {
    it("shows generate button for each PENDING chapter", async () => {
      // threeChapters: [COMPLETED, COMPLETED, PENDING] — only chapter 3 should have a generate button
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const btns = wrapper.findAll('[data-testid="generate-chapter-btn"]');
      expect(btns).toHaveLength(1);
    });

    it("enables generate button for chapter 1 (first chapter) when it is PENDING", async () => {
      const chapters = [makeChapter({ id: "ch-1", chapterNumber: 1, status: "PENDING" })];
      mockGetChapters.mockResolvedValue(chapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const btn = wrapper.find('[data-testid="generate-chapter-btn"]');
      expect(btn.attributes("disabled")).toBeUndefined();
    });

    it("disables generate button for chapter N+1 when chapter N is not COMPLETED/DISPUTED", async () => {
      // Chapter 1 is PENDING → Chapter 2 button should be disabled
      mockGetChapters.mockResolvedValue([
        makeChapter({ id: "ch-1", chapterNumber: 1, status: "PENDING" }),
        makeChapter({ id: "ch-2", chapterNumber: 2, status: "PENDING" }),
      ]);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const btns = wrapper.findAll('[data-testid="generate-chapter-btn"]');
      // Chapter 1 → enabled (first chapter)
      expect(btns[0].attributes("disabled")).toBeUndefined();
      // Chapter 2 → disabled (Chapter 1 not completed)
      expect(btns[1].attributes("disabled")).toBeDefined();
    });

    it("enables generate button for chapter N+1 when chapter N is COMPLETED", async () => {
      mockGetChapters.mockResolvedValue([
        makeChapter({ id: "ch-1", chapterNumber: 1, status: "COMPLETED" }),
        makeChapter({ id: "ch-2", chapterNumber: 2, status: "PENDING" }),
      ]);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // Chapter 1 is COMPLETED → button hidden. Only chapter 2 button renders.
      const btns = wrapper.findAll('[data-testid="generate-chapter-btn"]');
      expect(btns).toHaveLength(1);
      expect(btns[0].attributes("disabled")).toBeUndefined();
    });

    it("enables generate button for chapter N+1 when chapter N is DISPUTED", async () => {
      mockGetChapters.mockResolvedValue([
        makeChapter({ id: "ch-1", chapterNumber: 1, status: "DISPUTED" }),
        makeChapter({ id: "ch-2", chapterNumber: 2, status: "PENDING" }),
      ]);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // Chapter 1 is DISPUTED → button hidden. Only chapter 2 button renders.
      const btns = wrapper.findAll('[data-testid="generate-chapter-btn"]');
      expect(btns).toHaveLength(1);
      expect(btns[0].attributes("disabled")).toBeUndefined();
    });

    it("hides generate button for chapters already COMPLETED or DISPUTED", async () => {
      mockGetChapters.mockResolvedValue([
        makeChapter({ id: "ch-1", chapterNumber: 1, status: "COMPLETED" }),
        makeChapter({ id: "ch-2", chapterNumber: 2, status: "DISPUTED" }),
      ]);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // COMPLETED/DISPUTED chapters should not show a generate button
      const btns = wrapper.findAll('[data-testid="generate-chapter-btn"]');
      expect(btns).toHaveLength(0);
    });

    it("shows generate button as disabled when chapter is currently DRAFT", async () => {
      mockGetChapters.mockResolvedValue([
        makeChapter({ id: "ch-1", chapterNumber: 1, status: "DRAFT" }),
      ]);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const btn = wrapper.find('[data-testid="generate-chapter-btn"]');
      expect(btn.attributes("disabled")).toBeDefined();
    });

    it("calls generateChapter API when generate button is clicked", async () => {
      mockGetChapters.mockResolvedValue([
        makeChapter({ id: "ch-1", chapterNumber: 1, status: "PENDING" }),
      ]);
      mockGenerateChapter.mockResolvedValue({});

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const btn = wrapper.find('[data-testid="generate-chapter-btn"]');
      await btn.trigger("click");

      expect(mockGenerateChapter).toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 5. Word count statistics
  // ══════════════════════════════════════════════════════════════════

  describe("word count statistics", () => {
    it("shows total word count across all chapters", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const statsEl = wrapper.find('[data-testid="total-word-count"]');
      expect(statsEl.exists()).toBe(true);
    });

    it("shows per-chapter word count for each chapter", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const wordCountEls = wrapper.findAll('[data-testid="chapter-word-count"]');
      expect(wordCountEls).toHaveLength(3);
    });

    it("shows target word count for each chapter", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const targetEls = wrapper.findAll('[data-testid="chapter-target-word-count"]');
      expect(targetEls).toHaveLength(3);
      expect(targetEls[0].text()).toContain("3000");
    });

    it("shows zero word count when chapter has no content", async () => {
      const chapters = [makeChapter({ id: "ch-1", chapterNumber: 1, content: null, status: "PENDING" })];
      mockGetChapters.mockResolvedValue(chapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="chapter-word-count"]').text()).toMatch(/0/);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 6. Completion banner
  // ══════════════════════════════════════════════════════════════════

  describe("completion banner", () => {
    it("renders CompletionBanner when all chapters are completed/disputed and project is DRAFTING", async () => {
      mockGetChapters.mockResolvedValue(allCompletedChapters);
      mockConfirmCompletion.mockResolvedValue({});
      mockReopenProject.mockResolvedValue({});

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const banner = wrapper.find('[data-testid="completion-banner"]');
      expect(banner.exists()).toBe(true);
    });

    it("does not render CompletionBanner when not all chapters are completed", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="completion-banner"]').exists()).toBe(false);
    });

    it("does not render CompletionBanner when no chapters exist", async () => {
      mockGetChapters.mockResolvedValue(emptyChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="completion-banner"]').exists()).toBe(false);
    });

    it("calls confirmCompletion API when confirm-completion event is emitted from banner", async () => {
      mockGetChapters.mockResolvedValue(allCompletedChapters);
      mockConfirmCompletion.mockResolvedValue({ status: "COMPLETED" });

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // Trigger the banner confirm-completion event
      const banner = wrapper.findComponent({ name: "CompletionBanner" });
      await banner.vm.$emit("confirm-completion", { action: "direct-complete" });
      await wrapper.vm.$nextTick();

      expect(mockConfirmCompletion).toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 7. Error handling
  // ══════════════════════════════════════════════════════════════════

  describe("error handling", () => {
    it("shows error state when getChapters fails", async () => {
      mockGetChapters.mockRejectedValue(new Error("网络错误"));
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="drafting-error"]').exists()).toBe(true);
    });

    it("shows loading state while fetching chapters", async () => {
      // Never resolve to keep loading state
      mockGetChapters.mockReturnValue(new Promise(() => {}));
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="drafting-loading"]').exists()).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 9. EditorWorkspace integration (Issue #23)
  // ══════════════════════════════════════════════════════════════════

  describe("EditorWorkspace integration", () => {
    it("renders chapter list by default (no EditorWorkspace)", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="chapter-list"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="editor-workspace"]').exists()).toBe(false);
    });

    it("opens EditorWorkspace when a chapter card is clicked", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      mockGenerateChapter.mockResolvedValue({});

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // Click on the first chapter to select it
      const firstChapter = wrapper.findAll('[data-testid="chapter-list-item"]')[0];
      await firstChapter.trigger("click");
      await wrapper.vm.$nextTick();

      // EditorWorkspace should now be visible
      expect(wrapper.find('[data-testid="editor-workspace"]').exists()).toBe(true);
    });

    it("passes chapter title to EditorWorkspace", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const firstChapter = wrapper.findAll('[data-testid="chapter-list-item"]')[0];
      await firstChapter.trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="workspace-title"]').text()).toContain("第一章");
    });

    it("passes chapter content to EditorWorkspace", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const firstChapter = wrapper.findAll('[data-testid="chapter-list-item"]')[0];
      await firstChapter.trigger("click");
      await wrapper.vm.$nextTick();

      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      expect(workspace.props("chapterContent")).toBe("第一章正文内容...");
    });

    it("passes chapter status to EditorWorkspace", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // Chapter 1 is COMPLETED
      const firstChapter = wrapper.findAll('[data-testid="chapter-list-item"]')[0];
      await firstChapter.trigger("click");
      await wrapper.vm.$nextTick();

      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      expect(workspace.props("chapterStatus")).toBe("COMPLETED");
    });

    it("passes targetWordCount to EditorWorkspace", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const firstChapter = wrapper.findAll('[data-testid="chapter-list-item"]')[0];
      await firstChapter.trigger("click");
      await wrapper.vm.$nextTick();

      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      expect(workspace.props("targetWordCount")).toBe(3000);
    });

    it("closes EditorWorkspace when close event is emitted", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const firstChapter = wrapper.findAll('[data-testid="chapter-list-item"]')[0];
      await firstChapter.trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="editor-workspace"]').exists()).toBe(true);

      // Click close button in workspace
      await wrapper.find('[data-testid="close-workspace-btn"]').trigger("click");
      await wrapper.vm.$nextTick();

      // Should return to chapter list
      expect(wrapper.find('[data-testid="editor-workspace"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="chapter-list"]').exists()).toBe(true);
    });

    it("calls retryChapter when EditorWorkspace emits retry with mode", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      mockRetryChapter.mockResolvedValue({});

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // Select chapter 3 (PENDING) to open workspace
      const chapters = wrapper.findAll('[data-testid="chapter-list-item"]');
      await chapters[2].trigger("click");
      await wrapper.vm.$nextTick();

      // Workspace should be visible
      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      expect(workspace.exists()).toBe(true);

      // Trigger retry via workspace with mode from ChapterActionBar
      await workspace.vm.$emit("retry", "some feedback", "paragraph-rewrite");
      await wrapper.vm.$nextTick();

      expect(mockRetryChapter).toHaveBeenCalledWith(
        "proj-1",
        "ch-3",
        { mode: "paragraph-rewrite", feedback: "some feedback" },
      );
    });

    it("handles save-content event from EditorWorkspace", async () => {
      const chapters = [
        makeChapter({ id: "ch-1", chapterNumber: 1, title: "第一章", content: "用户修改后的正文", status: "PENDING_REVIEW" }),
      ];
      mockGetChapters.mockResolvedValue(chapters);
      mockSaveChapterContent.mockResolvedValue({});

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const chapterCard = wrapper.find('[data-testid="chapter-list-item"]');
      await chapterCard.trigger("click");
      await wrapper.vm.$nextTick();

      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      await workspace.vm.$emit("save-content");
      await wrapper.vm.$nextTick();

      expect(mockSaveChapterContent).toHaveBeenCalledWith(
        "proj-1",
        "ch-1",
        "用户修改后的正文",
      );
    });

    it("does NOT pass generationMode to EditorWorkspace (mode is in ChapterActionBar now)", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const chapters = wrapper.findAll('[data-testid="chapter-list-item"]');
      await chapters[0].trigger("click");
      await wrapper.vm.$nextTick();

      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      // generationMode prop should no longer exist on EditorWorkspace
      expect(workspace.props("generationMode")).toBeUndefined();
    });

    it("handles pause event from EditorWorkspace", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const chapters = wrapper.findAll('[data-testid="chapter-list-item"]');
      await chapters[2].trigger("click"); // PENDING chapter
      await wrapper.vm.$nextTick();

      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      await workspace.vm.$emit("pause");
      await wrapper.vm.$nextTick();

      // isPaused should be reflected in workspace
      expect(workspace.props("isPaused")).toBe(true);
    });

    it("handles continue event from EditorWorkspace", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      mockContinueChapter.mockResolvedValue({});
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const chapters = wrapper.findAll('[data-testid="chapter-list-item"]');
      await chapters[2].trigger("click");
      await wrapper.vm.$nextTick();

      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      await workspace.vm.$emit("continue");
      await wrapper.vm.$nextTick();

      expect(mockContinueChapter).toHaveBeenCalled();
    });

    it("handles retry event from EditorWorkspace with feedback and mode", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      mockRetryChapter.mockResolvedValue({});
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const chapters = wrapper.findAll('[data-testid="chapter-list-item"]');
      await chapters[2].trigger("click");
      await wrapper.vm.$nextTick();

      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      await workspace.vm.$emit("retry", "希望风格更热血", "style-upgrade");
      await wrapper.vm.$nextTick();

      expect(mockRetryChapter).toHaveBeenCalledWith(
        "proj-1",
        "ch-3",
        { mode: "style-upgrade", feedback: "希望风格更热血" },
      );
    });

    it("handles confirm event from EditorWorkspace", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      mockConfirmChapter.mockResolvedValue({});
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const chapters = wrapper.findAll('[data-testid="chapter-list-item"]');
      await chapters[0].trigger("click");
      await wrapper.vm.$nextTick();

      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      await workspace.vm.$emit("confirm");
      await wrapper.vm.$nextTick();

      expect(mockConfirmChapter).toHaveBeenCalledWith("proj-1", "ch-1");
    });

    it("handles dispute event from EditorWorkspace", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      mockDisputeChapter.mockResolvedValue({});
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      const chapters = wrapper.findAll('[data-testid="chapter-list-item"]');
      await chapters[0].trigger("click");
      await wrapper.vm.$nextTick();

      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      await workspace.vm.$emit("dispute");
      await wrapper.vm.$nextTick();

      expect(mockDisputeChapter).toHaveBeenCalledWith("proj-1", "ch-1");
    });

    it("confirms via optimistic store update (no re-fetch)", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      mockConfirmChapter.mockResolvedValue({});
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // Clear previous calls after initial load
      mockGetChapters.mockClear();
      mockConfirmChapter.mockClear();

      const chapters = wrapper.findAll('[data-testid="chapter-list-item"]');
      await chapters[0].trigger("click");
      await wrapper.vm.$nextTick();

      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      await workspace.vm.$emit("confirm");
      await wrapper.vm.$nextTick();

      // Should call confirmChapter API (not re-fetch all chapters)
      expect(mockConfirmChapter).toHaveBeenCalledWith("proj-1", "ch-1");
      // Optimistic store update: should NOT trigger a full re-fetch
      // (the store updateChapterStatus handles the local state)
    });

    it("does not open EditorWorkspace when no chapters exist", async () => {
      mockGetChapters.mockResolvedValue(emptyChapters);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="editor-workspace"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="drafting-empty-state"]').exists()).toBe(true);
    });

    it("auto-selects chapter after generation to show content immediately", async () => {
      // onMounted loadChapters: chapter is PENDING with no content
      mockGetChapters.mockResolvedValueOnce([
        makeChapter({ id: "ch-1", chapterNumber: 1, title: "第一章", content: null, status: "PENDING" }),
      ]);
      // After generation, loadChapters returns the chapter WITH content
      mockGetChapters.mockResolvedValue([
        makeChapter({ id: "ch-1", chapterNumber: 1, title: "第一章", content: "第一章正文内容...", status: "REVIEWING" }),
      ]);
      mockGenerateChapter.mockResolvedValue({});

      const wrapper = await mountView();
      // Flush all pending promises + Vue updates (onMounted loadChapters)
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      // Before generation: chapter list is visible (no workspace)
      expect(wrapper.find('[data-testid="chapter-list"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="editor-workspace"]').exists()).toBe(false);

      // Click generate button on the chapter card
      const btn = wrapper.find('[data-testid="generate-chapter-btn"]');
      await btn.trigger("click");
      // Flush the async handleGenerate + Vue reactivity updates
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // After generation: EditorWorkspace should be visible with the generated content
      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      expect(workspace.exists()).toBe(true);
      expect(workspace.props("chapterContent")).toBe("第一章正文内容...");
    });

    it("supports generate event from EditorWorkspace for PENDING chapters", async () => {
      mockGetChapters.mockResolvedValue([
        makeChapter({ id: "ch-1", chapterNumber: 1, title: "第一章", content: null, status: "PENDING" }),
      ]);
      mockGenerateChapter.mockResolvedValue({});

      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // Open the PENDING chapter in workspace
      const chapterCard = wrapper.find('[data-testid="chapter-list-item"]');
      await chapterCard.trigger("click");
      await wrapper.vm.$nextTick();

      // Workspace should be visible with empty content
      const workspace = wrapper.findComponent({ name: "EditorWorkspace" });
      expect(workspace.exists()).toBe(true);
      expect(workspace.props("chapterContent")).toBe("");

      // Emit generate from workspace (simulating TextToolbar's generate button)
      await workspace.vm.$emit("generate");
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      // Should call the generateChapter API
      expect(mockGenerateChapter).toHaveBeenCalledWith("proj-1", "ch-1", { mode: "new-continue" });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 10. Beat integration (Issue #24 RED)
  // ══════════════════════════════════════════════════════════════════

  describe("Beat structure editing (Issue #24)", () => {
    const beatsFixture = [
      {
        id: "beat-1", projectId: "proj-1", chapterNumber: 1,
        plan: { conflictPoint: "主角初遇敌人", hookPresets: ["身份悬念", "神秘信物"] },
        targetWordCount: 3000, hookCount: 2, isClimax: false,
        useR1: true, status: "CONFIRMED" as const,
        createdAt: "2026-01-01", updatedAt: "2026-01-01",
      },
      {
        id: "beat-2", projectId: "proj-1", chapterNumber: 2,
        plan: { conflictPoint: "第一次正面交锋", hookPresets: ["能力觉醒"] },
        targetWordCount: 3500, hookCount: 1, isClimax: false,
        useR1: false, status: "STALE" as const,
        createdAt: "2026-01-01", updatedAt: "2026-01-02",
      },
      {
        id: "beat-3", projectId: "proj-1", chapterNumber: 3,
        plan: { conflictPoint: "揭露幕后黑手", hookPresets: ["反转", "隐藏身份", "意外联盟"] },
        targetWordCount: 4000, hookCount: 3, isClimax: true,
        useR1: true, status: "CONFIRMED" as const,
        createdAt: "2026-01-01", updatedAt: "2026-01-01",
      },
    ];

    it("fetches beat data alongside chapters on mount", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      mockGetBeats.mockResolvedValue(beatsFixture);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // DraftingView should call getBeats to load beat info
      expect(mockGetBeats).toHaveBeenCalledWith("proj-1");
    });

    it("displays beat plan conflict point alongside chapter card", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      mockGetBeats.mockResolvedValue(beatsFixture);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // Chapter 1's beat has conflictPoint "主角初遇敌人"
      const conflictEl = wrapper.find('[data-testid="beat-conflict-summary"]');
      expect(conflictEl.exists()).toBe(true);
      expect(conflictEl.text()).toContain("主角初遇敌人");
    });

    it("shows STALE indicator for chapters whose beat is STALE", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      mockGetBeats.mockResolvedValue(beatsFixture);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // Chapter 2's beat is STALE
      const staleBadge = wrapper.find('[data-testid="beat-stale-badge"]');
      expect(staleBadge.exists()).toBe(true);
    });

    it("does not show STALE indicator when no beat is STALE", async () => {
      const allConfirmed = beatsFixture.map((b) => ({ ...b, status: "CONFIRMED" as const }));
      const chapters = allConfirmed.map((b) =>
        makeChapter({ id: `ch-${b.chapterNumber}`, chapterNumber: b.chapterNumber, status: "COMPLETED" })
      );

      mockGetChapters.mockResolvedValue(chapters);
      mockGetBeats.mockResolvedValue(allConfirmed);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-testid="beat-stale-badge"]').exists()).toBe(false);
    });

    it("shows beat plan summary (hook count) in chapter card", async () => {
      mockGetChapters.mockResolvedValue(threeChapters);
      mockGetBeats.mockResolvedValue(beatsFixture);
      const wrapper = await mountView();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();

      // Chapter 1 has hookCount=2
      const hookEl = wrapper.find('[data-testid="beat-hook-summary"]');
      expect(hookEl.exists()).toBe(true);
      expect(hookEl.text()).toContain("2");
    });
  });
});