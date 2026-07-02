export type StageKey = "IDEA" | "SETTING" | "OUTLINE" | "BEATS" | "DRAFTING"
export type ProjectStatus = StageKey | "已完本" | "已归档"

export interface Project {
  id: string
  title: string
  status: ProjectStatus
  currentStage: StageKey
  lastModified: string
  genre: string
  wordCount: number
  completedStages: StageKey[]
  description?: string
}

export const STAGE_ORDER: StageKey[] = ["IDEA", "SETTING", "OUTLINE", "BEATS", "DRAFTING"]

export const STAGE_LABELS: Record<string, string> = {
  IDEA: "灵感提取",
  SETTING: "设定集",
  OUTLINE: "剧情大纲",
  BEATS: "细纲拆解",
  DRAFTING: "正文迭代",
  已完本: "已完本",
  已归档: "已归档",
}

export const STAGE_COLORS: Record<string, string> = {
  IDEA: "bg-violet-100 text-violet-700 border-violet-200",
  SETTING: "bg-blue-100 text-blue-700 border-blue-200",
  OUTLINE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  BEATS: "bg-amber-100 text-amber-700 border-amber-200",
  DRAFTING: "bg-rose-100 text-rose-700 border-rose-200",
  已完本: "bg-gray-100 text-gray-600 border-gray-200",
  已归档: "bg-gray-100 text-gray-400 border-gray-200",
}

export const mockProjects: Project[] = [
  {
    id: "1",
    title: "星际觉醒",
    status: "DRAFTING",
    currentStage: "DRAFTING",
    lastModified: "2026-06-28",
    genre: "科幻",
    wordCount: 87420,
    completedStages: ["IDEA", "SETTING", "OUTLINE", "BEATS"],
    description: "当觉醒能力强大到足以毁灭星球，一个人类少年必须在力量与生命之间找到答案",
  },
  {
    id: "2",
    title: "长安迷局",
    status: "OUTLINE",
    currentStage: "OUTLINE",
    lastModified: "2026-06-27",
    genre: "古风悬疑",
    wordCount: 0,
    completedStages: ["IDEA", "SETTING"],
    description: "盛唐长安，一场跨越三十年的迷局，牵扯出皇权、江湖与命运的三重交织",
  },
  {
    id: "3",
    title: "末日玫瑰",
    status: "IDEA",
    currentStage: "IDEA",
    lastModified: "2026-06-25",
    genre: "末日求生",
    wordCount: 0,
    completedStages: [],
  },
  {
    id: "4",
    title: "修仙问道录",
    status: "已完本",
    currentStage: "DRAFTING",
    lastModified: "2026-06-10",
    genre: "仙侠",
    wordCount: 342600,
    completedStages: ["IDEA", "SETTING", "OUTLINE", "BEATS"],
    description: "从凡人到仙尊，一部关于道心与人心的漫长旅程",
  },
  {
    id: "5",
    title: "都市龙王",
    status: "已归档",
    currentStage: "BEATS",
    lastModified: "2026-05-20",
    genre: "都市",
    wordCount: 45200,
    completedStages: ["IDEA", "SETTING", "OUTLINE"],
  },
]
