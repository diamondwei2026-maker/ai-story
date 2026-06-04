import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

// ─── Mock API functions ─────────────────────────────────────────────

const mockGetChapters = vi.fn();
const mockGenerateChapter = vi.fn();
const mockConfirmCompletion = vi.fn();
const mockReopenProject = vi.fn();

vi.mock("@/api/chapter", () => ({
  getChapters: (...args: any[]) => mockGetChapters(...args),
  generateChapter: (...args: any[]) => mockGenerateChapter(...args),
}));

vi.mock("@/api/project", () => ({
  getProject: vi.fn().mockResolvedValue(null),
  confirmCompletion: (...args: any[]) => mockConfirmCompletion(...args),
  reopenProject: (...args: any[]) => mockReopenProject(...args),
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
  status: "PENDING" | "DRAFT" | "REVIEWING" | "COMPLETED" | "DISPUTED";
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
  // 8. Fetch on mount
  // ══════════════════════════════════════════════════════════════════

  describe("fetch on mount", () => {
    it("calls getChapters with the projectId on mount", async () => {
      mockGetChapters.mockResolvedValue(emptyChapters);
      await mountView({ projectId: "proj-123" });
      await vi.waitFor(() => {
        expect(mockGetChapters).toHaveBeenCalledWith("proj-123");
      });
    });
  });
});