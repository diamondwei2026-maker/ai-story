import { useState } from "react"
import { Sparkles, RefreshCw, X, Check, ChevronRight, ChevronDown, Loader2, AlertTriangle } from "lucide-react"
import type { Project } from "../../data/mockData"

interface OutlineStageProps {
  project: Project
  isReadOnly: boolean
  onConfirm: () => void
}

type OutlinePhase = "idle" | "generating" | "showing" | "confirmed"

const STRUCTURE_OPTIONS = [
  { value: "web-novel-ten", label: "网文十段结构（推荐）", desc: "适合长篇网文，含开场、成长、转折、决战等十个标准段落" },
  { value: "three-act", label: "三幕剧结构", desc: "经典戏剧结构，建立、对抗、解决，适合节奏紧凑的故事" },
  { value: "hero-journey", label: "英雄之旅", desc: "坎贝尔原型结构，主角召唤、历险、归来，适合成长类故事" },
  { value: "kishotenketsu", label: "起承转合", desc: "东方四段式叙事，适合情感细腻、节奏舒缓的故事" },
]

interface OutlineAct {
  actNumber: number
  actTitle: string
  color: string
  segments: OutlineSegment[]
}

interface OutlineSegment {
  id: string
  title: string
  summary: string
  keyEvents: string[]
  isClimax: boolean
  chapterRange: string
}

const MOCK_OUTLINE: OutlineAct[] = [
  {
    actNumber: 1,
    actTitle: "第一幕：觉醒降临",
    color: "violet",
    segments: [
      {
        id: "s1",
        title: "第一段：平凡少年",
        summary: "矿区少年陆晨的日常生活，铺垫他的普通出身与内心渴望，暗示其身世之谜",
        keyEvents: ["矿区生活场景", "母亲遗物暗示", "异常感知首现"],
        isClimax: false,
        chapterRange: "第1-2章",
      },
      {
        id: "s2",
        title: "第二段：密钥激活",
        summary: "陆晨意外触发星际密钥，首次觉醒引发剧烈反噬，政府特工追踪到来",
        keyEvents: ["密钥首次激活", "反噬体验描写", "特工追踪开场"],
        isClimax: false,
        chapterRange: "第3-5章",
      },
    ],
  },
  {
    actNumber: 2,
    actTitle: "第二幕：逃亡与成长",
    color: "blue",
    segments: [
      {
        id: "s3",
        title: "第三段：地下世界",
        summary: "陆晨逃入黎明组织，认识苏媛与宋非凡，了解觉醒者的真实处境",
        keyEvents: ["苏媛初遇", "宋非凡引路", "黎明组织揭秘"],
        isClimax: false,
        chapterRange: "第6-8章",
      },
      {
        id: "s4",
        title: "第四段：能力边界",
        summary: "陆晨在黎明基地训练，探索反噬上限，首次感受到真正的力量与失控的恐惧",
        keyEvents: ["首次共鸣训练", "反噬极限测试", "猎手小队袭击"],
        isClimax: true,
        chapterRange: "第9-12章",
      },
    ],
  },
  {
    actNumber: 3,
    actTitle: "第三幕：真相浮现",
    color: "emerald",
    segments: [
      {
        id: "s5",
        title: "第五段：意识深海",
        summary: "陆晨进入远古文明的意识残留，获取关键信息，对抗的本质开始转变",
        keyEvents: ["意识深潜", "远古记忆碎片", "寄生体线索"],
        isClimax: false,
        chapterRange: "第13-15章",
      },
      {
        id: "s6",
        title: "第六段：敌友重构",
        summary: "联盟议长揭示真实身份，黎明与联盟的矛盾暂时搁置，共同面对真正的威胁",
        keyEvents: ["议长真相揭露", "势力重新站队", "真正敌人确认"],
        isClimax: false,
        chapterRange: "第16-17章",
      },
    ],
  },
  {
    actNumber: 4,
    actTitle: "第四幕：决战与救赎",
    color: "amber",
    segments: [
      {
        id: "s7",
        title: "第七段：极限觉醒",
        summary: "陆晨突破意识深度极限，以生命为代价对抗寄生意识体，引发最后的反噬风暴",
        keyEvents: ["极限觉醒启动", "反噬风暴降临", "苏媛的抉择"],
        isClimax: true,
        chapterRange: "第18-19章",
      },
      {
        id: "s8",
        title: "第八段：涅槃归来",
        summary: "寄生体被封印，陆晨因苏媛共鸣奇迹生还，选择封印自身能力走向平凡",
        keyEvents: ["寄生体封印", "奇迹生还", "新生活开篇"],
        isClimax: false,
        chapterRange: "第20章",
      },
    ],
  },
]

const ANALYSIS = {
  rhythmNote: "整体节奏呈\"慢-中-快-慢\"的W形曲线，符合网文留存节奏规律",
  conflictNote: "冲突分布均匀，四幕各含至少一个高强度冲突节点，避免读者流失",
  climaxNote: "检测到2处主要高潮点（第4段末、第7段），建议在第4段高潮前增加1-2章情感铺垫以增强冲击力",
  warning: "第三幕节奏稍慢，第13-15章若展开不足可能导致读者流失，建议在该段插入子冲突以维持吸引力",
}

const ACT_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  violet: { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700", text: "text-violet-700" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", text: "text-blue-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", text: "text-emerald-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", text: "text-amber-700" },
}

export function OutlineStage({ project, isReadOnly, onConfirm }: OutlineStageProps) {
  const [phase, setPhase] = useState<OutlinePhase>(
    project.completedStages.includes("OUTLINE") ? "confirmed" : "idle"
  )
  const [structure, setStructure] = useState("web-novel-ten")
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [pendingStructure, setPendingStructure] = useState("")

  const handleGenerate = () => {
    setPhase("generating")
    setTimeout(() => setPhase("showing"), 2000)
  }

  const handleStructureChange = (value: string) => {
    if (phase === "showing" || phase === "confirmed") {
      setPendingStructure(value)
      setShowSwitchConfirm(true)
    } else {
      setStructure(value)
    }
  }

  const handleConfirmSwitch = () => {
    setStructure(pendingStructure)
    setShowSwitchConfirm(false)
    setPhase("generating")
    setTimeout(() => setPhase("showing"), 2000)
  }

  const handleRegenerate = () => {
    setPhase("generating")
    setTimeout(() => setPhase("showing"), 2000)
  }

  const handleConfirm = () => {
    setPhase("confirmed")
    onConfirm()
  }

  const currentStructure = STRUCTURE_OPTIONS.find((s) => s.value === structure)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Switch Confirm Modal */}
      {showSwitchConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-gray-900">确认切换叙事结构</h3>
                <p className="text-gray-500 text-sm mt-1">切换结构将重新生成大纲，已识别的关键情节点种子将被保留，其余内容将重新生成。</p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowSwitchConfirm(false)} className="text-sm text-gray-600 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                取消
              </button>
              <button onClick={handleConfirmSwitch} className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                确认切换并重新生成
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-gray-900">剧情大纲</h2>
          <p className="text-gray-500 text-sm mt-1">规划故事宏观结构和叙事节奏，选择叙事结构模板生成完整大纲</p>
        </div>
        {phase === "confirmed" && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
            <Check size={14} />
            已确认
          </span>
        )}
      </div>

      {/* Structure Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="text-sm text-gray-600 mb-2 block">叙事结构模板</label>
            <select
              value={structure}
              onChange={(e) => handleStructureChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
              disabled={isReadOnly}
            >
              {STRUCTURE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {currentStructure && (
              <p className="text-xs text-gray-400 mt-1.5">{currentStructure.desc}</p>
            )}
          </div>
          {!isReadOnly && (phase === "idle") && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-gray-700 transition-colors shrink-0 self-end mb-1"
            >
              <Sparkles size={15} />
              生成大纲
            </button>
          )}
        </div>
      </div>

      {/* Generating */}
      {phase === "generating" && (
        <div className="flex items-center gap-3 p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">AI 正在基于设定集生成完整剧情大纲...</span>
        </div>
      )}

      {/* Outline Cards */}
      {(phase === "showing" || phase === "confirmed") && (
        <div className="space-y-4">
          {MOCK_OUTLINE.map((act) => {
            const colors = ACT_COLORS[act.color]
            return (
              <div key={act.actNumber} className={`rounded-xl border ${colors.border} ${colors.bg} p-5 space-y-3`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                    第{act.actNumber}幕
                  </span>
                  <h3 className={`text-sm ${colors.text}`}>{act.actTitle}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {act.segments.map((seg) => (
                    <SegmentCard key={seg.id} segment={seg} />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Analysis Panel */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span>结构节奏分析与审查注释</span>
              <ChevronDown size={15} className={`transition-transform ${showAnalysis ? "rotate-180" : ""}`} />
            </button>
            {showAnalysis && (
              <div className="px-5 pb-5 space-y-3 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                  {[
                    { label: "节奏分析", text: ANALYSIS.rhythmNote, color: "blue" },
                    { label: "冲突分布", text: ANALYSIS.conflictNote, color: "emerald" },
                    { label: "高潮点检测", text: ANALYSIS.climaxNote, color: "violet" },
                  ].map(({ label, text, color }) => (
                    <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-lg p-3`}>
                      <div className={`text-xs text-${color}-600 font-medium mb-1`}>{label}</div>
                      <p className="text-xs text-gray-700 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-amber-700 font-medium mb-0.5">节奏预警</div>
                    <p className="text-xs text-amber-700 leading-relaxed">{ANALYSIS.warning}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isReadOnly && phase !== "confirmed" && (
            <div className="flex items-center justify-between">
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1.5 text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50"
              >
                <X size={13} />
                驳回并重新生成
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                <Check size={15} />
                确认大纲，进入细纲阶段
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SegmentCard({ segment }: { segment: OutlineSegment }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-800">{segment.title}</span>
          {segment.isClimax && (
            <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">高潮</span>
          )}
        </div>
        <span className="text-xs text-gray-400 shrink-0">{segment.chapterRange}</span>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{segment.summary}</p>
      <div className="flex flex-wrap gap-1.5">
        {segment.keyEvents.map((event) => (
          <span key={event} className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">
            {event}
          </span>
        ))}
      </div>
    </div>
  )
}
