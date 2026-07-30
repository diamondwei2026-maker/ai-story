import { useState, useEffect } from "react"
import { ArrowLeft, Check, Lock, Cpu } from "lucide-react"
import type { Project, StageKey } from "../data/mockData"
import { STAGE_ORDER, STAGE_LABELS } from "../data/mockData"
import { IdeaStage } from "./stages/IdeaStage"
import { SettingStage } from "./stages/SettingStage"
import { OutlineStage } from "./stages/OutlineStage"
import { BeatsStage } from "./stages/BeatsStage"
import { DraftingStage } from "./stages/DraftingStage"

interface WorkspaceLayoutProps {
  project: Project
  onBack: () => void
  onAdvanceStage: (newStage: StageKey) => void
}

export function WorkspaceLayout({ project, onBack, onAdvanceStage }: WorkspaceLayoutProps) {
  const [viewingStage, setViewingStage] = useState<StageKey>(project.currentStage)

  useEffect(() => {
    setViewingStage(project.currentStage)
  }, [project.currentStage])

  const currentIdx = STAGE_ORDER.indexOf(project.currentStage)
  const viewingIdx = STAGE_ORDER.indexOf(viewingStage)

  const getStageState = (stage: StageKey): "completed" | "current" | "locked" => {
    const idx = STAGE_ORDER.indexOf(stage)
    if (project.status === "已完本") return "completed"
    if (idx < currentIdx) return "completed"
    if (idx === currentIdx) return "current"
    return "locked"
  }

  const handleAdvance = () => {
    const nextIdx = currentIdx + 1
    if (nextIdx < STAGE_ORDER.length) {
      onAdvanceStage(STAGE_ORDER[nextIdx])
    }
  }

  const renderStage = () => {
    const isReadOnly = getStageState(viewingStage) === "completed" && project.status !== "已完本" && viewingStage !== project.currentStage

    switch (viewingStage) {
      case "IDEA":
        return <IdeaStage project={project} isReadOnly={isReadOnly} onConfirm={handleAdvance} />
      case "SETTING":
        return <SettingStage project={project} isReadOnly={isReadOnly} onConfirm={handleAdvance} />
      case "OUTLINE":
        return <OutlineStage project={project} isReadOnly={isReadOnly} onConfirm={handleAdvance} />
      case "BEATS":
        return <BeatsStage project={project} isReadOnly={isReadOnly} onConfirm={handleAdvance} />
      case "DRAFTING":
        return <DraftingStage project={project} isReadOnly={isReadOnly} onConfirm={handleAdvance} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
            返回项目
          </button>

          <div className="w-px h-5 bg-gray-200 shrink-0" />

          <span className="text-gray-900 truncate shrink-0 max-w-[120px]">{project.title}</span>

          <div className="flex-1 flex items-center justify-center">
            <StagePipeline
              stages={STAGE_ORDER}
              viewingStage={viewingStage}
              getStageState={getStageState}
              onClickStage={(stage) => {
                if (getStageState(stage) !== "locked") setViewingStage(stage)
              }}
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
            <Cpu size={13} />
            <span>claude-sonnet-4-6</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {viewingStage !== project.currentStage && getStageState(viewingStage) === "completed" && (
          <div className="max-w-5xl mx-auto px-6 pt-4">
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
              <span>正在浏览已完成阶段（只读）</span>
              <button
                onClick={() => setViewingStage(project.currentStage)}
                className="text-amber-800 underline underline-offset-2 hover:no-underline"
              >
                返回当前阶段
              </button>
            </div>
          </div>
        )}
        {renderStage()}
      </main>
    </div>
  )
}

function StagePipeline({
  stages,
  viewingStage,
  getStageState,
  onClickStage,
}: {
  stages: StageKey[]
  viewingStage: StageKey
  getStageState: (s: StageKey) => "completed" | "current" | "locked"
  onClickStage: (s: StageKey) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, idx) => {
        const state = getStageState(stage)
        const isViewing = viewingStage === stage
        const isLocked = state === "locked"

        return (
          <div key={stage} className="flex items-center">
            <button
              onClick={() => onClickStage(stage)}
              disabled={isLocked}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                isLocked
                  ? "text-gray-300 cursor-not-allowed"
                  : isViewing
                  ? "bg-gray-900 text-white"
                  : state === "completed"
                  ? "text-gray-500 hover:bg-gray-100"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {state === "completed" ? (
                <Check size={11} />
              ) : isLocked ? (
                <Lock size={11} />
              ) : (
                <span className={`w-3.5 h-3.5 rounded-full text-[10px] flex items-center justify-center ${isViewing ? "bg-white text-gray-900" : "bg-gray-200 text-gray-600"}`}>
                  {idx + 1}
                </span>
              )}
              <span>{STAGE_LABELS[stage]}</span>
            </button>
            {idx < stages.length - 1 && (
              <div className="w-4 flex items-center justify-center">
                <div className="w-3 h-px bg-gray-300" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
