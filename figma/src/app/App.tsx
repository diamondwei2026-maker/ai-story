import { useState } from "react"
import { ProjectCenter } from "./components/ProjectCenter"
import { WorkspaceLayout } from "./components/WorkspaceLayout"
import { mockProjects } from "./data/mockData"
import type { Project, StageKey } from "./data/mockData"

type AppView = "center" | "workspace"

type CreateProjectInput = {
  title: string
  genre: string
  skipIdea: boolean
  description?: string
}

export default function App() {
  const [view, setView] = useState<AppView>("center")
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null

  const openProject = (id: string) => {
    setActiveProjectId(id)
    setView("workspace")
  }

  const backToCenter = () => {
    setView("center")
    setActiveProjectId(null)
  }

  const advanceStage = (projectId: string, newStage: StageKey) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p
        const newCompleted = [...new Set([...p.completedStages, p.currentStage])]
        const isLastStage = p.currentStage === "DRAFTING"
        return {
          ...p,
          currentStage: newStage,
          status: isLastStage ? "已完本" : newStage,
          completedStages: newCompleted,
          lastModified: new Date().toISOString().split("T")[0],
        }
      })
    )
  }

  const createProject = ({ title, genre, skipIdea, description }: CreateProjectInput) => {
    const newId = `proj-${Date.now()}`
    const newProject: Project = {
      id: newId,
      title,
      status: skipIdea ? "SETTING" : "IDEA",
      currentStage: skipIdea ? "SETTING" : "IDEA",
      lastModified: new Date().toISOString().split("T")[0],
      genre: genre || "未分类",
      wordCount: 0,
      completedStages: skipIdea ? ["IDEA"] : [],
      description: skipIdea ? description : undefined,
    }
    setProjects((prev) => [newProject, ...prev])
    openProject(newId)
  }

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  if (view === "workspace" && activeProject) {
    return (
      <>
        {/* MARKER-MAKE-KIT-INVOKED */}
        <WorkspaceLayout
          project={activeProject}
          onBack={backToCenter}
          onAdvanceStage={(newStage) => advanceStage(activeProject.id, newStage)}
        />
      </>
    )
  }

  return (
    <>
      {/* MARKER-MAKE-KIT-INVOKED */}
      <ProjectCenter
        projects={projects}
        onOpenProject={openProject}
        onCreateProject={createProject}
        onDeleteProject={deleteProject}
      />
    </>
  )
}
