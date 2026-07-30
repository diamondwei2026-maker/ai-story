import { useState } from "react"
import {
  Sparkles, Check, ChevronRight, Loader2, AlertTriangle, Zap,
  ChevronDown, ChevronUp, Star, StarOff, Wand2, ListChecks, X,
} from "lucide-react"
import type { Project } from "../../data/mockData"

interface BeatsStageProps {
  project: Project
  isReadOnly: boolean
  onConfirm: () => void
}

type BeatsPhase = "idle" | "generating" | "showing" | "confirmed"
type RhythmTag = "快" | "中" | "慢"

interface Beat {
  id: string
  chapterNumber: number
  narrativeSummary: string
  conflictDescription: string
  wordCount: number
  rhythmTag: RhythmTag
  conflictIntensity: 1 | 2 | 3 | 4 | 5
  isClimax: boolean
  hookInfo: string
}

const RHYTHM_COLORS: Record<RhythmTag, string> = {
  快: "bg-rose-100 text-rose-700",
  中: "bg-amber-100 text-amber-700",
  慢: "bg-blue-100 text-blue-700",
}

const INITIAL_BEATS: Beat[] = [
  { id: "b1",  chapterNumber: 1,  narrativeSummary: "陆晨在废弃矿区的日常工作，偶尔感受到地层深处的异样震动，回家发现父亲留下的奇异盒子发光",      conflictDescription: "内心对普通生活的渴望与对父亲身份之谜的好奇之间的拉扯",          wordCount: 3000, rhythmTag: "慢", conflictIntensity: 2, isClimax: false, hookInfo: "神秘盒子来历（第8章回收）" },
  { id: "b2",  chapterNumber: 2,  narrativeSummary: "陆晨独自打开盒子，触发星际密钥，意识瞬间扩张至极限，第一次感受到反噬的撕裂感",                conflictDescription: "失控的能量扩张与生存本能的剧烈对抗",                              wordCount: 3200, rhythmTag: "快", conflictIntensity: 4, isClimax: false, hookInfo: "密钥真实功能（第15章回收）" },
  { id: "b3",  chapterNumber: 3,  narrativeSummary: "政府觉醒监测系统触发警报，特工小队赶赴矿区，陆晨被迫逃亡，在废墟中遇到神秘少女苏媛",            conflictDescription: "外部追捕压力与陌生人信任的两难",                                  wordCount: 3000, rhythmTag: "快", conflictIntensity: 3, isClimax: false, hookInfo: "苏媛真实身份（第12章回收）" },
  { id: "b4",  chapterNumber: 4,  narrativeSummary: "苏媛带陆晨进入黎明组织地下基地，宋非凡解释觉醒者生存现状，陆晨了解反噬系统本质",                conflictDescription: "接受组织庇护与独立自主之间的矛盾",                              wordCount: 2800, rhythmTag: "慢", conflictIntensity: 2, isClimax: false, hookInfo: "宋非凡过去（第10章回收）" },
  { id: "b5",  chapterNumber: 5,  narrativeSummary: "陆晨参加第一次能力训练，发现自己的反噬烈度远超其他觉醒者，但共鸣能力同样达到前所未有的深度",  conflictDescription: "超凡能力的诱惑与已知死亡代价的恐惧",                              wordCount: 3000, rhythmTag: "中", conflictIntensity: 3, isClimax: false, hookInfo: "共鸣能力极限（第14章回收）" },
  { id: "b6",  chapterNumber: 6,  narrativeSummary: "联盟特工猎手小队追踪到基地附近，宋非凡决定主动出击，陆晨第一次参与真实战斗",                    conflictDescription: "未经考验的能力在生死关头的首次检验",                          wordCount: 3500, rhythmTag: "快", conflictIntensity: 4, isClimax: false, hookInfo: "猎手小队幕后主使（第16章回收）" },
  { id: "b7",  chapterNumber: 7,  narrativeSummary: "战斗中陆晨被迫全力释放能力，挡下了本将重创宋非凡的攻击，但随即陷入严重反噬昏迷",                conflictDescription: "保护他人的意志与自我保存本能的极限碰撞",                      wordCount: 4000, rhythmTag: "快", conflictIntensity: 5, isClimax: true,  hookInfo: "昏迷中看到的意识画面（第9章揭示）" },
  { id: "b8",  chapterNumber: 8,  narrativeSummary: "陆晨昏迷三天，苏媛守护在旁，两人第一次意识共鸣自然发生，双方感知到彼此的深层记忆",              conflictDescription: "情感羁绊加深与共鸣带来的心理脆弱性暴露",                      wordCount: 3000, rhythmTag: "慢", conflictIntensity: 2, isClimax: false, hookInfo: "苏媛家族记忆片段（第12章回收）" },
  { id: "b9",  chapterNumber: 9,  narrativeSummary: "陆晨从昏迷中醒来，意识深度提升，但反噬阈值预警更加接近，在意识残留中看到远古文明的片段",      conflictDescription: "变强的喜悦与生命倒计时加速的双重认知",                        wordCount: 3000, rhythmTag: "中", conflictIntensity: 3, isClimax: false, hookInfo: "远古文明真相（第15章揭示）" },
  { id: "b10", chapterNumber: 10, narrativeSummary: "黎明与联盟的谈判会议破裂，宋非凡决定发起全面对抗，陆晨被指定为前锋",                            conflictDescription: "个人命运被更大格局裹挟的无力感与使命感",                      wordCount: 2800, rhythmTag: "中", conflictIntensity: 3, isClimax: false, hookInfo: "议长的隐藏议程（第16章揭示）" },
]

// Extract chapter numbers mentioned in a hookInfo string
function parseHookChapters(hookInfo: string): number[] {
  const matches = hookInfo.match(/第(\d+)章/g) ?? []
  return matches.map((m) => parseInt(m.replace("第", "").replace("章", ""), 10))
}

// Find beats affected by a change to `targetBeat`
function findAffectedBeats(beats: Beat[], targetBeat: Beat): Beat[] {
  const targetNum = targetBeat.chapterNumber
  const hooked = parseHookChapters(targetBeat.hookInfo)
  return beats.filter((b) => {
    if (b.id === targetBeat.id) return false
    // This beat is in the hook chain of the target
    if (hooked.includes(b.chapterNumber)) return true
    // This beat references the target chapter in its own hook
    if (parseHookChapters(b.hookInfo).includes(targetNum)) return true
    return false
  })
}

export function BeatsStage({ project, isReadOnly, onConfirm }: BeatsStageProps) {
  const [phase, setPhase] = useState<BeatsPhase>(
    project.completedStages.includes("BEATS") ? "confirmed" : "idle"
  )
  const [chapterCount, setChapterCount] = useState("20")
  const [wordsPerChapter, setWordsPerChapter] = useState("3000")
  const [beats, setBeats] = useState<Beat[]>(INITIAL_BEATS)
  const [expandedBeat, setExpandedBeat] = useState<string | null>("b1")
  const [showRhythmPanel, setShowRhythmPanel] = useState(false)

  // Adjust single chapter
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [adjustPopoverId, setAdjustPopoverId] = useState<string | null>(null)
  const [adjustInput, setAdjustInput] = useState("")

  // Impact preview
  const [impactBeatId, setImpactBeatId] = useState<string | null>(null)

  // Batch select mode
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchInput, setBatchInput] = useState("")
  const [batchAdjusting, setBatchAdjusting] = useState(false)

  const handleGenerate = () => {
    setPhase("generating")
    setTimeout(() => setPhase("showing"), 2200)
  }

  const handleConfirm = () => {
    setPhase("confirmed")
    onConfirm()
  }

  const handleToggleClimax = (id: string) => {
    setBeats((prev) => prev.map((b) => (b.id === id ? { ...b, isClimax: !b.isClimax } : b)))
  }

  const handleWordCountChange = (id: string, val: number) => {
    setBeats((prev) => prev.map((b) => (b.id === id ? { ...b, wordCount: val } : b)))
    setImpactBeatId(id)
  }

  const handleAiAdjust = (id: string) => {
    setAdjustingId(id)
    setAdjustPopoverId(null)
    setAdjustInput("")
    setTimeout(() => {
      setAdjustingId(null)
      setImpactBeatId(id)
      // Simulate updated content
      setBeats((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, narrativeSummary: b.narrativeSummary + "（已根据调整指令优化）", wordCount: b.wordCount + 200 }
            : b
        )
      )
    }, 1500)
  }

  const handleBatchAdjust = () => {
    if (!batchInput.trim() || selectedIds.size === 0) return
    setBatchAdjusting(true)
    setTimeout(() => {
      const wc = parseInt(batchInput.match(/\d+/)?.[0] ?? "0", 10)
      setBeats((prev) =>
        prev.map((b) => {
          if (!selectedIds.has(b.id)) return b
          return wc > 0 ? { ...b, wordCount: wc } : { ...b, narrativeSummary: b.narrativeSummary + "（批量调整）" }
        })
      )
      setBatchAdjusting(false)
      setSelectMode(false)
      setSelectedIds(new Set())
      setBatchInput("")
    }, 1800)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const climaxCount = beats.filter((b) => b.isClimax).length
  const avgIntensity = beats.reduce((s, b) => s + b.conflictIntensity, 0) / beats.length
  const hasWarning = beats.some((b, i) => i > 0 && b.conflictIntensity < beats[i - 1].conflictIntensity - 2)
  const totalWords = beats.reduce((s, b) => s + b.wordCount, 0)
  const impactBeat = impactBeatId ? beats.find((b) => b.id === impactBeatId) ?? null : null
  const affectedBeats = impactBeat ? findAffectedBeats(beats, impactBeat) : []

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-gray-900">细纲拆解</h2>
          <p className="text-gray-500 text-sm mt-1">将大纲拆解为逐章的详细节拍计划，为正文写作提供精确导航</p>
        </div>
        {phase === "confirmed" && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
            <Check size={14} />
            已确认
          </span>
        )}
      </div>

      {/* Config Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="text-sm text-gray-600 mb-1.5 block">目标章节数</label>
            <input
              type="number"
              value={chapterCount}
              onChange={(e) => !isReadOnly && setChapterCount(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-gray-400"
              min="1"
              disabled={isReadOnly || phase !== "idle"}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1.5 block">默认每章字数</label>
            <input
              type="number"
              value={wordsPerChapter}
              onChange={(e) => !isReadOnly && setWordsPerChapter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-gray-400"
              min="500"
              step="500"
              disabled={isReadOnly || phase !== "idle"}
            />
          </div>
          {!isReadOnly && phase === "idle" && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-gray-700 transition-colors"
            >
              <Sparkles size={15} />
              开始拆解
            </button>
          )}
          {(phase === "showing" || phase === "confirmed") && (
            <div className="text-sm text-gray-500 ml-auto">
              共 {beats.length} 章，预估总字数约 {(totalWords / 10000).toFixed(1)} 万字
            </div>
          )}
        </div>
      </div>

      {/* Generating */}
      {phase === "generating" && (
        <div className="flex items-center gap-3 p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">AI 正在拆解大纲，生成逐章节拍计划...</span>
        </div>
      )}

      {(phase === "showing" || phase === "confirmed") && (
        <div className="space-y-4">
          {/* Rhythm Analysis Panel */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowRhythmPanel(!showRhythmPanel)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <Zap size={14} className="text-amber-500" />
                节奏分析面板
                {hasWarning && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">1 条预警</span>
                )}
              </span>
              <ChevronDown size={15} className={`transition-transform ${showRhythmPanel ? "rotate-180" : ""}`} />
            </button>
            {showRhythmPanel && (
              <div className="px-5 pb-5 border-t border-gray-200 space-y-4 pt-4">
                <div>
                  <div className="text-xs text-gray-500 mb-2">冲突强度曲线（共 {beats.length} 章）</div>
                  <div className="flex items-end gap-1 h-16">
                    {beats.map((beat) => {
                      const heightPct = (beat.conflictIntensity / 5) * 100
                      const color = beat.isClimax ? "bg-rose-500" : beat.conflictIntensity >= 4 ? "bg-amber-400" : "bg-blue-300"
                      return (
                        <div key={beat.id} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`第${beat.chapterNumber}章 强度${beat.conflictIntensity}`}>
                          <div className={`w-full rounded-sm ${color}`} style={{ height: `${heightPct}%` }} />
                          <span className="text-[9px] text-gray-400">{beat.chapterNumber}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">整体节奏评分</div>
                    <div className="text-lg text-gray-900">{(avgIntensity * 1.8).toFixed(1)}</div>
                    <div className="text-xs text-emerald-600">良好</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">平均冲突强度</div>
                    <div className="text-lg text-gray-900">{avgIntensity.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">满分 5.0</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">高潮章节数</div>
                    <div className="text-lg text-gray-900">{climaxCount}</div>
                    <div className="text-xs text-gray-500">共 {beats.length} 章</div>
                  </div>
                </div>
                {hasWarning && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">第4章至第5章冲突强度下降幅度较大，建议在第4章结尾增加"读者期待钩子"以维持阅读吸引力</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Impact Preview Banner */}
          {impactBeat && affectedBeats.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <AlertTriangle size={15} className="text-amber-500" />
                  <span>第{impactBeat.chapterNumber}章调整影响了 {affectedBeats.length} 个关联章节</span>
                </div>
                <button onClick={() => setImpactBeatId(null)} className="text-amber-500 hover:text-amber-700">
                  <X size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {affectedBeats.map((b) => (
                  <span key={b.id} className="text-xs bg-amber-100 border border-amber-300 text-amber-800 px-2.5 py-1 rounded-md">
                    第{b.chapterNumber}章（{b.hookInfo.slice(0, 10)}...）
                  </span>
                ))}
              </div>
              <p className="text-xs text-amber-700">以上章节存在钩子因果关联，本次修改可能影响其叙事连贯性，建议逐一检查。</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setImpactBeatId(null)}
                  className="text-xs text-amber-800 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100"
                >
                  已知晓，确认调整
                </button>
                <button
                  onClick={() => {
                    setBeats(INITIAL_BEATS)
                    setImpactBeatId(null)
                  }}
                  className="text-xs text-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-100"
                >
                  撤销本次修改
                </button>
              </div>
            </div>
          )}

          {/* Beat Cards Header */}
          {!isReadOnly && phase !== "confirmed" && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">共 {beats.length} 章</span>
              <button
                onClick={() => {
                  setSelectMode(!selectMode)
                  setSelectedIds(new Set())
                  setBatchInput("")
                }}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  selectMode
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ListChecks size={14} />
                {selectMode ? "退出批量模式" : "批量调整"}
              </button>
            </div>
          )}

          {/* Beat Cards */}
          <div className="space-y-3">
            {beats.map((beat) => (
              <BeatCard
                key={beat.id}
                beat={beat}
                isExpanded={expandedBeat === beat.id}
                isReadOnly={isReadOnly || phase === "confirmed"}
                selectMode={selectMode}
                isSelected={selectedIds.has(beat.id)}
                isAdjusting={adjustingId === beat.id}
                showAdjustPopover={adjustPopoverId === beat.id}
                adjustInput={beat.id === adjustPopoverId ? adjustInput : ""}
                onToggle={() => setExpandedBeat(expandedBeat === beat.id ? null : beat.id)}
                onToggleSelect={() => toggleSelect(beat.id)}
                onToggleClimax={() => handleToggleClimax(beat.id)}
                onWordCountChange={(v) => handleWordCountChange(beat.id, v)}
                onOpenAdjustPopover={() => {
                  setAdjustPopoverId(adjustPopoverId === beat.id ? null : beat.id)
                  setAdjustInput("")
                }}
                onAdjustInputChange={setAdjustInput}
                onConfirmAiAdjust={() => handleAiAdjust(beat.id)}
                onCloseAdjustPopover={() => setAdjustPopoverId(null)}
              />
            ))}
          </div>

          {/* Confirm */}
          {!isReadOnly && phase !== "confirmed" && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                <Check size={15} />
                确认细纲，进入正文阶段
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Batch Adjust Bottom Bar */}
      {selectMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center gap-3 z-30 shadow-lg">
          <span className="text-sm text-gray-600 shrink-0">
            已选 <span className="text-gray-900">{selectedIds.size}</span> 章
          </span>
          <input
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            placeholder="输入批量调整指令，例如：将字数统一改为 4000..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          <button
            onClick={handleBatchAdjust}
            disabled={!batchInput.trim() || selectedIds.size === 0 || batchAdjusting}
            className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {batchAdjusting ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            AI 批量调整
          </button>
          <button
            onClick={() => { setSelectMode(false); setSelectedIds(new Set()); setBatchInput("") }}
            className="text-sm text-gray-500 px-3 py-2 hover:text-gray-700 shrink-0"
          >
            取消
          </button>
        </div>
      )}
    </div>
  )
}

function BeatCard({
  beat,
  isExpanded,
  isReadOnly,
  selectMode,
  isSelected,
  isAdjusting,
  showAdjustPopover,
  adjustInput,
  onToggle,
  onToggleSelect,
  onToggleClimax,
  onWordCountChange,
  onOpenAdjustPopover,
  onAdjustInputChange,
  onConfirmAiAdjust,
  onCloseAdjustPopover,
}: {
  beat: Beat
  isExpanded: boolean
  isReadOnly: boolean
  selectMode: boolean
  isSelected: boolean
  isAdjusting: boolean
  showAdjustPopover: boolean
  adjustInput: string
  onToggle: () => void
  onToggleSelect: () => void
  onToggleClimax: () => void
  onWordCountChange: (v: number) => void
  onOpenAdjustPopover: () => void
  onAdjustInputChange: (v: string) => void
  onConfirmAiAdjust: () => void
  onCloseAdjustPopover: () => void
}) {
  const IntensityDots = ({ level }: { level: number }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${i <= level ? "bg-rose-500" : "bg-gray-200"}`} />
      ))}
    </div>
  )

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-colors ${
        isSelected
          ? "border-gray-900"
          : beat.isClimax
          ? "border-rose-200"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-3.5">
        {/* Select checkbox */}
        {selectMode && (
          <button
            onClick={onToggleSelect}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              isSelected ? "bg-gray-900 border-gray-900" : "border-gray-300 hover:border-gray-500"
            }`}
          >
            {isSelected && <Check size={11} className="text-white" />}
          </button>
        )}

        {/* Chapter number avatar */}
        <button
          onClick={onToggle}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
            beat.isClimax ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {beat.chapterNumber}
        </button>

        {/* Content area (clickable to expand) */}
        <button onClick={onToggle} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            {beat.isClimax && (
              <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">高潮章节</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${RHYTHM_COLORS[beat.rhythmTag]}`}>
              节奏: {beat.rhythmTag}
            </span>
            <IntensityDots level={beat.conflictIntensity} />
          </div>
          <p className="text-sm text-gray-700 mt-1 truncate">{beat.narrativeSummary}</p>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-gray-400 mr-1">{(beat.wordCount / 1000).toFixed(1)}k 字</span>

          {!isReadOnly && !selectMode && (
            <>
              {/* Toggle climax */}
              <button
                onClick={onToggleClimax}
                title={beat.isClimax ? "取消高潮标记" : "标记为高潮章节"}
                className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${
                  beat.isClimax ? "text-rose-500" : "text-gray-300 hover:text-gray-500"
                }`}
              >
                {beat.isClimax ? <Star size={14} /> : <StarOff size={14} />}
              </button>

              {/* AI adjust single chapter */}
              <div className="relative">
                <button
                  onClick={onOpenAdjustPopover}
                  title="AI 调整本章"
                  className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${
                    showAdjustPopover ? "bg-gray-100 text-gray-700" : "text-gray-400 hover:text-gray-600"
                  }`}
                  disabled={isAdjusting}
                >
                  {isAdjusting ? (
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                  ) : (
                    <Wand2 size={14} />
                  )}
                </button>

                {showAdjustPopover && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-64 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">AI 调整第{beat.chapterNumber}章</span>
                      <button onClick={onCloseAdjustPopover} className="text-gray-400 hover:text-gray-600">
                        <X size={12} />
                      </button>
                    </div>
                    <input
                      value={adjustInput}
                      onChange={(e) => onAdjustInputChange(e.target.value)}
                      placeholder="例如：节奏改快、增加悬念钩子..."
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && adjustInput.trim()) onConfirmAiAdjust()
                      }}
                    />
                    <button
                      onClick={onConfirmAiAdjust}
                      disabled={!adjustInput.trim()}
                      className="w-full flex items-center justify-center gap-1.5 bg-gray-900 text-white py-1.5 rounded-lg text-xs hover:bg-gray-700 disabled:opacity-40"
                    >
                      <Sparkles size={11} />
                      确认调整
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          <button onClick={onToggle} className="p-1.5 text-gray-400">
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1.5">叙事摘要</div>
              <p className="text-sm text-gray-700 leading-relaxed">{beat.narrativeSummary}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1.5">核心冲突</div>
              <p className="text-sm text-gray-700 leading-relaxed">{beat.conflictDescription}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Word count inline edit */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">本章字数</span>
              {isReadOnly ? (
                <span className="text-xs text-gray-700">{beat.wordCount}</span>
              ) : (
                <input
                  type="number"
                  value={beat.wordCount}
                  onChange={(e) => onWordCountChange(Number(e.target.value))}
                  className="border border-gray-200 rounded-md px-2 py-1 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  min="500"
                  step="100"
                />
              )}
              <span className="text-xs text-gray-400">字</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-xs text-amber-600 mb-1">钩子因果链</div>
            <p className="text-xs text-amber-800">{beat.hookInfo}</p>
          </div>
        </div>
      )}
    </div>
  )
}
