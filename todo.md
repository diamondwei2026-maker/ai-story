# 前端代码重构待办清单

> 基于「设计需求文档页面」Figma 原型 + 产品需求文档(PRD) + 前端技术文档 + 服务端技术文档
>
> **技术栈**：Vue 3 + TypeScript + Vite + Pinia + Ant Design Vue（维持不变）
>
> **策略**：UI 以 Figma 原型为准，逻辑层复用现有 Store/Composable/API

---

## P0 — 必须完成（核心功能对齐 PRD）

### 1. ProjectHubView（项目中心）重构
- [ ] 顶部 Header：左侧标题+副标题，右侧新建按钮
- [ ] 筛选 Tab：全部 / 创作中 / 已完本 / 已归档（带计数）
- [ ] 项目卡片重设计：
  - [ ] 标题 + 简介（两行截断）
  - [ ] 状态 Tag（颜色区分 IDEA/SETTING/OUTLINE/BEATS/DRAFTING/已完本/已归档）
  - [ ] 类型 + 字数 + 更新日期
  - [ ] 五阶段进度条（灵感→设定→大纲→细纲→正文）
  - [ ] 操作按钮（继续创作 / 浏览作品 / 查看详情）
- [ ] 新建项目弹窗：
  - [ ] 项目名称输入（带字符计数 0/30）
  - [ ] 题材类型芯片选择器（科幻/玄幻/仙侠/都市/古风/悬疑/末日/历史/军事/其他）
  - [ ] 手动输入题材
- [ ] 空状态展示
- **参考原型**：[ProjectCenter.tsx](设计需求文档页面/src/app/components/ProjectCenter.tsx)

### 2. 全局 WorkflowStepper（阶段导航管）重写
- [ ] 替换 Ant Design Steps 为行内 Pipeline 样式
- [ ] 已完成阶段 → Check 图标
- [ ] 未解锁阶段 → Lock 图标（灰色不可点击）
- [ ] 当前阶段 → 深色高亮 + 数字圆圈
- [ ] 阶段间连接线
- [ ] 只读浏览已完成阶段时显示「返回当前阶段」提示横幅
- **参考原型**：[WorkspaceLayout.tsx:113-167](设计需求文档页面/src/app/components/WorkspaceLayout.tsx)

### 3. DraftingView（正文迭代）重构
- [ ] 三栏布局：侧边章节列表 + 内容区（编辑器/审核面板）+ 状态栏
- [ ] 章节列表侧边栏：
  - [ ] 进度条（已完成/总章节数）
  - [ ] 每章：序号圆圈 + 标题 + 状态标签 + 字数
  - [ ] 状态颜色区分（待生成/生成中/草稿/待审核/已完成/争议）
  - [ ] 完本按钮（全部完成后显示）
- [ ] 编辑器顶部工具栏：
  - [ ] 返回列表 + 章标题 + 状态
  - [ ] 重新生成下拉菜单（新建续写/段落改写/文笔升级 + 模式说明）
  - [ ] 提交审核按钮（草稿状态）
  - [ ] 查看审核结果按钮（待审核状态）
- [ ] 生成/审核中 Loading 状态
- [ ] 未生成章节空状态（「生成正文」按钮）
- [ ] 编辑器 Textarea（全高，等宽字体）
- [ ] 审核面板：
  - [ ] 结论横幅（PASS/PASS_WITH_SUGGESTIONS/NEEDS_REVISION/BLOCKED 四色）
  - [ ] 四维度评分（政治安全/色情尺度/暴力渲染/价值观）+ 分数徽章 + 进度条 + 建议文字
  - [ ] PASS → 确认完成按钮
  - [ ] PASS_WITH_SUGGESTIONS/NEEDS_REVISION → 忽略确认 / 修改后重新审核 / 上诉 / 标记争议
  - [ ] BLOCKED → 返回修改 / 上诉 / 标记争议
  - [ ] 上诉输入框（每章仅一次）
- **参考原型**：[DraftingStage.tsx](设计需求文档页面/src/app/components/stages/DraftingStage.tsx)

### 4. IdeaView（灵感提取）重构
- [ ] 阶段标题 + 描述副标题
- [ ] 创意输入区：
  - [ ] Textarea + 3 个示例提示按钮（点击填入）
  - [ ] 「开始提取卖点」按钮
- [ ] 生成中 Loading 动画
- [ ] 卖点方案选择：
  - [ ] 3 列卡片网格
  - [ ] 每张卡片：标题 + 市场评分徽章（颜色按分数分级）+ 核心卖点 + 爆款参考作品 Tag + 差异化分析
  - [ ] 选中态（边框加深 + 右上角 Check 圆圈）
  - [ ] 反馈输入框 + 重新生成按钮
  - [ ] 「生成简介」按钮（需先选择卖点）
- [ ] 简介展示：
  - [ ] 所选卖点提示
  - [ ] 一句话简介
  - [ ] 500字简介
  - [ ] 「确认，进入设定集阶段」按钮
- [ ] 已确认状态
- **参考原型**：[IdeaStage.tsx](设计需求文档页面/src/app/components/stages/IdeaStage.tsx)

---

## P1 — 重要（提升用户体验）

### 5. SettingView（设定集）重构
- [ ] 阶段标题 + 描述副标题
- [ ] 页面加载后自动触发生成（Loader 动画 2s）
- [ ] 三 Tab 布局（世界观 / 角色 / 关系）
- [ ] 世界观 Tab：
  - [ ] 2 列网格，4 维度卡片（时代背景/地理环境/社会结构/力量体系）
  - [ ] 每个卡片支持内联编辑（Edit → Save/Cancel 图标切换）
- [ ] 角色 Tab：
  - [ ] 角色卡片：头像首字母圆圈 + 名称 + 角色标签（主角反派女主配角颜色区分）+ 年龄
  - [ ] 三栏：欲望 / 动机 / 结局
  - [ ] 编辑按钮
- [ ] 关系 Tab：
  - [ ] 冲突关系分区（rose 色系）：from → to + 关系类型 Badge + 描述
  - [ ] 情感纽带分区（blue 色系）：from → to + 关系类型 Badge + 描述
- [ ] 操作按钮：
  - [ ] 刷新关联内容
  - [ ] 驳回，重新生成
  - [ ] 确认设定，进入大纲阶段
- [ ] 已确认状态（只读）
- **参考原型**：[SettingStage.tsx](设计需求文档页面/src/app/components/stages/SettingStage.tsx)

### 6. OutlineView（剧情大纲）重构
- [ ] 阶段标题 + 描述副标题
- [ ] 叙事结构选择器：
  - [ ] 下拉菜单（网文十段/三幕剧/英雄之旅/起承转合）+ 描述文字
  - [ ] 「生成大纲」按钮
  - [ ] 切换结构确认弹窗（AlertTriangle + 说明 + 取消/确认切换）
- [ ] 生成中 Loading 动画
- [ ] 大纲卡片（按幕分组）：
  - [ ] 颜色分组（violet/blue/emerald/amber 四色）
  - [ ] 每段卡片：段标题 + 高潮标记 + 章节范围 + 摘要 + 关键事件 Tag
- [ ] 可折叠分析面板：
  - [ ] 节奏分析（蓝色卡）
  - [ ] 冲突分布（绿色卡）
  - [ ] 高潮点检测（紫色卡）
  - [ ] 节奏预警（琥珀色卡 + AlertTriangle 图标）
- [ ] 操作按钮：
  - [ ] 驳回并重新生成
  - [ ] 确认大纲，进入细纲阶段
- [ ] 已确认状态（只读）
- **参考原型**：[OutlineStage.tsx](设计需求文档页面/src/app/components/stages/OutlineStage.tsx)

### 7. BeatsView（细纲拆解）重构
- [ ] 阶段标题 + 描述副标题
- [ ] 配置面板：
  - [ ] 目标章节数输入
  - [ ] 默认每章字数输入
  - [ ] 「开始拆解」按钮
  - [ ] 总章节数 + 预估总字数统计
- [ ] 生成中 Loading 动画
- [ ] 可折叠节奏分析面板：
  - [ ] 冲突强度柱状图（高潮红色/高冲突琥珀/普通蓝色）
  - [ ] 评分卡片（整体节奏评分/平均冲突强度/高潮章节数）
  - [ ] 预警信息（冲突强度骤降提醒）
- [ ] Beat 卡片列表：
  - [ ] 每张卡片：章节序号圆圈 + 高潮/节奏标签 + 冲突强度圆点 + 叙事摘要 + 字数
  - [ ] 展开态：叙事摘要详情 + 核心冲突 + 字数编辑 + 钩子因果链
  - [ ] 高潮标记切换按钮（Star/StarOff）
  - [ ] AI 单章调整弹窗（输入指令 → 确认调整）
- [ ] 批量调整模式：
  - [ ] 批量选择复选框
  - [ ] 底部固定工具栏：已选 N 章 + 指令输入 + AI 批量调整按钮 + 取消
- [ ] 影响预览横幅：
  - [ ] 调整后显示受影响章节列表
  - [ ] 已知晓确认 / 撤销修改 按钮
- [ ] 「确认细纲，进入正文阶段」按钮
- [ ] 已确认状态（只读）
- **参考原型**：[BeatsStage.tsx](设计需求文档页面/src/app/components/stages/BeatsStage.tsx)

---

## P2 — 优化（锦上添花）

### 8. 全局 Layout 风格统一
- [ ] Header 重设计：
  - [ ] 深色背景
  - [ ] 左侧：返回按钮 + 项目名称
  - [ ] 中央：Pipeline Stepper
  - [ ] 右侧：AI 模型名称徽章（Cpu 图标 + 模型名）
- [ ] 全局背景色统一为 gray-50
- [ ] 内容区卡片统一白色圆角 border
- [ ] 按钮风格统一：主操作深灰/黑色 bg，次要操作 border 描边
- [ ] 阶段标题统一：h2 + 灰色副标题描述
- [ ] 已确认状态统一：绿色 Check 徽章

### 9. 样式体系建立
- [ ] 定义灰阶色板 CSS 变量（gray-50 ~ gray-900）
- [ ] 定义阶段主题色（IDEA-violet / SETTING-blue / OUTLINE-emerald / BEATS-amber / DRAFTING-rose）
- [ ] 统一圆角、阴影、间距 Token
- [ ] 统一状态颜色映射
- [ ] Loading 动画统一（Spin + 彩色背景横幅）

### 10. 组件拆分与复用
- [ ] 提取 StageHeader 组件（标题 + 描述 + 已确认徽章）
- [ ] 提取 StageGenerating 组件（Loading 横幅，各阶段颜色不同）
- [ ] 提取 StageActions 组件（驳回/刷新 + 确认进入下一阶段）
- [ ] 提取 PhaseStatusBadge 组件（Lock/Check/数字 状态图标）
- [ ] 确保所有交互元素有 data-testid 属性

### 11. 清理工作
- [ ] 删除根目录 src/（React 原型，与 设计需求文档页面 重复）
- [ ] 删除根目录 index.html（React 原型入口）
- [ ] 删除根目录 README.md（React 原型说明）
- [ ] 将「设计需求文档页面」归档到 docs/figma-prototype/
- [ ] 删除根目录 pnpm-workspace.yaml（React 原型）
- [ ] 删除根目录 postcss.config.mjs（React 原型）
- [ ] 删除根目录 vite.config.ts（React 原型，如存在）

### 12. 测试同步更新
- [ ] ProjectHubView 测试更新
- [ ] IdeaView 测试更新
- [ ] SettingView 测试更新
- [ ] OutlineView 测试更新
- [ ] BeatsView 测试更新
- [ ] DraftingView 测试更新
- [ ] WorkflowView 测试更新
- [ ] 新增/改造组件的单元测试

---

## 附录

### A. 参考文档

| 文档 | 路径 | 角色 |
|------|------|------|
| 产品需求文档 | [docs/prd/01-产品需求文档.md](docs/prd/01-产品需求文档.md) | 功能需求定义 |
| 前端技术文档 | [docs/prd/03-前端技术文档.md](docs/prd/03-前端技术文档.md) | 技术栈与架构 |
| 服务端技术文档 | [docs/prd/04-服务端技术文档.md](docs/prd/04-服务端技术文档.md) | API 接口参考 |
| Figma 设计原型 | [设计需求文档页面/](设计需求文档页面/) | UI 布局与交互参考 |

### B. Figma 原型 → Vue 组件映射

| Figma 原型文件 | 对应 Vue 组件 | 改造类型 |
|------|------|------|
| ProjectCenter.tsx | ProjectHubView.vue + CreateProjectModal.vue | 重写 Template |
| WorkspaceLayout.tsx (StagePipeline) | WorkflowStepper.vue | 重写 |
| IdeaStage.tsx (SellingPointCard) | IdeaView.vue + SellPointSelector.vue | 重写 Template |
| SettingStage.tsx (WorldCard/CharacterCard/RelationSection) | SettingView.vue + WorldBuilder.vue + CharacterCard.vue + RelationGraph.vue | 重写 Template |
| OutlineStage.tsx (SegmentCard) | OutlineView.vue | 重写 Template |
| BeatsStage.tsx (BeatCard) | BeatsView.vue + BeatNarrativeCard.vue + BeatsConfigPanel.vue + BeatsRhythmChart.vue | 重写 Template |
| DraftingStage.tsx (ReviewPanel) | DraftingView.vue + EditorWorkspace.vue + ReviewPanel.vue + ChapterActionBar.vue | 重写 Template |

### C. 不变模块（无需改动）

| 模块 | 文件 | 说明 |
|------|------|------|
| API 层 | frontend/src/api/*.ts | 已完整覆盖服务端接口 |
| Store 层 | frontend/src/stores/*.ts | Pinia Setup Store，逻辑完备 |
| Composable 层 | frontend/src/composables/*.ts | 通用工作流 + AI 状态 + 解析器 |
| 路由 | frontend/src/router/index.ts | 嵌套路由结构正确 |
| 类型定义 | frontend/src/types.ts | 共享类型定义 |

---

> **创建日期**：2026-06-30
> **当前状态**：P0 + P1 重构已完成，P2 大部分完成，待测试同步更新

---

## ✅ 已完成 (2026-06-30)

### P0 ✅
- [x] **ProjectHubView** — 完整重写：Header + 筛选Tab + 项目卡片（5阶段进度条/状态色） + 空状态
- [x] **CreateProjectModal** — 重写：项目名称(0/30字符计数) + 题材芯片选择器 + 手动输入
- [x] **WorkflowStepper** — 替换 a-steps 为行内 Pipeline 样式（Check/Lock/数字圆圈 + 连接线）
- [x] **WorkflowView** — 全局 Header 重设计（返回按钮 + 项目名称 + Pipeline + 模型徽章 + 只读横幅）
- [x] **IdeaView** — 完整重写：示例按钮 + 卖点卡片3列网格 + 简介展示 + 确认流程
- [x] **DraftingView** — 三栏布局重写：侧边章节列表(进度条+状态色) + 工具栏 + 编辑器 + 审核面板
- [x] **ReviewPanel** — 重写：4色结论横幅 + 四维度评分(分数徽章+进度条+建议文字) + 按verdict显示操作按钮 + 上诉输入框

### P1
- [x] **SettingView** — 阶段标题+描述 + Loading动画 + 三Tab布局 + 操作按钮 + 已确认状态
- [x] **OutlineView** — Figma 原型对齐修复（6a~6d 前端完成 ✅，6e~6f 待后端）
- [x] **BeatsView** — 阶段标题+描述 + 已确认徽章

### P2 ✅ (部分)
- [x] **AppLayout** — 简化为内容外壳（Header已移至各页面）
- [x] **样式体系** — 统一灰阶色板 + 按钮风格(深灰主操作/border次要) + 阶段标题(h2+灰色副标题) + 已确认状态(green badge)
- [x] **ReviewVerdict** — 新增类型导出到 types.ts
- [x] **清理** — 删除根目录 src/ + index.html + README.md（React 原型）
- [x] **归档** — Figma 设计原型移至 docs/figma-prototype/

---

## P1 — OutlineView Figma 原型对齐修复 (2026-07-01 新增)

> 参考原型：[OutlineStage.tsx](docs/figma-prototype/src/app/components/stages/OutlineStage.tsx)
>
> 当前 [OutlineView.vue](frontend/src/views/OutlineView.vue) 与 Figma 原型存在 6 个差距

### 6a. 布局样式对齐（依赖排序：第一步）✅
- [x] max-width: 1024px, margin: 0 auto 居中布局
- [x] 外层 padding: 32px 24px
- [x] 结构选择器卡片：白色 bg + border + rounded-xl
- [x] 大纲卡片区域移除 `background: #f9fafb`，改用 Act 颜色分组

### 6b. 生成按钮逻辑修复 + 移除自动生成（依赖排序：第二步）✅
- [x] 修复 `v-if="!isConfirmed && !outlineData"` 自相矛盾条件
- [x] 将结构选择器 + 生成按钮移到 `v-if="outlineData && !loading"` 外层
- [x] 生成按钮仅在未生成且未确认时显示：`!isConfirmed && !(outlineData && outlineData.output)`
- [x] 移除 `watch(initialLoadDone)` 中的自动生成逻辑

### 6c. 大纲展示：平铺 Timeline → 嵌套 Act/Segment 卡片（依赖排序：第三步，核心）✅
- [x] 新建 `SegmentCard.vue` 组件：
  - [x] Props: `segment: { id, title, summary, keyEvents, isClimax, chapterRange }`
  - [x] 展示：段标题 + 高潮 Badge（红 Tag）+ 章节范围 + 摘要文字 + 关键事件 Tags
- [x] 改造 `parsedOutline`：从 `OutlineItem[]` 改为 `OutlineActData[]`（嵌套结构）
  - [x] 正则解析 `## 第X幕` → Act, `### 第X段` → Segment
  - [x] 提取关键事件（`**加粗**` 文字 / `-` 列表项）
  - [x] 检测高潮标记（标题含"高潮"）
  - [x] 提取章节范围（`第N-M章`）
  - [x] 回退逻辑：无幕结构时（web-novel-ten 十段）虚拟单幕包装
  - [x] 无解析结果时回退为原始 Markdown 渲染
- [x] 替换模板 `a-timeline` → 双层 `v-for` Act → Segment 网格（2列）
- [x] Act 容器 4 色分组（violet/blue/emerald/amber）：bg + border + badge + title 颜色
- [x] Segment 2列网格：`grid-cols-1 md:grid-cols-2`

### 6d. 新增可折叠分析面板（依赖排序：第四步，依赖 6c 解析结果）✅
- [x] 从 `outlineData.review` 读取分析数据
- [x] 可折叠面板（初始收起），白色卡片 + ChevronDown 图标
- [x] 3 列分析卡片（蓝/绿/紫）+ 1 行琥珀色预警横幅
- [x] 若 `review` 数据为空，面板不渲染

### 6e. 叙事结构选项对齐 Figma（依赖排序：第五步，前后端联动）
- [x] 前端 `structureOptions` 替换为 4 选项：网文十段结构（推荐）/ 三幕剧结构 / 英雄之旅 / 起承转合 ✅
- [x] 前端 `STRUCTURE_DESCS` 补充 hero-journey / kishotenketsu 描述 ✅
- [ ] 后端 `VALID_STRUCTURES` 增加 `hero-journey` / `kishotenketsu`（待后端修改）
- [ ] 后端 prompt `outline-generation.md` 补充两种新结构输出格式（待后端修改）

### 6f. 服务端 review 生成 AI 分析文本（依赖排序：第六步）
- [ ] Prompt 追加分析输出区块（`---` 分隔），4 个维度：节奏分析/冲突分布/高潮点检测/节奏预警
- [ ] `generateOutline` 方法：分离大纲正文 + 分析文本，解析后存入 `review` 各字段
- [ ] `switchStructure` 方法：同步更新（复用同一解析逻辑）

---

## P1 — BeatsView Figma 原型对齐修复 (2026-07-02 新增)

> 参考原型：[BeatsStage.tsx](docs/figma-prototype/src/app/components/stages/BeatsStage.tsx)
>
> 涉及文件：`BeatsView.vue`、`BeatsConfigPanel.vue`、`BeatNarrativeCard.vue`、`BeatsRhythmChart.vue`、`BeatsStatsBar.vue`

### 7a. 页面布局添加居中容器（依赖排序：第一步）✅
- [x] `BeatsView.vue` 模板外层包裹 `max-width:1024px; margin:0 auto; padding:32px 24px` 容器
- [x] 统一各区块间距为 24px（`space-y-6`）

### 7b. 阶段描述文案对齐 + 配置面板简化（依赖排序：第二步）✅
- [x] 副标题改为 "将大纲拆解为逐章的详细节拍计划，为正文写作提供精确导航"
- [x] `BeatsConfigPanel.vue` 移除预设按钮（短篇/中篇/长篇）、大纲预览折叠、超高章节警告 — Figma 无这些元素
- [x] 配置面板改为单行布局：2 个 input +「开始拆解」按钮
- [x] `BeatsStatsBar` 从 BeatsView 模板移除（Figma 无独立统计栏）

### 7c. Loading 状态样式对齐（依赖排序：第三步）✅
- [x] 替换 `<a-spin>` 为 amber 横幅：`bg-amber-50 border border-amber-200 rounded-xl` + 旋转图标 + "AI 正在拆解大纲，生成逐章节拍计划..."

### 7d. 节奏分析面板重写（依赖排序：第四步，核心）✅
- [x] 替换 `<a-collapse>` 为自定义折叠按钮（Zap 图标 + "节奏分析面板" + 预警数 badge + ChevronDown 旋转 180°）
- [x] 柱状图：DOM 柱状图替代 ECharts 折线图（高 = 冲突强度/5，色 = 高潮 rose / 高 amber / 普通 blue，底部标注章号）
- [x] 3 列 stat 卡片保留（整体节奏评分/平均冲突强度/高潮章节数）
- [x] 预警从多条 Alert 改为单条 amber 横幅
- [x] 移除 help 按钮 + RhythmHelpDrawer + ECharts 依赖

### 7e. 确认按钮文案 + 样式对齐（依赖排序：第五步）✅
- [x] 文案改为 "确认细纲，进入正文阶段"
- [x] 按钮改为自定义深色样式（`bg:#111827`）+ ✓ → 图标

---

## P1 — DraftingView Figma 原型对齐修复 (2026-07-02 新增)

> 参考原型：[DraftingStage.tsx](docs/figma-prototype/src/app/components/stages/DraftingStage.tsx)
>
> 涉及文件：`DraftingView.vue`、`ReviewPanel.vue`、`types.ts`

### 8a. 章节状态标签映射修正（依赖排序：第一步，全局影响）✅
- [x] `CHAPTER_STATUS_LABEL` 修正：
  - `DRAFT: '生成中'` → `DRAFT: '草稿'`
  - `PENDING_REVIEW: '待审核'` → `PENDING_REVIEW: '草稿'`
  - `REVIEWING: '审核中'` → `REVIEWING: '待审核'`
  - `DISPUTED: '已标记争议'` → `DISPUTED: '争议'`
- [x] DraftingView 侧边栏 `SIDEBAR_STATUS_CLASS` 颜色映射调整：REVIEWING→violet(Figma待审核色)，PENDING_REVIEW→blue(中间态低权重)
- [x] 全局搜索引用点并更新测试文件（EditorWorkspace.spec.ts + DraftingView.spec.ts）

### 8b. 提交审核按钮对 PENDING_REVIEW + DRAFT 可见（依赖排序：第二步）✅
- [x] 工具栏「重新生成」条件恢复为 `PENDING_REVIEW || DRAFT`（覆盖后端实际最终态）
- [x] 工具栏「提交审核」条件恢复为 `PENDING_REVIEW || DRAFT`（同上）
- [x] `handleSubmitReview` 成功后移除 `showReviewPanel = true`，让用户主动点击「查看审核结果」
- [x] 空章节判定从 `!content && status !== 'DRAFT'` 简化为 `status === 'PENDING'`
- [x] **根因**：后端 `generateChapter` 最终稳定态是 `PENDING_REVIEW`（`DRAFT` 仅用于 pipeline 瞬时窗口），第二版误将条件收窄到仅 `DRAFT` 导致按钮消失

### 8c. ReviewPanel `@appeal` 事件补齐（依赖排序：第三步）✅
- [x] DraftingView 添加 `@appeal="handleAppeal(selectedChapter.id, $event)"` 事件监听
- [x] 新增 `handleAppeal(reason: string)` 方法调用 `/projects/:pid/chapters/:cid/appeal`（后端 API 就绪后移至 chapterApi）
- [x] 上诉提交后刷新章节状态并关闭审核面板

### 8d. 隐藏阶段标题，三栏全高布局（依赖排序：第四步）✅
- [x] 移除 `drafting-view__header`（h2 标题 + 副标题）
- [x] 移除「全部完成」徽章（信息已在侧边栏进度条体现）
- [x] 三栏布局 `drafting-layout` 通过 `flex: 1` 自动撑满

### 8e. 编辑器 Textarea 改为常规阅读字体（依赖排序：第五步）✅
- [x] 移除 `font-family: 'Courier New', Courier, monospace`
- [x] 使用系统默认字体，保留 `line-height: 2`

### 8f. 完本按钮样式对齐 Figma（依赖排序：第六步）✅
- [x] 替换 `CompletionBanner` 组件为简洁深色按钮
- [x] 样式：`bg:#111827` + Check 图标 + "完本" 文案 + `border-radius:8px` + `hover:bg:#374151`
- [x] 移除 `CompletionBanner` import

### 8g. 侧边栏进度条高度 + Loading 样式对齐（依赖排序：第七步）✅
- [x] 进度条高度从 4px → 6px
- [x] 初始加载 `<a-spin>` 替换为蓝色 Loading 横幅（`bg:#eff6ff border:#bfdbfe` + LoadingOutlined）

### 8h. 生成按钮图标替换（依赖排序：第八步）⏭️
- [ ] 暂缓：Ant Design Icons 无直接 Sparkles 等效图标，ThunderboltOutlined 已足够表意

---

## P0 修复进度

| 步骤 | 内容 | 状态 |
|------|------|------|
| 8a | 状态标签映射修正 | ✅ |
| 8b | 提交审核按钮逻辑 | ✅ |
| 8c | appeal 事件补齐 | ✅ |
| 8d | 隐藏阶段标题 | ✅ |
| 8e | 等宽字体移除 | ✅ |
| 8f | 完本按钮重做 | ✅ |
| 8g | 进度条+Loading | ✅ |
| 8h | 图标替换 | ⏭️ 暂缓 |
