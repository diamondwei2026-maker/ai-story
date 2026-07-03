import { useState } from "react";
import {
  ChevronRight,
  Plus,
  BookOpen,
  Clock,
  FileText,
  X,
  MoreHorizontal,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { Project, ProjectStatus } from "../data/mockData";
import { STAGE_LABELS, STAGE_COLORS, STAGE_ORDER } from "../data/mockData";

type FilterTab = "全部" | "创作中" | "已完本" | "已归档";

interface ProjectCenterProps {
  projects: Project[];
  onOpenProject: (id: string) => void;
  onCreateProject: (title: string, genre: string) => void;
  onDeleteProject: (id: string) => void;
}

export function ProjectCenter({
  projects,
  onOpenProject,
  onCreateProject,
  onDeleteProject,
}: ProjectCenterProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("全部");
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) => {
    if (activeFilter === "全部") return true;
    if (activeFilter === "创作中")
      return !["已完本", "已归档"].includes(p.status);
    return p.status === activeFilter;
  });

  const tabCount = (tab: FilterTab) => {
    if (tab === "全部") return projects.length;
    if (tab === "创作中")
      return projects.filter((p) => !["已完本", "已归档"].includes(p.status))
        .length;
    return projects.filter((p) => p.status === tab).length;
  };

  const formatWordCount = (count: number) => {
    if (count === 0) return "尚未写作";
    if (count >= 10000) return `${(count / 10000).toFixed(1)} 万字`;
    return `${count} 字`;
  };

  const getActionLabel = (status: ProjectStatus) => {
    if (status === "已完本") return "浏览作品";
    if (status === "已归档") return "查看详情";
    return "继续创作";
  };

  const deleteTarget = projects.find((p) => p.id === deleteTargetId) ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      {showNewModal && (
        <NewProjectModal
          onConfirm={(title, genre) => {
            setShowNewModal(false);
            onCreateProject(title, genre);
          }}
          onCancel={() => setShowNewModal(false)}
        />
      )}

      {deleteTargetId && deleteTarget && (
        <DeleteConfirmModal
          projectTitle={deleteTarget.title}
          onConfirm={() => {
            onDeleteProject(deleteTargetId);
            setDeleteTargetId(null);
          }}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-gray-900">AI 小说创作平台</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              全流程 AI 辅助创作，从灵感到完本
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            <Plus size={15} />
            新建项目
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-0 mb-6 border-b border-gray-200">
          {(["全部", "创作中", "已完本", "已归档"] as FilterTab[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                  activeFilter === tab
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
                <span className="ml-1.5 text-xs text-gray-400">
                  {tabCount(tab)}
                </span>
              </button>
            ),
          )}
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p>暂无项目</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                actionLabel={getActionLabel(project.status)}
                formatWordCount={formatWordCount}
                onClick={() => onOpenProject(project.id)}
                onDeleteRequest={() => setDeleteTargetId(project.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({
  project,
  actionLabel,
  formatWordCount,
  onClick,
  onDeleteRequest,
}: {
  project: Project;
  actionLabel: string;
  formatWordCount: (n: number) => string;
  onClick: () => void;
  onDeleteRequest: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const isArchived = project.status === "已归档";

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow ${isArchived ? "opacity-60" : "cursor-pointer"}`}
      onClick={isArchived ? undefined : onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 truncate">{project.title}</h3>
          {project.description ? (
            <p className="text-gray-500 text-sm mt-1 line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          ) : (
            <p className="text-gray-400 text-sm mt-1 italic">暂无简介</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-xs px-2 py-1 rounded-md border ${STAGE_COLORS[project.status]}`}
          >
            {STAGE_LABELS[project.status]}
          </span>

          {/* More menu */}
          <div className="relative">
            {showMenu && (
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className={`p-1 rounded-md transition-colors ${showMenu ? "bg-gray-100 text-gray-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
            >
              <MoreHorizontal size={15} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-36 py-1 overflow-hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDeleteRequest();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                  删除项目
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <BookOpen size={12} />
          {project.genre}
        </span>
        <span className="flex items-center gap-1">
          <FileText size={12} />
          {formatWordCount(project.wordCount)}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Clock size={12} />
          {project.lastModified}
        </span>
      </div>

      {project.status !== "已归档" && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            {STAGE_ORDER.map((stage) => {
              const isCompleted = project.completedStages.includes(stage);
              const isCurrent =
                project.currentStage === stage && project.status !== "已完本";
              const isDone = project.status === "已完本";
              return (
                <div key={stage} className="flex items-center flex-1 gap-1">
                  <div
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      isCompleted || isDone
                        ? "bg-gray-800"
                        : isCurrent
                          ? "bg-gray-400"
                          : "bg-gray-200"
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>灵感</span>
            <span>设定</span>
            <span>大纲</span>
            <span>细纲</span>
            <span>正文</span>
          </div>
        </div>
      )}

      <button
        className={`flex items-center justify-center gap-1.5 w-full py-2 border rounded-lg text-sm transition-colors ${
          isArchived
            ? "border-gray-200 text-gray-400 cursor-not-allowed"
            : "border-gray-200 text-gray-700 hover:bg-gray-50"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isArchived) onClick();
        }}
      >
        {actionLabel}
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function DeleteConfirmModal({
  projectTitle,
  onConfirm,
  onCancel,
}: {
  projectTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 w-full max-w-sm mx-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={17} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-gray-900">删除项目</h3>
            <p className="text-gray-500 text-sm mt-1 leading-relaxed">
              确认要删除《{projectTitle}》吗？删除后无法恢复，包括所有创作内容。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            className="text-sm text-gray-600 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

function NewProjectModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (title: string, genre: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");

  const GENRE_OPTIONS = [
    "科幻",
    "玄幻",
    "仙侠",
    "都市",
    "古风",
    "悬疑",
    "末日",
    "历史",
    "军事",
    "其他",
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 w-full max-w-md mx-4 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-gray-900">新建项目</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-700 block mb-1.5">
              项目名称
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：星际觉醒、长安迷局..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-gray-50"
              autoFocus
              maxLength={30}
            />
            <div className="text-right text-xs text-gray-400 mt-1">
              {title.length}/30
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-700 block mb-1.5">
              题材类型（选填）
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {GENRE_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(genre === g ? "" : g)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    genre === g
                      ? "bg-gray-900 text-white border-gray-900"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="或手动输入题材..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-gray-50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            className="text-sm text-gray-600 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(title.trim(), genre.trim())}
            disabled={!title.trim()}
            className="text-sm bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            创建并开始
          </button>
        </div>
      </div>
    </div>
  );
}
