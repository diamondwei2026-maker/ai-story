import { useState } from "react"
import { Sparkles, RefreshCw, Check, ChevronRight, Loader2 } from "lucide-react"
import type { Project } from "../../data/mockData"

interface IdeaStageProps {
  project: Project
  isReadOnly: boolean
  onConfirm: () => void
}

type IdeaPhase = "input" | "generating-points" | "showing-points" | "generating-intro" | "showing-intro" | "confirmed"

const EXAMPLE_PROMPTS = [
  "一位失忆的古代将领穿越到现代，发现自己竟然是某个神秘组织的预言中人",
  "末日病毒爆发后，一名外科医生发现少数人对病毒有天然免疫，而她的女儿就是其中之一",
  "科技巨头秘密研发了可以储存人类记忆的芯片，主角意外获取了一段不该存在的记忆",
]

interface SellingPoint {
  id: string
  title: string
  coreSelling: string
  marketScore: number
  referenceWorks: string[]
  differentiation: string
}

const MOCK_SELLING_POINTS: SellingPoint[] = [
  {
    id: "1",
    title: "反噬系统觉醒",
    coreSelling: "觉醒能力越强，对宿主的反噬越剧烈，主角在力量与存活之间寻找极限平衡，每次使用能力都是一场生死赌博",
    marketScore: 9.1,
    referenceWorks: ["《我的治愈系游戏》", "《全职高手》", "《庆余年》"],
    differentiation: "高风险成长体系带来天然戏剧张力，每次使用能力都是生死赌博，悬念感极强，读者留存率高。区别于传统无代价升级流，本作强调成长的代价与意义",
  },
  {
    id: "2",
    title: "意识共鸣觉醒者",
    coreSelling: "主角通过意识共鸣系统获得超凡能力，每次觉醒都需要与他人建立深度连接，力量与情感深度绑定",
    marketScore: 8.5,
    referenceWorks: ["《遮天》", "《完美世界》", "《斗破苍穹》"],
    differentiation: "区别于传统孤独强者路线，强调人际连接与力量增长的双向绑定，情感线与成长线深度融合，覆盖女性读者群",
  },
  {
    id: "3",
    title: "星际文明继承者",
    coreSelling: "人类文明的秘密隐藏在星际坐标系中，主角意外激活远古文明遗留的觉醒密钥，背负文明复兴的使命",
    marketScore: 7.2,
    referenceWorks: ["《超维战队》", "《星际文明》", "《银河帝国》"],
    differentiation: "软科幻路线结合觉醒升级体系，世界观宏大但成长体系清晰，适合科幻与爽文双重读者群，市场差异化明显",
  },
]

const MOCK_INTRO = {
  oneLiner: "当觉醒能力强大到足以毁灭星球，一个人类少年必须在力量与生命之间找到答案。",
  fullIntro: `公元2347年，一场遍及全球的"觉醒浪潮"将人类文明彻底改变——少数人开始觉醒出能操控物质、意识乃至时空的超凡能力。

然而，这一切都有代价。

陆晨，一个普通矿区少年，在一次意外中触发了被封印数百年的远古星际密钥，成为整个觉醒史上烈度最高的觉醒者。他的能力近乎无限，但每一次觉醒，都在消耗他自己的生命力。

在政府特工的追捕、神秘组织的招募，以及深藏在意识深处的远古记忆之间，陆晨必须找到一个答案：当力量足以改变世界，他是否还愿意为此付出一切？

这是一个关于极限、牺牲与自我救赎的故事。`,
}

export function IdeaStage({ project, isReadOnly, onConfirm }: IdeaStageProps) {
  const [phase, setPhase] = useState<IdeaPhase>(
    project.completedStages.includes("IDEA") ? "showing-intro" : "input"
  )
  const [ideaInput, setIdeaInput] = useState(
    project.id === "1" ? "一个普通地球人意外激活了古老星际文明留下的觉醒密钥，开启了人类觉醒时代" : ""
  )
  const [feedbackInput, setFeedbackInput] = useState("")
  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    project.completedStages.includes("IDEA") ? "1" : null
  )

  const handleGenerate = () => {
    setPhase("generating-points")
    setTimeout(() => setPhase("showing-points"), 1800)
  }

  const handleGenerateIntro = () => {
    if (!selectedPointId) return
    setPhase("generating-intro")
    setTimeout(() => setPhase("showing-intro"), 1500)
  }

  const handleRegenerate = () => {
    setPhase("generating-points")
    setFeedbackInput("")
    setTimeout(() => setPhase("showing-points"), 1800)
  }

  const handleConfirm = () => {
    setPhase("confirmed")
    onConfirm()
  }

  const selectedPoint = MOCK_SELLING_POINTS.find((p) => p.id === selectedPointId)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-gray-900">灵感提取</h2>
          <p className="text-gray-500 text-sm mt-1">输入一个故事创意，AI 将分析市场可行性并生成差异化卖点方案</p>
        </div>
        {(phase === "showing-intro" || phase === "confirmed") && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
            <Check size={14} />
            已确认
          </span>
        )}
      </div>

      {/* Step 1: Idea Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-gray-800">一句话故事创意</h3>
        <p className="text-gray-500 text-sm">用一句话描述你的故事核心，或从下方示例中获取灵感</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => !isReadOnly && setIdeaInput(prompt)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100 transition-colors text-left"
              disabled={isReadOnly}
            >
              示例 {idx + 1}：{prompt.slice(0, 30)}...
            </button>
          ))}
        </div>
        <textarea
          value={ideaInput}
          onChange={(e) => !isReadOnly && setIdeaInput(e.target.value)}
          placeholder="例如：一个拥有时间停止能力的普通上班族，意外发现自己其实是被人工智能模拟的虚拟存在..."
          className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 bg-gray-50 min-h-[80px] text-gray-700 placeholder:text-gray-400"
          rows={3}
          disabled={isReadOnly}
        />
        {!isReadOnly && phase === "input" && (
          <button
            onClick={handleGenerate}
            disabled={!ideaInput.trim()}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles size={15} />
            开始提取卖点
          </button>
        )}
      </div>

      {/* Step 2: Generating */}
      {phase === "generating-points" && (
        <div className="flex items-center gap-3 p-6 bg-violet-50 border border-violet-200 rounded-xl text-violet-700">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">AI 正在分析市场并生成差异化卖点方案...</span>
        </div>
      )}

      {/* Step 3-5: Selling Points */}
      {(phase === "showing-points" || phase === "generating-intro" || phase === "showing-intro" || phase === "confirmed") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-800">卖点方案（选择一个）</h3>
            {!isReadOnly && phase === "showing-points" && (
              <div className="flex items-center gap-2">
                <input
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="输入反馈意见后重新生成..."
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-56 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw size={13} />
                  重新生成
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MOCK_SELLING_POINTS.map((point) => (
              <SellingPointCard
                key={point.id}
                point={point}
                isSelected={selectedPointId === point.id}
                isReadOnly={isReadOnly || phase !== "showing-points"}
                onSelect={() => setSelectedPointId(point.id)}
              />
            ))}
          </div>

          {!isReadOnly && phase === "showing-points" && (
            <div className="flex justify-end">
              <button
                onClick={handleGenerateIntro}
                disabled={!selectedPointId}
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles size={15} />
                生成简介
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 6: Generating Intro */}
      {phase === "generating-intro" && (
        <div className="flex items-center gap-3 p-6 bg-violet-50 border border-violet-200 rounded-xl text-violet-700">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">AI 正在基于所选卖点方案生成故事简介...</span>
        </div>
      )}

      {/* Step 7: Show Intro */}
      {(phase === "showing-intro" || phase === "confirmed") && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="text-gray-800">生成的故事简介</h3>
          {selectedPoint && (
            <div className="flex items-center gap-2 text-sm text-violet-600 bg-violet-50 border border-violet-200 rounded-md px-3 py-2">
              <Check size={13} />
              基于卖点方案：{selectedPoint.title}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-400 mb-1.5">一句话简介</div>
              <p className="text-gray-800 text-sm bg-gray-50 rounded-lg p-3 leading-relaxed border border-gray-100">
                {MOCK_INTRO.oneLiner}
              </p>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1.5">500字简介</div>
              <p className="text-gray-700 text-sm bg-gray-50 rounded-lg p-4 leading-7 whitespace-pre-line border border-gray-100">
                {MOCK_INTRO.fullIntro}
              </p>
            </div>
          </div>

          {!isReadOnly && phase === "showing-intro" && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                <Check size={15} />
                确认，进入设定集阶段
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SellingPointCard({
  point,
  isSelected,
  isReadOnly,
  onSelect,
}: {
  point: SellingPoint
  isSelected: boolean
  isReadOnly: boolean
  onSelect: () => void
}) {
  const scoreColor =
    point.marketScore >= 9 ? "text-emerald-600 bg-emerald-50" :
    point.marketScore >= 7 ? "text-blue-600 bg-blue-50" :
    "text-amber-600 bg-amber-50"

  return (
    <div
      onClick={() => !isReadOnly && onSelect()}
      className={`relative rounded-xl border-2 p-5 space-y-3 transition-all ${
        isReadOnly
          ? isSelected ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white"
          : isSelected
          ? "border-gray-900 bg-gray-50 cursor-pointer"
          : "border-gray-200 bg-white cursor-pointer hover:border-gray-400"
      }`}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
          <Check size={11} className="text-white" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-gray-900 text-sm pr-6">{point.title}</h4>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded ${scoreColor}`}>
          市场 {point.marketScore}
        </span>
      </div>

      <div className="space-y-2.5 text-sm">
        <div>
          <div className="text-xs text-gray-400 mb-1">核心卖点</div>
          <p className="text-gray-700 leading-relaxed">{point.coreSelling}</p>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">爆款参考作品</div>
          <div className="flex flex-wrap gap-1">
            {point.referenceWorks.map((work) => (
              <span key={work} className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">
                {work}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">差异化分析</div>
          <p className="text-gray-600 leading-relaxed text-xs">{point.differentiation}</p>
        </div>
      </div>
    </div>
  )
}
