## Problem Statement

小说创作者面临一个复杂的"创意→作品"转化鸿沟：一个模糊的想法要变成一本符合网文市场标准、通过平台审核、且逻辑自洽的长篇小说，需要经过灵感筛选、世界观设定、剧情大纲、章节拆解和正文写作等多个阶段。每个阶段不仅消耗大量时间精力，还需要作者同时具备市场嗅觉、编辑能力和写作功力。多数AI写作工具只提供"输入提示→输出文本"的简单交互，缺乏结构化的分步确认流程和专业的市场合规评价，导致生成内容"好看但不好用"——要么无法过审，要么缺乏商业价值。

## Solution

NovelCraft Pro 是一个**分步确认式 AI 长篇小说创作系统**。它将创作过程拆解为 5 个结构化阶段（灵感提取→设定集→剧情大纲→细纲拆解→正文迭代），每个阶段 AI 都提供专业级输出，并经"资深编辑模拟器"进行市场合规审核，用户逐阶段确认后进入下一步。系统支持多作品并行管理，所有状态持久化保存。

## User Stories

### 项目管理

1. 作为一名作者，我想要创建多个小说项目，以便同时构思不同类型的作品。
2. 作为一名作者，我想要在仪表盘中看到所有小说项目的列表、进度和最后更新时间，以便快速切换。
3. 作为一名作者，我想要删除或归档不再创作的小说项目，以便保持工作区整洁。
4. 作为一名作者，我想要每个小说项目独立保存其所有阶段的确认状态，以便随时暂停和恢复创作。

### Step 1: 灵感提取（Idea）

5. 作为一名作者，我想要输入一个模糊的创意想法（如"一个重生到古代的医生"），AI 分析当前网文市场趋势后给出 3-5 个差异化的核心卖点方案，以便我选择最有商业潜力的方向。
6. 作为一名作者，我想要看到每个卖点方案的"市场匹配度评分"和"类似爆款参考"，以便做出有数据支撑的决策。
7. 作为一名作者，我想要在选定卖点后 AI 生成该小说的"一句话简介"和"500字内简介"，以便后续用于投稿和宣传。
8. 作为一名作者，我想要看到"资深编辑"对选定灵感的审核意见（含合规风险和商业潜力评级），以便提前规避问题。

### Step 2: 设定集（Setting）

9. 作为一名作者，我想要 AI 基于选定灵感生成完整的世界观体系（时代背景、地理环境、社会结构、力量等级），以便构建小说的舞台。
10. 作为一名作者，我想要 AI 生成核心角色卡（主角、反派、重要配角），包含每个人的欲望/动机/结局三条弧线，以便确保角色动机一致。
11. 作为一名作者，我想要 AI 生成角色关系图（文本描述），标明冲突关系和情感纽带，以便后续推进剧情。
12. 作为一名作者，我想要手动编辑和补充设定内容，AI 能基于修改重新生成关联内容，以便保持逻辑一致性。
13. 作为一名作者，我想要"资深编辑"审核设定的合规性和市场匹配度，特别是力量体系是否踩红线，以便提前调整。

### Step 3: 剧情大纲（Outline）

14. 作为一名作者，我想要 AI 生成符合三幕式结构（或选择网文黄金节奏）的完整剧情大纲，以便把控故事节奏。
15. 作为一名作者，我想要在大纲中看到每个关键情节节点的"情绪曲线"标注（爽点/虐点/悬念点），以便确保阅读体验起伏。
16. 作为一名作者，我想要切换大纲格式（三幕式 / 网文十章节奏 / 四幕八段），AI 能自动重新生成，以便适配不同平台偏好。
17. 作为一名作者，我想要"资深编辑"审核大纲的节奏是否合理、冲突是否充足、高潮是否足够，以便优化故事张力。
18. 作为一名作者，我想要通过拖拽调整大纲节点的顺序，AI 自动补全衔接内容，以便灵活调整剧情。

### Step 4: 细纲拆解（Beats）

19. 作为一名作者，我想要 AI 将大纲自动拆解为每章的详细 Beat（包含本章冲突点、钩子预设、字数建议），以便写作时有一张"导航地图"。
20. 作为一名作者，我想要看到每章 Beat 的"读者期待值"曲线，确保每章结尾都有足够的追读动力。
21. 作为一名作者，我想要一键调整某章的字数或 POV 视角，AI 自动重新平衡前后章节，以便灵活控制节奏。
22. 作为一名作者，我想要"资深编辑"审核全篇钩子密度和冲突递进是否合理，避免"中期疲软"。

### Step 5: 正文迭代（Drafting）

23. 作为一名作者，我想要 AI 基于细纲逐章生成正文（支持流式输出 SSE），以便实时看到 AI 创作过程。
24. 作为一名作者，我想要 AI 支持三种模式：新建续写（从零生成）、段落改写（选中文本改写）、文笔升级（整体润色提升文学性），以便在不同场景下使用。
25. 作为一名作者，我想要在生成过程中随时"暂停/继续/重试"，AI 从当前上下文恢复，以便控制生成方向和成本。
26. 作为一名作者，我想要"资深编辑"在每章生成后自动审核合规性，高亮标出可能触发平台审核的内容（涉政、色情、暴力），以便在发布前修改。
27. 作为一名作者，我想要看到已生成正文的总字数和各章字数分布统计，以便掌握创作进度。

### 市场与合规评价体系

28. 作为一名作者，我想要在每一步都获得"资深编辑 AI"的综合评分（1-10分），涵盖市场潜力、合规安全性、逻辑自洽性三个维度，以便做出是否进入下一步的决策。
29. 作为一名作者，我想要看到具体的修改建议（而非泛泛的"需要修改"），每条建议可一键采纳生成修改后的内容，以便高效迭代。
30. 作为一名作者，我想要在合规检查中特别关注：政治敏感隐喻、色情擦边描写、极端暴力渲染、暗黑价值观输出，这四项是网文平台零容忍红线。

### AI 交互体验

31. 作为一名作者，我想要在 AI 生成内容时看到一个流畅的打字机效果（逐字显示），而不是突然弹出大段文字，以便有更好的创作陪伴感。
32. 作为一名作者，我想要自由配置 AI 的"创作风格"（如：细腻文艺/快节奏爽文/幽默吐槽），以便适配不同小说类型。
33. 作为一名作者，我想要在生成不满意时给出简短反馈（如"太拖沓了""男主太弱了"），AI 重新生成时自动纳入，以便精准调校。

## Implementation Decisions

### 技术架构

| 层级 | 选型 | 理由 |
|------|------|------|
| 前端框架 | Vue 3 + Composition API + TypeScript | 用户指定技术栈 |
| UI 组件库 | Ant Design Vue v4 | 用户指定，适合表单密集的管理类界面 |
| 状态管理 | Pinia + pinia-plugin-persistedstate | 用户指定，配合 localStorage 持久化 |
| 动画 | CSS Transition + Canvas 粒子背景 | 用户指定"书卷气息"，可自实现粒子系统 |
| 后端框架 | NestJS (Node.js) | 用户指定，TypeScript 原生支持 |
| ORM | Prisma + MongoDB | 用户指定，文档模型的灵活性适合小说数据 |
| AI 模型 | DeepSeek V4 Pro (via proxy) | 用户指定，需代理调用 |
| 流式输出 | SSE (Server-Sent Events) | NestJS `@Sse()` + RxJS Observable |
| AI SDK | OpenAI SDK (兼容模式) | DeepSeek API 与 OpenAI SDK 兼容 |

### 模块设计

系统拆分为以下深层模块（Deep Modules）：

**后端模块：**

| 模块 | 接口 | 职责 |
|------|------|------|
| ProjectModule | `POST/GET/PATCH/DELETE /projects` | 小说项目 CRUD |
| WorkflowModule | `GET/POST /projects/:id/steps/:step` | 5 步工作流状态机，管理阶段确认与回退 |
| AIGatewayModule | `POST /ai/generate`, `GET /ai/stream/:taskId` | AI 调用代理，封装 DeepSeek API，支持 SSE 流式输出 |
| ReviewModule | `POST /review/evaluate` | "资深编辑"AI 审核，输出评分 + 逐条建议 |

**前端模块：**

| 模块 | 组件 | 职责 |
|------|------|------|
| ProjectHub | `ProjectList`, `ProjectCard`, `CreateProjectModal` | 多项目管理仪表盘 |
| WorkflowStepper | `WorkflowSteps`, `StepPanel`, `ConfirmButton` | 5 步进度条 + 步骤切换 |
| StepIdea | `IdeaInput`, `MarketAnalysisCard`, `SellPointSelector` | 灵感输入 + 卖点选择 |
| StepSetting | `WorldBuilder`, `CharacterCard`, `RelationGraph` | 世界观 + 角色卡编辑 |
| StepOutline | `OutlineTree`, `StructureSwitcher`, `EmotionCurve` | 大纲生成 + 结构调整 |
| StepBeats | `BeatList`, `BeatEditor`, `HookDensityChart` | 细纲编辑 + 钩子密度 |
| StepDrafting | `StreamingEditor`, `ModeSwitcher`, `TextToolbar` | 流式正文生成 + 编辑 |
| ReviewPanel | `ReviewScore`, `IssueHighlighter`, `SuggestionList` | 合规评分 + 建议展示 |
| CanvasBackground | `ParticleCanvas` | 页面背景粒子动画 |

### API 契约（核心端点）

**POST `/projects/:id/steps/idea/confirm`**

确认灵感步骤，触发 Market & Compliance 审核：

```json
// Request
{ "selectedSellPoint": 2, "customBrief": "修改后的一句话简介" }

// Response (SSE stream or JSON)
{
  "step": "idea",
  "status": "confirmed",
  "marketScore": 8,
  "complianceScore": 9,
  "logicScore": 7,
  "editorNotes": [
    { "severity": "warning", "content": "注意：主角'杀伐果断'人设需平衡正向价值观，建议增加一两处仁慈表现。" }
  ],
  "nextStep": "setting"
}
```

**POST `/ai/generate`**

通用 AI 生成端点（支持流式）：

```json
// Request
{
  "projectId": "proj_001",
  "step": "outline",
  "action": "generate",
  "params": { "structure": "three-act", "style": "快节奏爽文" },
  "context": { "previousStepOutput": "..." }
}

// Response: SSE stream (text/event-stream)
// data: {"chunk": "第一幕：建置\n开场..."}
// data: [DONE]
```

### 数据模型（核心实体）

**Project**: id, title, status (enum: IDEA/SETTING/OUTLINE/BEATS/DRAFTING/COMPLETED), currentStep, config (style, platform, genre), createdAt, updatedAt

**StepData**: projectId, stepType (enum: IDEA/SETTING/OUTLINE/BEATS/DRAFTING), status (enum: PENDING/IN_PROGRESS/CONFIRMED/REJECTED), input (用户输入), output (AI 输出), review (审核结果), version (历史版本), confirmedAt

**Chapter**: projectId, chapterNumber, title, beatPlan (细纲), content (正文), status (enum: DRAFT/REVIEWING/COMPLETED/PUBLISHED), reviewResult, createdAt, updatedAt

### 状态机设计

工作流步骤状态转换：

```
PENDING → IN_PROGRESS（用户开始输入/触发AI）
→ AI_GENERATING（AI 返回中）
→ AWAITING_REVIEW（AI 完成，等待审核）
→ REVIEWING（审核中）
→ CONFIRMED（用户确认）或 REJECTED（用户驳回，回到 PENDING）
```

整体小说状态流转：`IDEA → SETTING → OUTLINE → BEATS → DRAFTING → COMPLETED`

每个步骤确认后才能进入下一步，用户可以回退到任意已确认步骤重新生成（触发下游步骤状态重置）。

### 合规审核规则引擎（内置"资深编辑"Prompt）

基于调研结果，AI "资深编辑"将内置以下审核维度：

1. **政治安全**：检测隐喻、影射、历史虚无主义等敏感表达
2. **色情尺度**：按平台标准检测过度亲密描写、性暗示、擦边内容。晋江标准最为严格（"脖子以下不能写"）
3. **暴力渲染**：检测极端暴力、酷刑、残忍杀害的细节描写
4. **价值观**：检测暗黑价值观、违法美化、反社会倾向
5. **市场匹配**：基于起点/晋江/番茄的当前热门类型，评估作品的商业潜力

每个维度输出 1-10 评分 + 具体违规位置 + 修改建议。

## Testing Decisions

### 测试策略

- **状态机测试**：测试 WorkflowModule 的步骤转换逻辑，覆盖所有合法转换路径和非法路径被拒绝的情况
- **AI Mock 测试**：Mock DeepSeek API 返回，验证 SSE 流解析正确、错误重试机制、超时处理
- **审核规则测试**：准备已知合规/违规文本样本，验证"资深编辑"Prompt 能正确识别各类红线内容
- **前端组件测试**：测试工作流步骤切换的 Pinia store 状态正确性，测试用户确认按钮点击后的完整数据流

### 测试原则

- 只测试外部行为（公共接口），不测试实现细节
- 每个垂直切片（用户故事）至少一个端到端测试
- AI 生成内容不做精确断言，只验证格式和基本约束

## Out of Scope

- 用户认证与多租户（本次为单用户系统，认证功能后续迭代）
- 付费订阅 / Token 计费系统
- 小说直接发布到平台的 API 对接（只到生成 + 审核建议）
- 语音输入 / 语音朗读
- 多人协作 / 编辑协同
- 插画生成 / AI 配图
- 移动端 App（本次为 Web 端）
- 多语言支持（仅支持中文创作）

## Further Notes

### 依赖的外部服务

| 服务 | 用途 | 备注 |
|------|------|------|
| DeepSeek API (via proxy) | 核心 AI 生成能力 | 使用 OpenAI 兼容 SDK，base_url 指向代理地址 |
| Context7 | 开发阶段获取最新 API 文档 | 确保 API 调用方式与最新版本一致 |

### 已知风险

1. **Token 成本控制**：长篇小说单次可能消耗百万级 token，需在 prompt 中控制上下文长度，避免将全书塞入请求
2. **流式中断恢复**：SSE 连接中断后如何从断点续传需要仔细设计
3. **MongoDB 文档大小**：长篇小说全存储可能导致单文档过大（MongoDB 16MB 限制），需考虑分片或 GridFS
4. **AI 审核准确性**：AI 审核无法 100% 替代人工审核，需明确免责声明

### 设计原则

- 采用"现代书卷风"配色：暖米色背景 + 深棕色文字 + 金色点缀
- Canvas 粒子动画：飘落的文字粒子或墨点，营造创作氛围
- 界面强调"健康、专业、积极"：避免暗黑模式，使用柔和色调
- 每个步骤面板带有明确的进度指示和状态徽章
