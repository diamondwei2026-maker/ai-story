import { useState } from "react"
import { Sparkles, Check, ChevronRight, Loader2, FileText, Edit3, ShieldCheck, AlertTriangle, RotateCcw, ArrowLeft, Send, MessageSquare, ChevronDown } from "lucide-react"
import type { Project } from "../../data/mockData"

interface DraftingStageProps {
  project: Project
  isReadOnly: boolean
  onConfirm: () => void
}

type ChapterStatus = "待生成" | "生成中" | "草稿" | "待审核" | "已完成" | "争议"
type EditorView = "list" | "editor" | "review"
type GenerateMode = "新建续写" | "段落改写" | "文笔升级"

type ReviewDimension = "政治安全" | "色情尺度" | "暴力渲染" | "价值观"
type ReviewConclusion = "PASS" | "PASS_WITH_SUGGESTIONS" | "NEEDS_REVISION" | "BLOCKED"

interface Chapter {
  id: string
  number: number
  title: string
  wordCount: number
  status: ChapterStatus
  content?: string
  reviewResult?: ReviewResult
  appealUsed?: boolean
}

interface ReviewResult {
  conclusion: ReviewConclusion
  scores: Record<ReviewDimension, number>
  suggestions: Record<ReviewDimension, string>
}

const MOCK_CONTENT = `公元2347年，废弃矿区42号坑。

陆晨将最后一锹煤矸石扔进传送筐，直起腰来，听着机械臂轰鸣着把筐送往分拣站。他的手心里有一道红印子——今天已经是第三次了，矿区的震动越来越频繁，像是地层深处有什么东西在向上拱。

"陆晨。"宿管阿姨的声音从通讯系统里传来，"下班了，别在里面磨蹭了。"

他应了一声，摘下防尘面罩，走向出口。矿井里的灯光昏黄，把每一个工人的脸都照成同一种疲惫的颜色。

回到宿舍，陆晨翻出母亲的遗物箱，里面压在最底下的是一个巴掌大的金属盒子，表面刻着他看不懂的纹路。这是父亲唯一留下的东西——父亲在他三岁时失踪，连失踪的方式都没有留下任何记录。

陆晨把盒子放在桌上，随手拿起碗筷准备去打饭。

就在他背对着盒子的时候，背后突然有什么东西亮了。

他转过身。

盒子表面的纹路在发光。

陆晨站在那里，忘记了手里的碗筷，忘记了食堂要关门了，忘记了所有正常的、普通的事情。他的手伸向了那团光——

然后，一切都碎了。

不是眼前的场景碎了，而是他的意识碎了，像一块玻璃被锤子砸中，每一个碎片都在无限扩大，每一个碎片里都有一个宇宙，每一个宇宙里都有无数个他。

这就是觉醒。

没有人告诉他这会是什么感觉。没有人告诉他，这会那么痛。

脊背开始燃烧，像有什么东西在沿着脊髓往上爬，把他的神经一根一根地拧断，又一根一根地重新接上。他跌到地上，手撑着地，头低着，喉咙里发出一种连自己都陌生的声音。

反噬。

这个词在某个他不知道从哪里获得的记忆里浮现了出来。

觉醒了。

反噬了。

然后，宿舍楼的外墙在震动声中出现了一道裂缝。`

const generateChapters = (projectId: string): Chapter[] => {
  const isAdvanced = projectId === "1"
  if (!isAdvanced) {
    return Array.from({ length: 10 }, (_, i) => ({
      id: `ch-${i + 1}`,
      number: i + 1,
      title: `第${i + 1}章`,
      wordCount: 0,
      status: "待生成" as ChapterStatus,
    }))
  }

  const statuses: ChapterStatus[] = [
    "已完成", "已完成", "已完成", "已完成", "已完成",
    "已完成", "已完成", "已完成", "已完成", "已完成",
    "已完成", "已完成", "已完成", "已完成", "已完成",
    "草稿", "待审核", "待生成", "待生成", "待生成",
  ]

  const titles = [
    "普通少年", "密钥激活", "亡命之夜", "地下黎明", "极限边界",
    "猎手降临", "极限牺牲", "共鸣初现", "意识深海", "联盟决裂",
    "前锋出击", "苏媛的秘密", "道德困境", "极限突破", "真相碎片",
    "反噬风暴", "敌友重构", "真正的敌人", "生死抉择", "涅槃归来",
  ]

  return statuses.map((status, i) => ({
    id: `ch-${i + 1}`,
    number: i + 1,
    title: `第${i + 1}章 ${titles[i]}`,
    wordCount: status === "待生成" ? 0 : 3000 + Math.floor(Math.random() * 800),
    status,
    content: status !== "待生成" ? MOCK_CONTENT : undefined,
    reviewResult:
      status === "待审核"
        ? {
            conclusion: "PASS_WITH_SUGGESTIONS" as ReviewConclusion,
            scores: { 政治安全: 9, 色情尺度: 9, 暴力渲染: 6, 价值观: 8 },
            suggestions: {
              政治安全: "内容不涉及敏感政治隐喻，通过",
              色情尺度: "无不当内容，通过",
              暴力渲染: "第3段战斗描写较为激烈，建议适当软化打斗细节中的血腥描写，目前处于可接受边缘",
              价值观: "主角动机正向，通过",
            },
          }
        : undefined,
  }))
}

const STATUS_COLORS: Record<ChapterStatus, string> = {
  待生成: "bg-gray-100 text-gray-500",
  生成中: "bg-blue-100 text-blue-600",
  草稿: "bg-amber-100 text-amber-700",
  待审核: "bg-violet-100 text-violet-700",
  已完成: "bg-emerald-100 text-emerald-700",
  争议: "bg-rose-100 text-rose-700",
}

const CONCLUSION_MAP: Record<ReviewConclusion, { label: string; color: string; desc: string }> = {
  PASS: { label: "审核通过", color: "emerald", desc: "所有维度均达标，章节可直接标记为已完成" },
  PASS_WITH_SUGGESTIONS: { label: "通过（含建议）", color: "amber", desc: "基本通过，部分维度有优化建议，可采纳后重新审核，也可直接确认" },
  NEEDS_REVISION: { label: "需要修改", color: "orange", desc: "存在需要修改的内容，建议按修改意见调整后重新提交审核" },
  BLOCKED: { label: "审核拦截", color: "red", desc: "存在不合规内容，必须手动修改正文后重新提交，或提出上诉" },
}

export function DraftingStage({ project, isReadOnly, onConfirm }: DraftingStageProps) {
  const [chapters, setChapters] = useState<Chapter[]>(() => generateChapters(project.id))
  const [editorView, setEditorView] = useState<EditorView>("list")
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [showModeSelect, setShowModeSelect] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [showAppealInput, setShowAppealInput] = useState(false)
  const [appealText, setAppealText] = useState("")
  const [chapterContent, setChapterContent] = useState(MOCK_CONTENT)

  const activeChapter = chapters.find((c) => c.id === activeChapterId) ?? null

  const openChapter = (chapter: Chapter) => {
    setActiveChapterId(chapter.id)
    setChapterContent(chapter.content ?? "")
    setEditorView("editor")
  }

  const generateChapter = (chapterId: string) => {
    setGeneratingId(chapterId)
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, status: "生成中" } : c))
    )
    setTimeout(() => {
      setChapters((prev) =>
        prev.map((c) =>
          c.id === chapterId ? { ...c, status: "草稿", wordCount: 3200, content: MOCK_CONTENT } : c
        )
      )
      setGeneratingId(null)
    }, 2000)
  }

  const submitReview = (chapterId: string) => {
    setReviewingId(chapterId)
    setTimeout(() => {
      setChapters((prev) =>
        prev.map((c) =>
          c.id === chapterId
            ? {
                ...c,
                status: "待审核",
                reviewResult: {
                  conclusion: "PASS_WITH_SUGGESTIONS",
                  scores: { 政治安全: 9, 色情尺度: 9, 暴力渲染: 6, 价值观: 8 },
                  suggestions: {
                    政治安全: "内容不涉及敏感政治隐喻，通过",
                    色情尺度: "无不当内容，通过",
                    暴力渲染: "战斗描写较为激烈，建议适当软化打斗细节中的血腥描写",
                    价值观: "主角动机正向，通过",
                  },
                },
              }
            : c
        )
      )
      setReviewingId(null)
      setEditorView("review")
    }, 2000)
  }

  const confirmChapter = (chapterId: string) => {
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, status: "已完成" } : c))
    )
    setEditorView("list")
  }

  const markDispute = (chapterId: string) => {
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, status: "争议" } : c))
    )
    setEditorView("list")
  }

  const allDone = chapters.every((c) => c.status === "已完成" || c.status === "争议")
  const completedCount = chapters.filter((c) => c.status === "已完成" || c.status === "争议").length

  return (
    <div className="h-[calc(100vh-57px)] flex">
      {/* Left: Chapter List */}
      <div className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-700">章节列表</span>
            <span className="text-xs text-gray-400">{completedCount}/{chapters.length} 完成</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(completedCount / chapters.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => openChapter(chapter)}
              className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                activeChapterId === chapter.id ? "bg-gray-50" : ""
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                chapter.status === "已完成" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
              }`}>
                {chapter.status === "已完成" ? <Check size={11} /> : chapter.number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{chapter.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[chapter.status]}`}>
                    {chapter.status}
                  </span>
                  {chapter.wordCount > 0 && (
                    <span className="text-xs text-gray-400">{chapter.wordCount}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {allDone && !isReadOnly && (
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={onConfirm}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-lg text-sm hover:bg-gray-700"
            >
              <Check size={14} />
              完本
            </button>
          </div>
        )}
      </div>

      {/* Right: Editor / Review */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {editorView === "list" && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center space-y-2">
              <FileText size={32} className="mx-auto opacity-30" />
              <p className="text-sm">从左侧选择章节开始创作</p>
            </div>
          </div>
        )}

        {(editorView === "editor" || editorView === "review") && activeChapter && (
          <>
            {/* Editor Header */}
            <div className="border-b border-gray-200 bg-white px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditorView("list"); setActiveChapterId(null) }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft size={16} />
                </button>
                <span className="text-sm text-gray-700">{activeChapter.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[activeChapter.status]}`}>
                  {activeChapter.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {activeChapter.wordCount > 0 && (
                  <span className="text-xs text-gray-400">{activeChapter.wordCount} 字</span>
                )}
                {!isReadOnly && (activeChapter.status === "草稿" || activeChapter.status === "待生成") && (
                  <>
                    <div className="relative">
                      <button
                        onClick={() => setShowModeSelect(!showModeSelect)}
                        className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        <RotateCcw size={13} />
                        重新生成
                        <ChevronDown size={12} />
                      </button>
                      {showModeSelect && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-56 overflow-hidden">
                          {(["新建续写", "段落改写", "文笔升级"] as GenerateMode[]).map((mode) => {
                            const modeDesc: Record<GenerateMode, string> = {
                              新建续写: "忽略现有正文，独立创作整章",
                              段落改写: "保留剧情骨架，重新组织结构",
                              文笔升级: "仅提升场景描写和文字品质",
                            }
                            return (
                              <button
                                key={mode}
                                onClick={() => {
                                  setShowModeSelect(false)
                                  generateChapter(activeChapter.id)
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                              >
                                <div className="text-sm text-gray-800">{mode}</div>
                                <div className="text-xs text-gray-400 mt-0.5">{modeDesc[mode]}</div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    {activeChapter.status === "草稿" && (
                      <button
                        onClick={() => submitReview(activeChapter.id)}
                        disabled={reviewingId === activeChapter.id}
                        className="flex items-center gap-1.5 text-sm bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-50"
                      >
                        {reviewingId === activeChapter.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={13} />
                        )}
                        提交审核
                      </button>
                    )}
                  </>
                )}
                {!isReadOnly && activeChapter.status === "待审核" && (
                  <button
                    onClick={() => setEditorView("review")}
                    className="flex items-center gap-1.5 text-sm bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-200"
                  >
                    <ShieldCheck size={13} />
                    查看审核结果
                  </button>
                )}
              </div>
            </div>

            {/* Generating state */}
            {(generatingId === activeChapter.id || reviewingId === activeChapter.id) && (
              <div className="flex items-center gap-3 mx-5 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">
                  {generatingId === activeChapter.id ? "AI 正在生成章节正文..." : "AI 正在进行内容安全审核..."}
                </span>
              </div>
            )}

            {/* Review Panel */}
            {editorView === "review" && activeChapter.reviewResult && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <ReviewPanel
                  chapter={activeChapter}
                  reviewResult={activeChapter.reviewResult}
                  showAppealInput={showAppealInput}
                  appealText={appealText}
                  onAppealTextChange={setAppealText}
                  onShowAppeal={() => setShowAppealInput(true)}
                  onConfirm={() => confirmChapter(activeChapter.id)}
                  onMarkDispute={() => markDispute(activeChapter.id)}
                  onBackToEditor={() => setEditorView("editor")}
                  isReadOnly={isReadOnly}
                />
              </div>
            )}

            {/* Editor Content */}
            {editorView === "editor" && (
              <div className="flex-1 overflow-y-auto">
                {activeChapter.status === "待生成" ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                    <FileText size={32} className="opacity-30" />
                    <p className="text-sm">本章正文尚未生成</p>
                    {!isReadOnly && (
                      <button
                        onClick={() => generateChapter(activeChapter.id)}
                        disabled={!!generatingId}
                        className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50"
                      >
                        <Sparkles size={15} />
                        生成正文
                      </button>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={chapterContent}
                    onChange={(e) => !isReadOnly && setChapterContent(e.target.value)}
                    className="w-full h-full p-6 text-sm text-gray-800 leading-8 resize-none focus:outline-none bg-white"
                    readOnly={isReadOnly}
                    placeholder="章节内容..."
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ReviewPanel({
  chapter,
  reviewResult,
  showAppealInput,
  appealText,
  onAppealTextChange,
  onShowAppeal,
  onConfirm,
  onMarkDispute,
  onBackToEditor,
  isReadOnly,
}: {
  chapter: Chapter
  reviewResult: ReviewResult
  showAppealInput: boolean
  appealText: string
  onAppealTextChange: (v: string) => void
  onShowAppeal: () => void
  onConfirm: () => void
  onMarkDispute: () => void
  onBackToEditor: () => void
  isReadOnly: boolean
}) {
  const conclusion = CONCLUSION_MAP[reviewResult.conclusion]
  const conclusionColorMap: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    red: "bg-red-50 border-red-200 text-red-700",
  }
  const scoreBg = (score: number) =>
    score >= 7 ? "bg-emerald-100 text-emerald-700" : score >= 5 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"

  const dimensions: ReviewDimension[] = ["政治安全", "色情尺度", "暴力渲染", "价值观"]

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900">内容安全审核结果</h3>
        <button onClick={onBackToEditor} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <Edit3 size={13} />
          返回编辑
        </button>
      </div>

      <div className={`flex items-start gap-3 p-4 rounded-xl border ${conclusionColorMap[conclusion.color]}`}>
        <ShieldCheck size={18} className="shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-medium">{conclusion.label} — {reviewResult.conclusion}</div>
          <p className="text-sm mt-0.5 opacity-90">{conclusion.desc}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h4 className="text-sm text-gray-700">四维度评分</h4>
        <div className="space-y-3">
          {dimensions.map((dim) => {
            const score = reviewResult.scores[dim]
            return (
              <div key={dim} className="flex items-start gap-3">
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${scoreBg(score)}`}>{score} 分</span>
                  <span className="text-sm text-gray-700">{dim}</span>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                    <div
                      className={`h-1.5 rounded-full ${score >= 7 ? "bg-emerald-500" : score >= 5 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${score * 10}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{reviewResult.suggestions[dim]}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {!isReadOnly && (
        <div className="space-y-3">
          {showAppealInput ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <MessageSquare size={15} className="text-gray-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-700 mb-0.5">提交上诉说明</div>
                  <p className="text-xs text-gray-400">每章仅限上诉一次，请详细说明理由</p>
                </div>
              </div>
              <textarea
                value={appealText}
                onChange={(e) => onAppealTextChange(e.target.value)}
                placeholder="请详细说明本章内容的创作意图和无害性理由..."
                className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 min-h-[80px]"
                rows={3}
              />
              <button
                disabled={!appealText.trim()}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40"
              >
                <Send size={13} />
                提交上诉
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {reviewResult.conclusion === "PASS" && (
                <button onClick={onConfirm} className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">
                  <Check size={13} />
                  确认完成
                </button>
              )}
              {(reviewResult.conclusion === "PASS_WITH_SUGGESTIONS" || reviewResult.conclusion === "NEEDS_REVISION") && (
                <>
                  <button onClick={onConfirm} className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">
                    <Check size={13} />
                    忽略建议，直接确认
                  </button>
                  <button onClick={onBackToEditor} className="flex items-center gap-1.5 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                    <Edit3 size={13} />
                    手动修改后重新审核
                  </button>
                </>
              )}
              {reviewResult.conclusion === "BLOCKED" && (
                <button onClick={onBackToEditor} className="flex items-center gap-1.5 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-50">
                  <Edit3 size={13} />
                  返回修改正文
                </button>
              )}
              {!chapter.appealUsed && (
                <button onClick={onShowAppeal} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  <MessageSquare size={13} />
                  提出上诉
                </button>
              )}
              <button onClick={onMarkDispute} className="flex items-center gap-1.5 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-sm hover:bg-amber-50">
                <AlertTriangle size={13} />
                标记为争议
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
