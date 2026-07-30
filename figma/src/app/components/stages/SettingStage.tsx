import { useState, useEffect } from "react"
import { Check, RefreshCw, Edit2, Save, X, Loader2, ChevronRight } from "lucide-react"
import type { Project } from "../../data/mockData"

interface SettingStageProps {
  project: Project
  isReadOnly: boolean
  onConfirm: () => void
}

type SettingTab = "世界观" | "角色" | "关系"
type SettingPhase = "generating" | "showing" | "confirmed"

const MOCK_WORLD = {
  时代背景: "公元2347年，\"觉醒浪潮\"席卷全球。在一次神秘的太阳耀斑事件后，约1‰的人类开始觉醒出超凡能力。人类社会因此分裂为普通人、觉醒者与抗拒者三大群体，原有的政治、经济和社会秩序正在经历百年来最深刻的变革。",
  地理环境: "故事主要发生在亚欧大陆的觉醒者聚居区\"新黎明市\"，这是一座专为觉醒者设立的隔离型城市，四周环绕着绵延数百公里的量子屏障，阻断与外部世界的物理连接。城市内部高楼林立，但地下则是废弃的远古文明遗迹。",
  社会结构: "地表：以联盟议会为最高权力机构，议长由人类联合政府任命，负责监管所有觉醒者。\n组织：黎明组织——地下抵抗力量，主张觉醒者的独立自治权，与联盟处于长期对抗状态。\n底层：大量未登记的野生觉醒者，游走于两大势力之间，命运飘摇。",
  力量体系: "觉醒等级分为7层：感知层、操控层、意识层、融合层、星际层、深渊层、源点层。能力类型涵盖物质操控、意识干涉、时空感知三大类。陆晨拥有稀有的\"意识共鸣\"型能力，理论上可达第7层，但反噬烈度也随之呈指数级增长。",
}

const MOCK_CHARACTERS = [
  {
    id: "c1",
    role: "主角",
    name: "陆晨",
    age: "19岁",
    desire: "找到不依赖觉醒能力也能保护他人的方式",
    motivation: "母亲因意外觉醒事故遇难，他不愿重蹈覆辙，同时渴望了解父亲留下的星际密钥之谜",
    ending: "最终以生命为代价封印寄生意识体，因苏媛的共鸣奇迹生还，选择封印自身能力平静生活",
  },
  {
    id: "c2",
    role: "反派",
    name: "联盟议长 魏廷安",
    age: "58岁",
    desire: "控制并规范化所有觉醒者，防止失控的超能力毁灭人类文明",
    motivation: "曾目睹早期觉醒者失控事件造成的城市毁灭，此后走上极端管控路线，不惜以牺牲个体自由为代价",
    ending: "在真相大白后，放弃对陆晨的追杀，转而协助封印行动，以此作为对过去错误的救赎",
  },
  {
    id: "c3",
    role: "女主",
    name: "苏媛",
    age: "18岁",
    desire: "找到自己血统之谜的答案，同时守护陆晨不因自己的存在而加速消亡",
    motivation: "远古文明后裔的身份让她从小被各方势力追杀，她渴望一个可以真正安定下来的归宿",
    ending: "与陆晨建立真正意义上的永久共鸣链接，成为他反噬的永久缓冲者",
  },
  {
    id: "c4",
    role: "重要配角",
    name: "黎明组织首领 宋非凡",
    age: "35岁",
    desire: "建立觉醒者独立邦国，彻底摆脱联盟的监控",
    motivation: "曾被联盟以\"危险觉醒者\"为由强制消除能力，此后转入地下创立黎明组织",
    ending: "在最终决战中战死，成为觉醒者独立运动的精神象征",
  },
]

const MOCK_RELATIONS = {
  冲突关系: [
    { from: "陆晨", to: "联盟议长", type: "主对抗", desc: "陆晨的高烈度觉醒能力是联盟最忌惮的威胁，议长以维护秩序为名多次派兵追杀" },
    { from: "黎明组织", to: "联盟", type: "组织对抗", desc: "长达十年的地下对抗，争夺觉醒者的归属权与话语权" },
    { from: "寄生意识体", to: "全体觉醒者", type: "终极威胁", desc: "隐藏在远古文明残留意识中的寄生体，通过感染觉醒者来汲取能量，是所有反噬失控事件的根源" },
  ],
  情感纽带: [
    { from: "陆晨", to: "苏媛", type: "共鸣羁绊", desc: "意识共鸣技能使两人建立了超越普通感情的神经链接，彼此的情绪与生命力相互影响" },
    { from: "陆晨", to: "宋非凡", type: "亦师亦友", desc: "宋非凡是陆晨进入觉醒世界后的第一个引路人，也是他最初价值观的塑造者" },
    { from: "魏廷安", to: "陆晨", type: "隐秘守护", desc: "魏廷安后期揭示自己曾是陆晨父亲的战友，对陆晨的追杀背后实为引导他自我发现能力边界" },
  ],
}

export function SettingStage({ project, isReadOnly, onConfirm }: SettingStageProps) {
  const [phase, setPhase] = useState<SettingPhase>(
    project.completedStages.includes("SETTING") ? "confirmed" : "generating"
  )
  const [activeTab, setActiveTab] = useState<SettingTab>("世界观")
  const [editingField, setEditingField] = useState<string | null>(null)
  const [worldData, setWorldData] = useState(MOCK_WORLD)
  const [editingValue, setEditingValue] = useState("")

  useEffect(() => {
    if (phase === "generating") {
      const timer = setTimeout(() => setPhase("showing"), 2000)
      return () => clearTimeout(timer)
    }
  }, [phase])

  const handleRefresh = () => {
    setPhase("generating")
    setEditingField(null)
  }

  const handleStartEdit = (field: string, value: string) => {
    setEditingField(field)
    setEditingValue(value)
  }

  const handleSaveEdit = () => {
    if (editingField && editingField.startsWith("world-")) {
      const key = editingField.replace("world-", "") as keyof typeof MOCK_WORLD
      setWorldData((prev) => ({ ...prev, [key]: editingValue }))
    }
    setEditingField(null)
  }

  const handleConfirm = () => {
    setPhase("confirmed")
    onConfirm()
  }

  const tabs: SettingTab[] = ["世界观", "角色", "关系"]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-gray-900">设定集</h2>
          <p className="text-gray-500 text-sm mt-1">构建故事世界观、角色体系和关系网络，作为后续所有阶段的创作基础</p>
        </div>
        {phase === "confirmed" && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
            <Check size={14} />
            已确认
          </span>
        )}
      </div>

      {phase === "generating" ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-xl border border-gray-200">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <div className="text-center">
            <p className="text-gray-700">AI 正在生成设定集</p>
            <p className="text-gray-500 text-sm mt-1">基于你的故事创意构建完整的世界观与角色体系...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm transition-colors ${
                    activeTab === tab
                      ? "bg-gray-50 text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* 世界观 */}
              {activeTab === "世界观" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.entries(worldData) as [keyof typeof MOCK_WORLD, string][]).map(([key, value]) => (
                    <WorldCard
                      key={key}
                      title={key}
                      content={value}
                      isEditing={editingField === `world-${key}`}
                      editingValue={editingValue}
                      isReadOnly={isReadOnly || phase === "confirmed"}
                      onEdit={() => handleStartEdit(`world-${key}`, value)}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditingField(null)}
                      onEditValueChange={setEditingValue}
                    />
                  ))}
                </div>
              )}

              {/* 角色 */}
              {activeTab === "角色" && (
                <div className="space-y-4">
                  {MOCK_CHARACTERS.map((char) => (
                    <CharacterCard
                      key={char.id}
                      character={char}
                      isReadOnly={isReadOnly || phase === "confirmed"}
                    />
                  ))}
                </div>
              )}

              {/* 关系 */}
              {activeTab === "关系" && (
                <div className="space-y-6">
                  <RelationSection title="冲突关系" items={MOCK_RELATIONS.冲突关系} color="rose" />
                  <RelationSection title="情感纽带" items={MOCK_RELATIONS.情感纽带} color="blue" />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isReadOnly && phase !== "confirmed" && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw size={13} />
                  刷新关联内容
                </button>
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-1.5 text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50"
                >
                  <X size={13} />
                  驳回，重新生成
                </button>
              </div>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                <Check size={15} />
                确认设定，进入大纲阶段
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function WorldCard({
  title,
  content,
  isEditing,
  editingValue,
  isReadOnly,
  onEdit,
  onSave,
  onCancel,
  onEditValueChange,
}: {
  title: string
  content: string
  isEditing: boolean
  editingValue: string
  isReadOnly: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onEditValueChange: (v: string) => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        {!isReadOnly && !isEditing && (
          <button onClick={onEdit} className="text-gray-400 hover:text-gray-600">
            <Edit2 size={13} />
          </button>
        )}
        {isEditing && (
          <div className="flex items-center gap-1">
            <button onClick={onSave} className="text-emerald-600 hover:text-emerald-700">
              <Save size={13} />
            </button>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          </div>
        )}
      </div>
      {isEditing ? (
        <textarea
          value={editingValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          className="w-full text-sm text-gray-700 border border-blue-300 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 min-h-[100px]"
          rows={5}
          autoFocus
        />
      ) : (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{content}</p>
      )}
    </div>
  )
}

function CharacterCard({ character, isReadOnly }: { character: (typeof MOCK_CHARACTERS)[0]; isReadOnly: boolean }) {
  const roleColors: Record<string, string> = {
    主角: "bg-violet-100 text-violet-700",
    反派: "bg-red-100 text-red-700",
    女主: "bg-pink-100 text-pink-700",
    重要配角: "bg-amber-100 text-amber-700",
  }

  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm">
            {character.name.slice(0, 1)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-gray-900 text-sm">{character.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[character.role] ?? "bg-gray-100 text-gray-600"}`}>
                {character.role}
              </span>
            </div>
            <span className="text-xs text-gray-400">{character.age}</span>
          </div>
        </div>
        {!isReadOnly && (
          <button className="text-gray-400 hover:text-gray-600">
            <Edit2 size={13} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "欲望", value: character.desire },
          { label: "动机", value: character.motivation },
          { label: "结局", value: character.ending },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-md p-3">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <p className="text-xs text-gray-700 leading-relaxed">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function RelationSection({
  title,
  items,
  color,
}: {
  title: string
  items: { from: string; to: string; type: string; desc: string }[]
  color: "rose" | "blue"
}) {
  const colorMap = {
    rose: { header: "text-rose-700", badge: "bg-rose-100 text-rose-700", line: "border-rose-200" },
    blue: { header: "text-blue-700", badge: "bg-blue-100 text-blue-700", line: "border-blue-200" },
  }
  const c = colorMap[color]

  return (
    <div>
      <h4 className={`text-sm mb-3 ${c.header}`}>{title}</h4>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className={`border ${c.line} rounded-lg p-4 space-y-1.5`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-800">{item.from}</span>
              <span className="text-gray-400 text-xs">-&gt;</span>
              <span className="text-sm text-gray-800">{item.to}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${c.badge}`}>{item.type}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
