# 细纲拆解—章节调整功能方案

## Context

PRD 3.4 节规定了细纲阶段的 9 个步骤，当前实现覆盖了步骤 1-4 和 7、9，缺少：
- **步骤 5**：调整章节（字数调整、AI 调整单章、AI 批量调整）
- **步骤 6**：章节结构（标记高潮章节）
- **步骤 8**：预览影响（调整后显示受影响章节和警告信息）

---

## 缺失功能及设计方案

### 1. 调整字数（步骤 5）
每个 Beat 卡片展开时，字数字段改为可 inline 编辑的数字输入框。用户直接修改后失焦触发"预览影响"逻辑（步骤 8）。

### 2. AI 调整单章（步骤 5）
每个 Beat 卡片头部增加 "AI 调整" 按钮。点击弹出一个小输入弹层（popover 风格，无需全屏 modal），用户输入调整意图（如"节奏改快一点"），确认后模拟 AI 重新生成该章 beat 内容（1.2s loading → 更新该卡片内容）。

### 3. AI 批量调整（步骤 5）
在 Beat 卡片列表区域上方增加"批量调整"按钮。点击进入"多选模式"：每个卡片出现勾选框，选择若干章节后，显示底部操作栏，输入统一调整指令（如"将选中章节字数统一改为 4000"），确认后批量更新。

### 4. 标记高潮章节（步骤 6）
Beat 卡片头部目前只展示高潮标签，改为可点击 toggle：非高潮章节显示"标记高潮"按钮，高潮章节显示"取消高潮"按钮，切换后实时更新节奏分析面板的高潮计数。

### 5. 预览影响（步骤 8）
字数调整或 AI 调整单章触发后，在该卡片下方展开一个"影响范围"折叠区：
- 列出与该章存在钩子因果关系的章节（从 hookInfo 字段中解析回收章节编号）
- 显示黄色警告提示（PRD："显示受影响章节和警告信息"）
- 提供"确认调整"和"撤销"两个操作

---

## 改动范围（仅 1 个文件）

`src/app/components/stages/BeatsStage.tsx`

**状态新增：**
- `beats: Beat[]` — 将 MOCK_BEATS 从常量改为 useState，支持修改
- `selectMode: boolean` — 是否处于多选模式
- `selectedIds: Set<string>` — 批量选中的章节 id
- `adjustingId: string | null` — 当前正在 AI 调整的章节 id
- `adjustInput: string` — AI 调整的输入内容
- `showAdjustPopover: string | null` — 显示调整输入框的章节 id
- `impactChapterId: string | null` — 当前展示影响范围的章节 id

**Beat 卡片改动（BeatCard 子组件）：**
- 头部增加：高潮 toggle 按钮（标记/取消高潮）、AI 调整按钮
- 展开区字数字段 → 可编辑输入框
- 字数/AI 调整确认后，卡片下方展示影响范围面板

**列表区头部：**
- 增加"批量调整"按钮，点击切换 selectMode
- selectMode 下底部出现固定操作栏（选中数量 + 调整输入 + 确认/取消）

---

## 验证

- 修改某章字数 → 影响范围面板出现，列出关联章节
- 点击"AI 调整"→ 输入框弹出 → 确认 → loading → 卡片内容更新
- 进入批量模式 → 勾选多章 → 输入指令 → 确认 → 多章字数/内容批量更新
- 标记高潮 → 节奏面板的高潮计数实时更新

---

# 新建项目功能方案（已完成）

## Context

点击「新建项目」按钮目前没有任何反应，因为 ProjectCenter 里的按钮没有绑定 onClick，也没有向 App.tsx 传递创建逻辑。需要补全这段交互流程。

## 方案

**交互流程（基于 PRD 2.2 项目管理系统）：**

1. 点击「新建项目」→ 弹出模态框，用户填写：项目名称（必填）、题材/类型（选填）
2. 点击确认 → 创建新项目，**直接进入工作区**，并定位到「灵感提取」阶段
3. 新项目状态为 `IDEA`，`completedStages: []`

**为什么是模态框而非直接跳转：** 项目名称是项目列表卡片的核心展示信息，不填就创建会留下无名项目，且模态框是最轻量的采集方式，无需引入新页面。

---

## 改动范围（3 处）

### 1. `src/app/App.tsx`
- 新增 `createProject(title: string, genre: string)` 函数：生成新 Project 对象（随机 id、初始状态 IDEA）并 push 到 `projects` state
- 将该函数作为 `onCreateProject` prop 传给 `ProjectCenter`

### 2. `src/app/components/ProjectCenter.tsx`
- 新增 `onCreateProject: (title: string, genre: string) => void` prop
- 新增 `NewProjectModal` 内联组件（模态框）：
  - 项目名称输入框（必填）
  - 题材输入框（选填，placeholder 提示如：科幻、古风、都市…）
  - 取消 / 确认创建 两个按钮
  - 确认后调用 `onCreateProject` 并关闭模态框
- 「新建项目」按钮绑定 `onClick={() => setShowModal(true)}`

### 3. `src/app/App.tsx`（续）
- `createProject` 调用完成后，立即调用 `openProject(newId)` 跳转到工作区的 IDEA 阶段

---

## 验证

- 点击「新建项目」→ 模态框弹出
- 不填名称时「确认」按钮不可点击
- 填写名称后确认 → 关闭模态框，跳转到该项目工作区，顶部 pipeline 停在「灵感提取」
- 返回项目中心 → 新项目出现在列表，状态标签为「灵感提取」
