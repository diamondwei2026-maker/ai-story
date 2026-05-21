## Problem Statement

小说创作者面临一个复杂的"创意→作品"转化鸿沟：一个模糊的想法要变成一本符合网文市场标准、通过平台审核、且逻辑自洽的长篇小说，需要经过灵感筛选、世界观设定、剧情大纲、章节拆解和正文写作等多个阶段。每个阶段不仅消耗大量时间精力，还需要作者同时具备市场嗅觉、编辑能力和写作功力。多数AI写作工具只提供"输入提示→输出文本"的简单交互，缺乏结构化的分步确认流程和专业的市场合规评价，导致生成内容"好看但不好用"——要么无法过审，要么缺乏商业价值。

初次设计时遗留了多个流程闭环缺口和决策冲突：（1）BEATS 修改在 DRAFTING 进行时的回退规则模糊——两档回退规则与 Example Dialogue 存在矛盾；（2）COMPLETED 后无可操作路径；（3）非 PASS 审核结论的用户决策链不完整——缺上诉出口和 DISPUTED 收敛规则；（4）ChangeAnalysis 结果未定义存储位置，刷新即丢失，且任何编辑（包括改标点）都触发完整管道，浪费 token；（5）上下文注入三层总预算 5-8K tokens 但无一层定义硬上限，前一章超长时必然溢出；（6）FactSheet 乐观锁失败后"跳过"与事实簿一致性目标矛盾；（7）关键章节识别标准在 PRD 和 ADR-0003 间不一致且钩子密度无阈值；（8）模型降级 V3→R1→V3 在两者同时不可用时形成逻辑死循环。

## Solution

NovelCraft Pro 是一个**分步确认式 AI 长篇小说创作系统**。它将创作过程拆解为 5 个结构化阶段（灵感提取→设定集→剧情大纲→细纲拆解→正文迭代），每个阶段 AI 都提供专业级输出，并经"资深编辑 AI"进行市场合规审核，用户逐阶段确认后进入下一步。系统支持多作品并行管理，所有状态持久化保存。

在此基础上，补齐三层运行时护栏：

1. **状态机闭环**——使 BEATS 内部修改、审核决策、Project 完结的每一条路径都有定义的状态终点
2. **ChangeAnalysis 生命周期**——分析结果可持久化、触发有阈值、下游处理有追溯
3. **运行时护栏**——上下文注入有硬上限和裁剪、FactSheet 有补偿队列、关键章节有双重判定、模型降级有终端而非死循环

## User Stories

### 项目管理

1. 作为一名作者，我想要创建多个小说项目，以便同时构思不同类型的作品。
2. 作为一名作者，我想要在仪表盘中看到所有小说项目的列表、进度和最后更新时间，以便快速切换。
3. 作为一名作者，我想要删除或归档不再创作的小说项目，以便保持工作区整洁。
4. 作为一名作者，我想要每个小说项目独立保存其所有阶段的确认状态，以便随时暂停和恢复创作。

### Step 1: 灵感提取（Idea）

5. 作为一名作者，我想要输入一个模糊的创意想法（如"一个重生到古代的医生"），AI 分析当前网文市场趋势后给出 3-5 个差异化的核心卖点方案，以便我选择最有商业潜力的方向。若所有方案均不满意，可点击"重新生成"并附带简短反馈（如"太套路了"），AI 基于反馈生成新一轮方案。
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
16. 作为一名作者，我想要切换大纲格式（三幕式 / 网文十章节奏 / 四幕八段），AI 保留现有大纲中的关键情节点作为种子，按新格式骨架重新组织节点——而非从零重建。切换前系统提示"格式切换将重新组织大纲结构，关键情节点保留但节点间衔接将被重写"，用户确认后执行，以便适配不同平台偏好。
17. 作为一名作者，我想要"资深编辑"审核大纲的节奏是否合理、冲突是否充足、高潮是否足够，以便优化故事张力。
18. 作为一名作者，我想要通过拖拽调整大纲节点的顺序，AI 自动补全衔接内容，以便灵活调整剧情。
18a. 作为一名作者，我想要在 BEATS Phase 拖拽调整 Beat 的顺序（交换 chapterNumber），以便在拆解阶段调整章节排列——交换后两个 Beat 均标记 STALE，对应 Chapter（如已生成）标记过时提示。

### Step 4: 细纲拆解（Beats）

19. 作为一名作者，我想要 AI 将大纲自动拆解为每章的详细 Beat（包含本章冲突点、钩子预设、字数建议），以便写作时有一张"导航地图"。
20. 作为一名作者，我想要看到每章 Beat 的"读者期待值"曲线，确保每章结尾都有足够的追读动力。
21. 作为一名作者，我想要一键调整某章的字数或 POV 视角，AI 自动重新平衡前后章节，以便灵活控制节奏。
22. 作为一名作者，我想要"资深编辑"审核全篇钩子密度和冲突递进是否合理，避免"中期疲软"。
22a. 作为一名作者，我想要在项目配置中设定每章的默认目标字数（如 2000字/3000字/5000字），AI 在拆解细纲和生成正文时自动按目标字数控制内容量，以便适配不同平台的字数要求。
22b. 作为一名作者，我想要为特定章节单独覆盖字数设定（如高潮章节需要更长篇幅），以便灵活调控各章节奏。

### BEATS 轻量修改

23. 作为一名作者，我想要在 DRAFTING 进行中修改某个 Beat 的目标字数（如 2000 → 3000），系统仅更新该 Beat 和对应 Chapter 的字数目标而不触发全量 STALE，以便快速调整章节长度而不丢失已写正文。
24. 作为一名作者，我想要在 DRAFTING 进行中修改某个 Beat 的结构内容（冲突点/钩子/POV），系统标记该 Beat 和对应 Chapter 为 STALE 但不影响其他章节，以便精确控制修改范围。
25. 作为一名作者，当需要全局重构 BEATS（如整体重排章节结构）时，我想要通过正式的"回退到 BEATS"操作触发跨 Phase 回退，使 DRAFTING 全部 STALE，以便系统知道这是一次大规模变更。

### Step 5: 正文迭代（Drafting）

26. 作为一名作者，我想要手动触发每章正文生成（支持流式输出 SSE），第 N 章确认前第 N+1 章不可生成，以便实时看到 AI 创作过程并保持顺序写作纪律。
27. 作为一名作者，我想要 AI 支持三种模式：新建续写（从零生成）、段落改写（选中文本改写）、文笔升级（整体润色提升文学性），以便在不同场景下使用。
28. 作为一名作者，我想要在生成过程中随时"暂停/继续/重试"——暂停后保留已生成内容可手动编辑后继续续写（继续时传入用户编辑后的完整 Chapter.content，AI 从末尾自然续写），重试则完整重新生成——以便控制生成方向和成本。
29. 作为一名作者，我想要"资深编辑"在每章生成后自动审核合规性，高亮标出可能触发平台审核的内容（涉政、色情、暴力），以便在发布前修改。
30. 作为一名作者，我想要看到已生成正文的总字数和各章字数分布统计，以便掌握创作进度。
30a. 作为一名作者，我想要关闭章节编辑器后 AI 自动分析变更对下游章节的影响，并对受影响的章节执行针对性修补（差异对比视图，用户审查确认后替换），以便在千章规模下高效维护一致性。

### 审核决策路径

31. 作为一名作者，当审核结论为 PASS_WITH_SUGGESTIONS 时，我想要看到"采纳建议并重新审核"和"忽略并确认"两个按钮，以便按自己的判断决定是否修改——建议不应阻塞流程。
32. 作为一名作者，当审核结论为 NEEDS_REVISION 时，我想要三个选项——"一键采纳建议→重新审核""手动修改正文→重新生成→重新审核""上诉至二次审核"——以便根据问题严重程度选择处理方式。
33. 作为一名作者，当审核结论为 BLOCKED（零容忍红线）时，系统不提供一键采纳按钮——我需要手动修改正文后重新生成审核或上诉，因为红线内容需要人工判断而不能交给 AI 自动修复。
34. 作为一名作者，我想对 BLOCKED 或 NEEDS_REVISION 的审核结论提出上诉，系统用原始内容 + 审核结果 + 我的异议理由做二次审核；如果结论降级则按新结论处理，如果维持原判我可选择再次修改或强制标记 DISPUTED，上诉仅限一次，以便有申诉渠道但不会陷入循环。
35. 作为一名作者，当强制标记 DISPUTED 时，系统弹出二次确认："你将自行承担合规风险，确认继续？"，以便我明确知道后果。

### Project 完结流程

36. 作为一名作者，当所有章节都完成（COMPLETED 或 DISPUTED）时，我想要在页面顶部看到醒目的"完本提示"横幅而非自动完结，以便我有意识地做出"完本"这个仪式感决定。
37. 作为一名作者，点击"确认完本"后 Project 变为 COMPLETED 只读模式，所有 Phase 面板可展开查看但不可编辑，以便回顾完整作品。
38. 作为一名作者，在 COMPLETED 只读模式下我想要通过"继续创作"按钮退回到 DRAFTING 状态继续修改，以便完本后仍可迭代——COMPLETED 是里程碑而非终点锁。

### ChangeAnalysis 生命周期

39. 作为一名作者，当我关闭章节编辑器后触发 ChangeAnalysis 且看到了受影响章节列表，我刷新页面或关闭浏览器后重新打开该章节，仍能查看之前的影响分析结果和各章处理状态，以便不丢失分析结果。
40. 作为一名作者，当我仅修改了几个标点或调整个别措辞后关闭编辑器，系统应跳过 ChangeAnalysis（不消耗 token），以便微调不触发完整 AI 管道。
41. 作为一名作者，对于 HIGH 严重度的受影响章节，我必须在当场做出 TargetedFix 或跳过的决策（不可推迟），以便叙事逻辑断裂的问题不被积压。
42. 作为一名作者，对于 MEDIUM/LOW 严重度的受影响章节，我可将某章标记为"稍后处理"（DEFERRED），下次打开任意已确认章节时系统重新提醒，以便不阻塞当前工作流。
43. 作为一名作者，当我对受影响章节执行 TargetedFix 后，修补记录（何时修补、由哪个源章节的变更触发、修补摘要）应保留在该章节的修补历史中，以便追溯每次修补的来龙去脉。

### 上下文注入预算管理

44. 作为一名作者，当某章正文特别长（超过 2500 tokens）时，系统自动生成约 400 tokens 的章节摘要存入 contextSummary，以便生成下一章时用摘要替代全文注入，控制上下文预算不超标。
45. 作为系统，三层上下文注入（全局静态/全局动态/局部上下文）各自有硬上限（3000/2000/3000 tokens），超限时按优先级裁剪而非静默截断，以便生成质量可预期。

### FactSheet 补偿机制

46. 作为系统，当 FactSheet 乐观锁写冲突两次均失败时，待合并条目写入 pendingFactUpdates 补偿队列（而非丢弃），下次任意章节成功更新 FactSheet 时批量消费队列，以便事实簿最终一致性得到保障。
47. 作为一名作者，当 pendingFactUpdates 队列积压超过 10 条时，UI 展示告警横幅"事实簿同步延迟，建议暂停生成新章并手动触发同步"，以便我知道系统状态并采取行动。

### 关键章节识别

48. 作为系统，关键章节（需使用 R1 模型生成）通过双重判定自动识别——结构位置（开篇 1-3 章/结局最后 3 章）或钩子密度（Beat.hookCount ≥ 3），任满足其一即标记——以便关键章节的质量得到保障。
49. 作为一名作者，在 BEATS Phase 中我可将任意章节手动标记为"高潮章节"（isClimax），以确保该章在 DRAFTING 阶段使用 R1 模型生成。

### 模型容错

50. 作为系统，AI 调用失败时执行单向降级——V3→R1→阻塞，或 R1→V3→阻塞——不循环降级。当两个模型同时不可用时弹 Modal 通知用户"AI 服务暂时不可用，请稍后重试"并提供手动重试按钮。
51. 作为一名作者，我想在生成正文时看到当前使用的 AI 模型名称，降级时展示黄色 Badge"已降级至 R1/V3"，以便了解生成质量等级。

### 市场与合规评价体系

52. 作为一名作者，我想要在每一步都获得"资深编辑 AI"的综合评分（1-10分），涵盖市场潜力、合规安全性、逻辑自洽性三个维度，以便做出是否进入下一步的决策。
53. 作为一名作者，我想要看到具体的修改建议（而非泛泛的"需要修改"），每条建议可一键采纳生成修改后的内容，以便高效迭代。
54. 作为一名作者，我想要在合规检查中特别关注：政治敏感隐喻、色情擦边描写、极端暴力渲染、暗黑价值观输出，这四项是网文平台零容忍红线。

### 完结前检查

55. 作为一名作者，点击"确认完本"时系统检查 pendingFactUpdates 队列——若队列非空则展示提示并提供三个选项："立即同步并完本""跳过并完本""取消"，以便我在完本前处理待同步数据。

### AI 交互体验

56. 作为一名作者，我想要在 AI 生成内容时看到一个流畅的打字机效果（逐字显示），而不是突然弹出大段文字，以便有更好的创作陪伴感。
57. 作为一名作者，我想要自由配置 AI 的"创作风格"（如：细腻文艺/快节奏爽文/幽默吐槽），以便适配不同小说类型。
58. 作为一名作者，我想要在生成不满意时给出简短反馈（如"太拖沓了""男主太弱了"），重试时该反馈临时追加到 Prompt 中（仅本次生效，不修改项目配置），以便精准调校。

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
| AI 模型 | DeepSeek 生态（V3 + R1）via OpenRouter | 限定 DeepSeek 生态：V3 用于批量任务（普通章节正文、审核、指纹/FactSheet 提取），R1 用于关键任务（前期 Phase 生成、关键章节正文）。OpenRouter 作为 API 网关保留未来切换其他供应商的灵活性 |
| 流式输出 | SSE (Server-Sent Events) | NestJS `@Sse()` + RxJS Observable 包装 LangChain `.stream()` 的 AsyncIterable |
| AI 框架 | LangChain 薄层 + @langchain/openrouter | 仅用 LangChain 的 ChatModel 抽象（统一调用 OpenRouter）+ PromptTemplate（从 .md 文件加载模板）。不引入 Chain、Memory、Agent 等重概念——AI 调用模式为线性管道，NestJS 模块化 + RxJS 已足够编排 |

### 模块设计

系统拆分为以下深层模块（Deep Modules）：

**后端模块：**

| 模块 | 接口 | 职责 |
|------|------|------|
| ProjectModule | `POST/GET/PATCH/DELETE /projects` | 小说项目 CRUD |
| WorkflowModule | `GET/POST /projects/:id/steps/:step` | 5 步工作流状态机，管理阶段确认与回退。BEATS 确认时负责写入 Beat 文档 + 创建空壳 Chapter + 更新 Project.refs。新增 BEATS 轻量修改、confirmCompletion/reopenProject、BEATS 内部修改 vs 跨 Phase 回退区分 |
| AIGatewayModule | `GET /ai/generate`（SSE 逐 token 流式）, `GET /ai/stream/:taskId`（状态查询） | AI 调用唯一入口：通过 LangChain ChatModel 薄层调用 OpenRouter，按 TaskType→Model 映射路由，支持 SSE 流式输出、单向模型降级 V3↔R1（正文→Error 阻塞 / 审核→failed 优雅完成 / 指纹→跳过）、三层上下文预算裁剪（全局静态≤3000 / 全局动态≤2000 / 局部≤3000，总≤8000 tokens）。内含 AIGatewayService（路由+降级+流式）+ ContextBudgetService（Token 估算+三层裁剪）+ PromptTemplateLoaderService（`prompts/` 目录 .md 模板加载渲染）。所有模块（含 ReviewModule）通过 AIGatewayModule 调用 AI |
| ReviewModule | `POST /review/evaluate`, `POST /review/appeal` | "资深编辑"AI 审核：组装审核 Prompt → 调用 AIGatewayModule → 解析结构化审核结果。新增审核决策路由（getAvailableActions / appealReview）、四档结论的完整用户操作 |
| ChangeAnalysisService | 内部 Service（无独立端点） | 变更检测编排：实质性变更判定 → 提取 ChangeFingerprint + ImpactPropagation（合并 AI 调用）→ DB 查询匹配受影响章节 → TargetedFix 编排。分析结果持久化到源 Chapter |
| FactSheetCompensationService | 内部 Service（无独立端点） | FactSheet 乐观锁补偿队列：写冲突入队、批量消费合并（去重+冲突裁决）、队列深度监控与告警、手动强制同步 |

**前端模块：**

| 模块 | 组件 | 职责 |
|------|------|------|
| ProjectHub | `ProjectList`, `ProjectCard`, `CreateProjectModal` | 多项目管理仪表盘 |
| WorkflowStepper | `WorkflowSteps`, `StepPanel`, `ConfirmButton`, `CompletionBanner` | 5 步进度条 + 步骤切换 + DRAFTING 顶部"完本提示"横幅 + "确认完本"按钮 + COMPLETED 只读覆盖层 + "继续创作"按钮 |
| StepIdea | `IdeaInput`, `MarketAnalysisCard`, `SellPointSelector` | 灵感输入 + 卖点选择 |
| StepSetting | `WorldBuilder`, `CharacterCard`, `RelationGraph` | 世界观 + 角色卡编辑 |
| StepOutline | `OutlineTree`, `StructureSwitcher`, `EmotionCurve` | 大纲生成 + 结构调整 |
| StepBeats | `BeatList`, `BeatEditor`, `HookDensityChart` | 细纲编辑 + 钩子密度。Beat 编辑区分"字数模式"和"结构模式"；新增 isClimax 勾选框和 hookCount 只读展示 |
| StepDrafting | `StreamingEditor`, `ModeSwitcher`, `TextToolbar`, `ChangeAnalysisPanel` | 流式正文生成 + 编辑。关闭编辑器时执行 diff 计算 → 决定是否触发 ChangeAnalysis；影响分析面板展示持久化的 changeAnalysis 数据 |
| ReviewPanel | `ReviewScore`, `IssueHighlighter`, `SuggestionList`, `AppealModal` | 合规评分 + 建议展示。根据 verdict 动态渲染不同按钮组；二次上诉 Modal；强制 DISPUTED 确认对话框 |
| CanvasBackground | `ParticleCanvas` | 页面背景粒子动画 |
| ModelStatusIndicator | `ModelBadge`, `ErrorModal` | 模型名称展示 + 降级 Badge + 双模型不可用 Error Modal |

### Chapter 生成管道

每章正文生成由 WorkflowModule 编排，依次调用 AIGatewayModule 执行五步管道。每步结果持久化后才进入下一步，任一步失败可从断点恢复：

```
WorkflowModule.generateChapter(chapterId):
  1. 生成正文（流式 SSE，每 token 追加持久化）      → Chapter.status = DRAFT
  2. 提取 ChapterFingerprint                        → 存入 Chapter.chapterFingerprint
  3. 增量更新 FactSheet（乐观锁，冲突自动重试一次）   → FactSheet.version++
  4. 独立合规审核                                    → Chapter.status = REVIEWING
  5. 审核通过后生成长章摘要                           → 存入 Chapter.contextSummary
```

步骤 5 仅在审核结论为 PASS 且正文 > 2500 tokens 时执行——AI 生成约 400 tokens 的结构化摘要（出场角色、关键事件、情感转折），供下一章生成时替代全文注入上下文窗口。

- **模式差异**：三种模式（新建续写/段落改写/文笔升级）全部走完整管道——仅步骤 1 的 Prompt 不同，步骤 2-5 统一执行以保证一致性和安全
- **重试**：用户触发"重试"时完整重跑全部五步，Chapter 保持 DRAFT 状态，中间结果覆盖
- **审核结论处理**：PASS → 自动确认（Chapter → COMPLETED），随后执行步骤 5（如适用）；PASS_WITH_SUGGESTIONS / NEEDS_REVISION / BLOCKED → 等待用户决策（步骤 5 在用户最终确认后执行，以最终版本正文为准）
- **下一章解锁条件**：`Chapter.status ∈ {COMPLETED, DISPUTED}` 时下一章"生成"按钮可用

### ChangeAnalysis 管道

用户关闭章节编辑器后经实质性变更检测通过后自动触发，合并为一个 AI 调用：

```
WorkflowModule.analyzeChange(chapterId):
  1. 提取 ChangeFingerprint + ImpactPropagation（合并调用）  → V3
  2. DB 查询匹配 ChapterFingerprint 定位受影响章节
  3. UI 展示受影响章节列表（按严重程度 HIGH/MEDIUM/LOW/NONE）
  4. 用户逐章选择：TargetedFix（差异对比视图，确认后替换） / 跳过 / DEFERRED
```

**触发阈值——实质性变更检测**（前端执行，关闭编辑器时）：

| 差异类型 | 检测方式 | 行为 |
|---------|---------|------|
| 无变更 | 内容完全一致 | 跳过一切处理 |
| 仅空白变更 | trim 后一致 | 跳过 ChangeAnalysis，不更新任何状态 |
| 微小变更 | Levenshtein 距离 < 50 字符，且无段落新增/删除 | 跳过 ChangeAnalysis，但更新 Chapter.content（不触发状态变更） |
| 实质性变更 | 以上都不满足 | 触发完整 ChangeAnalysis 管道 |

- 段落新增/删除的判定：变更前后的段落数不一致，或任意段落内容差异 > 100 字符
- 跳过 ChangeAnalysis 时，Chapter 保持当前状态不变（COMPLETED 仍为 COMPLETED）
- 实质性变更触发时，被修改 Chapter 状态回退到 DRAFT——对已确认内容的实质性修改应重新进入生成→审核→确认管道
- DRAFT 状态下的 Chapter 不触发 ChangeAnalysis——仅适用于已确认（COMPLETED / DISPUTED）章节的修改

**ChangeAnalysis 结果持久化**——嵌入源 Chapter 文档：

```typescript
// Chapter.changeAnalysis
{
  changeAnalysis?: {
    lastAnalyzedAt: Date;           // 最近一次分析时间
    sourceChangeFingerprint: string; // 本次变更指纹（约 100 tokens）
    impactedChapters: Array<{
      chapterId: ObjectId;
      chapterNumber: number;
      severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
      reason: string;               // 一句话冲突描述
      status: 'PENDING' | 'FIXED' | 'SKIPPED' | 'DEFERRED';
    }>;
  }
}
```

**受影响章节处理规则**：

- HIGH severity：推荐 TargetedFix，备选跳过（标记 SKIPPED + 记录跳过时间），不可 DEFERRED（必须当场决策）
- MEDIUM severity：推荐 TargetedFix，可 DEFERRED（下次打开任意已确认章节编辑器并关闭时重新提醒）
- LOW severity：推荐跳过，可 TargetedFix，可 DEFERRED
- NONE：不展示在列表中（过滤掉）

**TargetedFix**：AI 生成修补内容 → 差异对比视图（类似 git diff）→ 用户审查 → 确认后应用。修补后 Chapter 保持原状态不变（COMPLETED 仍为 COMPLETED，无需重新审核——修补仅修复不一致部分）。修补记录写入 targetedFixHistory。

**陈旧分析清除**：源 Chapter 再次修改并重新生成 ChangeAnalysis 时，旧记录被覆盖。旧记录中 DEFERRED 但未处理的条目：新分析中仍存在 → 合并 severity（取较高者）；不存在 → 丢弃。受影响 Chapter 被重新生成时，从所有源 Chapter 的 impactedChapters 中移除。

### 审核结论的完整用户决策路径

```
生成正文 → 合规审核 → 四档结论

PASS:
  → Chapter 自动变为 COMPLETED（无需用户操作）

PASS_WITH_SUGGESTIONS:
  → 用户两个选择：
    a) 一键采纳某条建议 → AI 改写受影响段落 → 重新审核（回到审核入口）
    b) 忽略建议并确认 → Chapter 变为 COMPLETED，建议记录保留在 reviewResult 中

NEEDS_REVISION:
  → 用户三个选择：
    a) 一键采纳建议 → AI 改写段落 → 重新审核
    b) 手动修改正文 → 关闭编辑器 → ChangeAnalysis → 重新生成 → 重新审核
    c) 上诉 → ReviewAppeal

BLOCKED:
  → 用户两个选择：
    a) 手动修改正文后重新生成 → 重新审核（不能一键采纳，零容忍红线需人工判断）
    b) 上诉 → ReviewAppeal
```

**ReviewAppeal 二次审核后的收敛规则**：

| 原始结论 | 二次审核降级为 | 处理 |
|---------|-------------|------|
| BLOCKED | PASS / PASS_WITH_SUGGESTIONS / NEEDS_REVISION | 按降级后结论处理 |
| BLOCKED | 维持 BLOCKED | 用户可选：再次修改正文 或 强制标记 DISPUTED |
| NEEDS_REVISION | PASS / PASS_WITH_SUGGESTIONS | 按降级后结论处理 |
| NEEDS_REVISION | 维持 NEEDS_REVISION | 用户可选：再次修改 或 强制标记 DISPUTED |

- DISPUTED = 用户签字但保留意见。Chapter 标记 DISPUTED，下一章解锁。审核记录完整保留
- 强制 DISPUTED 前 UI 弹出二次确认："你将自行承担合规风险，确认继续？"
- 上诉仅一次机会——防止上诉→驳回→上诉死循环

### API 契约（核心端点）

**`POST /projects/:id/steps/idea/confirm`**

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

**`GET /ai/generate`**（SSE 流式，NestJS `@Sse()`）

通用 AI 生成端点，按 TaskType 路由到对应模型并通过 SSE 逐 token 推送：

```
// Query params: ?taskType=CHAPTER_GENERATION&prompt=写一个章节开头&maxTokens=3000&temperature=0.7

// Response: SSE stream (text/event-stream)
// event: message
// data: {"content":"第一幕","done":false}
// data: {"content":"：建置\n开场...","done":false}
// data: {"content":"","done":true,"modelUsed":"deepseek-chat-v3","degraded":false}
```

降级时 SSE 末 chunk 含 `degraded:true` 标记；双模型均不可用时按 TaskType 差异化终端行为（正文→Error 阻塞 / 审核→`failed:true` 优雅完成 / 指纹提取→`failed:true` 跳过）。

**`GET /ai/stream/:taskId`**

流式任务状态查询：

```json
// Response
{ "taskId": "task-123", "status": "completed", "progress": 100 }
```

### 数据模型（核心实体）

**Project**: id, title, status (enum: IDEA/SETTING/OUTLINE/BEATS/DRAFTING/COMPLETED/ARCHIVED), currentPhase, config (style, platform, genre, defaultChapterWordCount), pendingFactUpdates (补偿队列), statusHistory (里程碑变更记录), createdAt, updatedAt。ARCHIVED（归档）：从仪表盘列表中隐藏但保留全部数据，可随时恢复为 DRAFTING 继续创作。仅 DRAFTING 和 COMPLETED 状态的项目可归档。

**StepData**: projectId, phaseType (enum: IDEA/SETTING/OUTLINE/BEATS/DRAFTING), status (enum: PENDING/IN_PROGRESS/CONFIRMED/REJECTED), input (用户输入), output (AI 输出), review (审核结果), version (历史版本), confirmedAt

**Beat**: projectId, chapterNumber, plan (冲突点、钩子预设、读者期待值), targetWordCount, hookCount (AI 提取的钩子计数), isClimax (用户手动标记，默认 false), useR1 (计算字段：结构位置 || hookCount ≥ 3 || isClimax), status, createdAt, updatedAt
> BEATS Phase 的输出单元，独立 MongoDB 文档（ADR-0001）。每个 Beat 展开为一个 Chapter。BEATS 确认时批量写入 Beat 文档 + 创建对应空壳 Chapter。targetWordCount 继承自 Project.defaultChapterWordCount，用户可逐条覆盖。useR1 在 BEATS 确认时批量计算并固化。

**Chapter**: projectId, chapterNumber, title, beatPlan (关联 Beat 的 plan 快照), targetWordCount (继承自 Beat), content (正文), status (enum: PENDING/DRAFT/REVIEWING/COMPLETED/DISPUTED), reviewResult, chapterFingerprint, contextSummary (正文 > 2500 tokens 时自动生成的结构化摘要), changeAnalysis (变更分析结果嵌入子文档), targetedFixHistory (修补记录数组), createdAt, updatedAt
> DRAFTING Phase 的独立写作单元，独立 MongoDB 文档（ADR-0001）。BEATS 确认时批量创建空壳 Chapter，DRAFTING 阶段逐个填充。status 枚举不含 PUBLISHED——发布功能不在当前范围内；若后续引入，应新增独立的 publishStatus 字段。

**FactSheet**: projectId, entries (角色状态、地点描述、时间线事件、关键物件等确切事实), version (乐观锁版本号), updatedAt
> 项目级汇聚文件，独立 MongoDB 文档。每章生成/修改后 AI 增量更新，生成新章时按关键词检索注入相关条目到 Prompt。并发更新通过 version 字段乐观锁防护。

### 状态机设计

**Project 级别**（Phase 流转）：

整体小说状态流转：`IDEA → SETTING → OUTLINE → BEATS → DRAFTING → COMPLETED`

每个步骤确认后才能进入下一步。

**三档变更机制**：

| 操作 | 触发 | 影响范围 | Project.status |
|------|------|---------|----------------|
| BEATS 轻量修改（仅改字数） | 在 Beat 编辑器中修改 targetWordCount | 该 Beat 标记 STALE，AI 重平衡前后 Beat 字数配额（纯数值微调）。邻居 Beat 不标记 STALE。对应 Chapter 仅更新 targetWordCount | 保持 DRAFTING |
| BEATS 轻量修改（改结构内容） | 用户显式点击"重新生成该 Beat"或编辑核心字段 | 该 Beat + 对应 Chapter 标记 STALE。上下游 Beat 不受影响 | 保持 DRAFTING |
| 跨 Phase 回退 | 用户正式"回退到 BEATS/OUTLINE/SETTING" | 下游全部 Phase 标记 STALE | 回退到该 Phase |

- BEATS 轻量修改（两档）均不触发跨 Phase 回退——这是高频轻量操作，强制级联 STALE 会让用户不敢做任何调整
- "仅改字数"和"改结构内容"的区分基于影响深度——前者是数值参数，后者是叙事结构
- 跨 Phase 回退后 regenerate 产生不同结构（如大纲从 30 章变为 40 章）时：旧 Beat/Chapter 文档保留为 STALE（不自动删除），重建新文档并更新 Project.beatRefs 和 Project.chapterRefs

**Chapter 级别**（单章状态机）：

```
PENDING → DRAFT（AI 生成中）→ REVIEWING（审核中）→ COMPLETED（用户确认）或 DISPUTED（用户上诉后保留意见）
```

- Chapter 生成触发：手动触发 + 顺序锁——第 N 章 COMPLETED 或 DISPUTED 后，第 N+1 章"生成"按钮才可用
- Chapter 回退：用户手动修改 COMPLETED 章节 → 关闭编辑器 → 实质性变更检测通过 → ChangeAnalysis 触发 → 被修改 Chapter 回退到 DRAFT
- DRAFT 状态下的 Chapter（生成中或暂停中）不触发 ChangeAnalysis

**Phase 内部 Step 状态机**（Project 级别确认流）：

```
PENDING → IN_PROGRESS（用户开始输入/触发AI）
→ AI_GENERATING（AI 返回中）
→ AWAITING_REVIEW（AI 完成，等待审核）
→ REVIEWING（审核中）
→ CONFIRMED（用户确认）或 REJECTED（用户驳回，回到 PENDING）
```

所有 Phase 均支持 SSE 流式输出。

**DRAFTING → COMPLETED 显式确认**：

- 所有 Chapter.status ∈ {COMPLETED, DISPUTED} 时，UI 醒目展示"完本提示"横幅
- Project 状态不自动改变——用户必须显式点击"确认完本"
- 用户可选择忽略提示继续编辑（如修改已确认章节、添加新章节等）
- 用户也可通过 BEATS Phase 增加新 Beat（从而增加新 Chapter），DRAFTING 自动延续
- 完结前检查：Project.pendingFactUpdates 队列若非空 → 展示三个选项："立即同步并完本""跳过并完本""取消"
- COMPLETED 后所有内容只读，提供"继续创作"按钮 → Project 退回 DRAFTING
- COMPLETED 状态保留在 Project 的 statusHistory 中作为里程碑记录

### 合规审核规则引擎（内置"资深编辑"Prompt）

基于调研结果，AI "资深编辑"将内置以下审核维度：

1. **政治安全**：检测隐喻、影射、历史虚无主义等敏感表达
2. **色情尺度**：按平台标准检测过度亲密描写、性暗示、擦边内容。晋江标准最为严格（"脖子以下不能写"）
3. **暴力渲染**：检测极端暴力、酷刑、残忍杀害的细节描写
4. **价值观**：检测暗黑价值观、违法美化、反社会倾向
5. **市场匹配**：基于起点/晋江/番茄的当前热门类型，评估作品的商业潜力

每个维度输出 1-10 评分 + 具体违规位置 + 修改建议。

**分层审核策略**（ADR-0003）：IDEA/SETTING 使用内嵌审核（创作 Prompt 包含审核指令，一次调用）；OUTLINE/BEATS 内嵌为主，用户可手动触发独立审核；DRAFTING 每章强制执行独立的"资深编辑 AI"审核（二次调用）。内嵌审核的评分精度低于独立审核——IDEA/SETTING 的审核结果标注"[内嵌审核，仅供参考]"。

### 模型路由策略

AI 调用类型与模型分配通过代码中的 `TaskType → ModelName` 集中映射（不放在 Prompt 模板文件中，便于审计和测试）：

| TaskType | 模型 | 理由 |
|----------|------|------|
| 前期 Phase 生成（IDEA/SETTING/OUTLINE/BEATS） | DeepSeek-R1 | 调用频率低但影响全书质量；IDEA/SETTING 的内嵌审核随创作 Prompt 同模型执行 |
| 正文生成（普通章节） | DeepSeek-V3 | 高频调用，成本敏感，V3 中文创作质量足够 |
| 正文生成（关键章节） | DeepSeek-R1 | 开篇/高潮/结局等，推理能力要求高 |
| 正文改写/润色 | DeepSeek-V3 | 局部修改，不需要强推理 |
| 合规审核（独立） | DeepSeek-V3 | DRAFTING 每章强制执行，结构化输出稳定，批量审核成本可控 |
| 指纹/FactSheet 提取 | DeepSeek-V3 | 极高频率，轻量结构化任务 |
| ChangeFingerprint + ImpactPropagation（变更分析） | DeepSeek-V3 | 轻量匹配任务，与指纹提取同类 |

OpenRouter 保留用于未来跨供应商灵活性，当前仅路由到 DeepSeek。

### 关键章节双重判定标准（ADR-0007）

取消 PRD 和 ADR-0003 之间的模糊定义，统一为双重判定——满足任一条件即使用 R1：

| 判定维度 | 条件 | 判定方式 |
|---------|------|---------|
| 结构位置 | 开篇（第 1-3 章）或结局（最后 3 章） | 自动判定（BEATS 确认时计算） |
| 钩子密度 | Beat.hookCount ≥ 3 | 自动判定（BEATS 生成时 AI 提取） |
| 高潮标记 | Beat.isClimax = true | 用户手动标记（BEATS Phase 中每条 Beat 提供一个勾选框） |

- `useR1` 在 BEATS 确认时批量计算并固化到 Beat 文档中
- `isClimax` 是领域属性标记（用户对叙事重要性的标注），非模型选择的直接覆盖开关——它与其他判定维度平等参与 `useR1` 的布尔计算
- DRAFTING 阶段生成 Chapter 时读取 Beat.useR1 决定模型

### Prompt 模板管理

所有 AI Prompt 模板存放在独立 `.md` 文件中，目录结构：

```
prompts/
├── creation/       # IDEA/SETTING/OUTLINE/BEATS 生成
├── drafting/       # 正文生成、改写、润色
├── review/         # 内嵌审核、独立审核
├── extraction/     # 指纹提取、事实簿更新
└── system/         # 创作风格配置
```

每个文件包含模板变量占位符，由 LangChain `PromptTemplate` 加载后渲染。Prompt 模板与模型路由解耦——改 Prompt 不影响模型选择，反之亦然。

### 上下文注入策略

每章正文生成时，AI Prompt 注入的上下文窗口分三层，每层独立硬上限，总预算 ≤8000 tokens。超限时按优先级裁剪。

**第一层：全局静态（上限 ≤3000 tokens）** — 来自 SETTING Phase，按优先级裁剪：
1. 核心角色卡摘要（主角 + 反派 + 关键配角，每人 ≤400 tokens）
2. 世界观核心摘要（≤800 tokens）
3. 力量/战斗体系约束（≤400 tokens）
4. 完整角色关系图（≤600 tokens）
5. 完整世界观描述（填充剩余空间）

裁剪规则：按优先级从低到高移除，直到 ≤3000 tokens。

**第二层：全局动态（上限 ≤2000 tokens）** — 来自 FactSheet 按关键词检索：
- 按关键词匹配度降序排列，取前 N 条直至累计 token 数 ≤2000
- 单条条目上限 300 tokens（超长条目由 AI 在 BEATS 确认后初始化时压缩）

**第三层：局部上下文（上限 ≤3000 tokens）** — 来自 BEATS + 上下文衔接：
- 当前 Beat（完整注入，上限 500 tokens）
- 上下文衔接：前一章正文 ≤2500 tokens → 完整注入；> 2500 tokens → AI 生成约 400 tokens 的结构化摘要（出场角色、关键事件、情感转折）替代全文
- 第 1 章特殊处理：IDEA Phase 的"一句话简介"和"500 字简介"替代"前一章"，总上限 800 tokens

**总预算控制**：三层各自独立上限后再合计——超 8000 tokens 时从第三层开始进一步压缩，再到第二层，第一层最后。

**Token 计数**：使用 DeepSeek tokenizer（通过 OpenRouter API），在注入前做预计算。

**FactSheet 初始种子**：BEATS 确认后、第 1 章生成前，从 SETTING Phase 的角色卡和世界观中提取 FactSheet 初始条目，确保首章生成时全局动态层已有内容可检索注入。

### AI 调用容错策略

**SSE 流式持久化**：
- 正文生成时每 token 追加写入 Chapter.content（而非内存累积），刷新页面或断流后已生成内容不丢失
- 所有五个 Phase 均通过 `POST /ai/generate` 端点支持 SSE 流式输出

**自动重试 + 断点续传**：
- 流式生成中断时：已生成内容 ≥ 60% 目标字数 → 回传全部已生成内容续写；< 60% → 丢弃重试
- 非流式调用失败：最多自动重试 3 次，指数退避
- FactSheet 乐观锁写冲突：自动重读 → 重提 → 重写一次，仍失败则将本次更新条目写入 Project.pendingFactUpdates 补偿队列（管道不中断），下次任意 Chapter 成功更新 FactSheet 时批量消费合并（去重 + 冲突裁决）。队列深度 ≥ 5 → 下次 AI 调用 Prompt 增加优先级标记；≥ 10 → UI 告警横幅；≥ 50 → 拒绝入队并强制触发同步

**模型降级——单向降级 + 最终用户阻塞**（ADR-0007）：

```
调用 DeepSeek-V3 的任务:
  失败 → 自动降级到 DeepSeek-R1
  R1 也失败 → 根据 TaskType 决定:
    - 正文生成/改写/润色: 暂停，通知用户"AI 服务暂时不可用，请稍后重试"
    - 合规审核: 暂停，Chapter 保持在 REVIEWING 状态，不自动通过
    - 指纹/FactSheet 提取: 跳过本次更新，记录到 pendingFactUpdates

调用 DeepSeek-R1 的任务:
  失败 → 自动降级到 DeepSeek-V3
  V3 也失败 → 同上处理
```

- 不循环降级：V3→R1→阻塞，R1→V3→阻塞。终点始终是用户可见的暂停
- 降级事件记录日志（含 taskType、原模型、降级模型、失败原因、时间戳）
- 前端展示当前模型名称，降级时展示黄色 Badge"已降级至 R1/V3"
- 两个模型同时不可用时：弹 Modal 告知用户，提供"手动重试"按钮，不自动轮询

**审核结论自动处理**：
- PASS → 自动确认，Chapter → COMPLETED（无需用户额外操作）
- PASS_WITH_SUGGESTIONS / NEEDS_REVISION / BLOCKED → 等待用户决策（详见审核决策路径章节）
- ReviewAppeal 后仍不满意 → DISPUTED，流程继续，下一章可生成

**用户主动暂停/继续**：
- 暂停时 SSE 关闭，已生成内容保留在编辑器
- 用户可手动编辑已生成内容后点击继续——回传用户编辑后的版本，AI 从末尾续写
- 重试时完整重新生成（管道全部五步重跑），用户反馈临时追加到 Prompt（仅本次生效）

## Testing Decisions

### 测试策略

- **ChangeAnalysisService 单元测试**：Mock AIGateway 和 DB，测试实质性变更检测的三种分支（跳过/微小变更/触发）、受影响章节 severity 分级、DEFERRED 提醒逻辑、陈旧分析清除
- **ContextBudgetService 单元测试**：纯函数——测试三层裁剪算法的边界条件（恰好 ≤ 上限、超 10 tokens、超 1000 tokens），测试优先级裁剪顺序
- **FactSheetCompensationService 单元测试**：Mock DB——测试入队/批量消费/去重/队列深度告警阈值
- **WorkflowModule 状态机测试**：测试 BEATS 轻量修改（改字数 vs 改结构）的 STALE 传播差异、confirmCompletion → reopenProject 往返、跨 Phase 回退 vs Phase 内部修改的区分、所有合法转换路径和非法路径被拒绝的情况
- **ReviewModule 行为测试**：Mock AI 审核返回——测试四种 verdict 的 getAvailableActions 输出、上诉后降级路径、上诉后维持→强制 DISPUTED 路径、BLOCKED 不可一键采纳
- **AIGatewayModule 降级测试**：Mock OpenRouter 返回错误——验证单向降级链、两个模型都失败时根据 TaskType 采取对应处理（正文阻塞 / 审核保持 REVIEWING / 指纹跳过）
- **AI Mock 测试**：Mock OpenRouter API 返回，验证 LangChain ChatModel 调用正确、SSE 流解析正确、断点续传逻辑正确
- **审核规则测试**：准备已知合规/违规文本样本，验证"资深编辑"Prompt 能正确识别各类红线内容
- **前端组件测试**：测试 Pinia store 状态正确性、ReviewPanel 根据 verdict 动态渲染按钮组、StepDrafting 编辑器关闭 diff 检测逻辑、WorkflowStepper 完本横幅与只读模式

### 测试原则

- 只测试外部行为（公共接口），不测试实现细节
- 每个垂直切片（用户故事）至少一个端到端测试
- ChangeAnalysis / ContextBudget / FactSheetCompensation 三个新模块追求 ≥ 90% 分支覆盖率
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
- Token 计数的精确 tokenizer 集成（初始版本可基于字符数估算，后续接入 DeepSeek tokenizer API）
- contextSummary 生成的 Prompt 模板精细调优（初始版本用通用摘要 Prompt）
- 多语言上下文裁剪（当前仅支持中文）
- pendingFactUpdates 独立集合存储（当前沿用 Project 嵌入文档，后续可视队列增长情况独立化）

## Further Notes

### 依赖的外部服务

| 服务 | 用途 | 备注 |
|------|------|------|
| OpenRouter API | AI 模型网关，当前路由至 DeepSeek 生态（V3+R1），保留未来跨供应商灵活性 | 通过 LangChain 的 @langchain/openrouter ChatModel 薄层集成 |
| Context7 | 开发阶段获取最新 API 文档 | 确保 API 调用方式与最新版本一致 |
| DeepSeek API | 核心 AI 生成能力（V3 批量任务、R1 关键任务） | 通过 OpenRouter 网关调用，不直连 |

### 模块开发依赖关系

- 三个新 Service（ChangeAnalysis / ContextBudget / FactSheetCompensation）可并行开发，不互相依赖
- WorkflowModule 的 BEATS 轻量修改依赖 Beat schema 新增 hookCount/isClimax/useR1 字段
- ReviewPanel 前端变更依赖 ReviewModule 新增 getAvailableActions/appealReview 接口
- StepDrafting 的 diff 检测依赖 ChangeAnalysisService 的触发逻辑——但前端 diff 计算是独立纯函数，可先行开发

### 向后兼容

- Chapter.status 不含 PUBLISHED 枚举值（如 schema 定义或已有代码引用需排除/清理）
- FactSheet 更新逻辑从"跳过"改为"入队"——需迁移既有 Project 文档（如 pendingFactUpdates 字段缺失则初始化为空数组）
- 模型降级从循环改为单向——AIGatewayModule 的降级逻辑需重构，但对外接口（`POST /ai/generate`）不变

### 已知风险

1. **Token 成本控制**：长篇小说单次可能消耗百万级 token，通过三层上下文注入策略（全局静态缓存 + 动态按需检索 + 局部前一章）将单章生成控制在 5-8K tokens 输入，千章规模可控
2. **流式中断恢复**：已通过 ≥60% 阈值断点续传 + 最多 3 次重试策略解决，详见 AI 调用容错策略章节
3. **MongoDB 文档大小**：Chapter 采用独立文档存储（ADR-0001），Project 文档不随章节增长。Beat 为轻量文档（每条约 1-2KB）。pendingFactUpdates 嵌入 Project 文档——单条 ≤ 2KB，队列深度上限 50（超限拒绝入队并强制触发同步）
4. **AI 审核准确性**：AI 审核无法 100% 替代人工审核，需明确免责声明
5. **前端 diff 计算性能**：章节正文可能上万字，Levenshtein 距离 O(n²)。优化策略：先用行级 diff（快速路径），仅当行级变更时再计算字符级 Levenshtein
6. **contextSummary 质量**：AI 摘要可能遗漏关键情节节点。缓解：摘要 Prompt 要求按"出场角色、关键事件、情感转折"三个维度生成结构化摘要

### 设计原则

- 采用"现代书卷风"配色：暖米色背景 + 深棕色文字 + 金色点缀
- Canvas 粒子动画：飘落的文字粒子或墨点，营造创作氛围
- 界面强调"健康、专业、积极"：避免暗黑模式，使用柔和色调
- 每个步骤面板带有明确的进度指示和状态徽章
