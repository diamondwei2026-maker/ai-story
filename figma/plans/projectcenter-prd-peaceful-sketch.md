# 新建项目时跳过灵感阶段

## Context（背景）

小说创作应用有五个线性创作阶段：灵感提取（IDEA）→ 设定集（SETTING）→ 剧情大纲（OUTLINE）→ 细纲拆解（BEATS）→ 正文迭代（DRAFTING）。目前所有新建项目都强制从 IDEA 阶段开始，由 AI 提取卖点、生成简介。

对于**已经有成熟创意和简介**的作者来说，走一遍 AI 提取流程是多余的。因此需要在新建项目时提供"我已有灵感/简介，跳过此阶段"的选项，让用户直接粘贴自己的简介，创建后从"设定集"阶段开始。

注意：应用中"简介"并非独立阶段，而是 IDEA 阶段内部生成的产物。所以"跳过灵感和简介"= 跳过整个 IDEA 阶段。

## 决策（已与用户确认）

1. **入口位置**：新建项目模态框（`NewProjectModal`）内。
2. **简介**：勾选跳过后，简介输入框**必填**，内容存入 `project.description`，用于卡片展示和后续阶段引用。

## 实现方案

### 1. `src/app/components/ProjectCenter.tsx` — 改造 `NewProjectModal`

- 在题材字段下方新增一个勾选项（checkbox / toggle）：**"我已有灵感与简介，跳过灵感提取阶段"**，state 用 `const [skipIdea, setSkipIdea] = useState(false)`。
- 当 `skipIdea` 为 `true` 时，展开一个必填的简介 `<textarea>`（state：`description`），复用现有输入框样式（参考第 335-339 行 input 的 className 风格，textarea 参考 IdeaStage.tsx 第 135-142 行样式）。给出占位提示，如"粘贴你已有的故事简介，AI 将基于它继续设定集创作..."。
- 确认按钮 `disabled` 逻辑更新：`!title.trim() || (skipIdea && !description.trim())`。
- 按钮文案可随状态变化："创建并开始" → 跳过时可保持不变或改为"创建并进入设定集"（可选）。
- 更新 `onConfirm` 调用，向上传递 `skipIdea` 与 `description`。

### 2. `ProjectCenterProps` 与调用链的签名变更

当前签名：`onCreateProject: (title: string, genre: string) => void`（第 11 行）。

改为使用一个 options 对象，避免参数膨胀：

```ts
onCreateProject: (input: {
  title: string
  genre: string
  skipIdea: boolean
  description?: string
}) => void
```

相应更新：
- `ProjectCenterProps` 接口（第 8-13 行）
- `ProjectCenter` 中 `NewProjectModal` 的 `onConfirm` 回调（第 50-53 行）
- `NewProjectModal` 的 props 类型（第 306-308 行）与调用（第 378 行）

### 3. `src/app/App.tsx` — 改造 `createProject`（第 43-57 行）

改为接收 options 对象，根据 `skipIdea` 决定初始阶段：

```ts
const createProject = ({ title, genre, skipIdea, description }: {...}) => {
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
```

`openProject` 后 `WorkspaceLayout` 会依据 `currentStage`（=SETTING）自动定位到设定集阶段（见 `WorkspaceLayout.tsx` 第 18-22 行 `viewingStage` 初始化），无需额外改动。

### 4. （可选打磨）`src/app/components/stages/IdeaStage.tsx`

跳过项目在工作区把 IDEA 当作"已完成"阶段查看（只读）时，当前会展示 MOCK 的卖点/简介数据（第 55-66、69-78 行），与用户真实简介不一致。

可选改进：当 `project.description` 存在且是跳过创建的项目时，只读视图展示 `project.description` 而非 `MOCK_INTRO`。此项不影响主流程，若时间有限可留待后续。

## 关键文件

- `src/app/components/ProjectCenter.tsx` — 模态框 UI、勾选项、必填校验、签名
- `src/app/App.tsx` — `createProject` 初始阶段逻辑
- `src/app/data/mockData.ts` — 仅参考（`Project` 结构已含 `description?`、`completedStages`，无需改动）
- `src/app/components/stages/IdeaStage.tsx` — 可选打磨

## 验证方式

1. 应用已在运行（Vite dev server），通过预览界面操作，勿手动启动。
2. 点击"新建项目"，**不勾选**跳过：验证行为与现在一致，创建后进入灵感提取阶段。
3. 勾选"我已有灵感与简介"：
   - 验证出现必填简介框；简介为空时"创建"按钮禁用。
   - 填写标题 + 简介后创建，验证**直接进入设定集（SETTING）阶段**。
   - 返回项目中心，验证该项目卡片：阶段标签为"设定集"、进度条第一段（灵感）已完成、卡片显示填写的简介文本。
4. 在工作区阶段导航中点击已完成的"灵感提取"，验证以只读模式打开（若做了第 4 步打磨，验证显示的是用户简介）。
