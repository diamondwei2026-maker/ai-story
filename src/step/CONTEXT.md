# Step Context

创作管道的核心领域逻辑。管理 Phase 流转、Chapter 生命周期、审核、FactSheet、ChangeAnalysis 和 Project 完结。

## 核心概念

### PhaseType

```
IDEA → SETTING → OUTLINE → BEATS → DRAFTING
```

每个 Phase 经过 AI 生成 → 用户确认 → 进入下一 Phase。

### ChapterStatus

```
PENDING → DRAFT → REVIEWING → COMPLETED
                            → DISPUTED
```

- **PENDING**: 已创建但未开始生成
- **DRAFT**: 正在生成或已暂停
- **REVIEWING**: 正文生成完成，审核中
- **COMPLETED**: 用户确认通过
- **DISPUTED**: 用户强制标记争议（签字但保留意见）

### ReviewVerdict

```
PASS → 自动 COMPLETED
PASS_WITH_SUGGESTIONS → 采纳/忽略 → COMPLETED
NEEDS_REVISION → 采纳/手动修改/上诉 → 重新审核
BLOCKED → 手动修改/上诉 → 重新审核
```

上诉只给一次机会。二次审核维持 BLOCKED/NEEDS_REVISION → 可强制 DISPUTED。

### 章节顺序锁

第 N 章生成前，第 N-1 章必须为 COMPLETED 或 DISPUTED。

## 已实现功能

### Phase 管理 (`step.service.ts`)

- **灵感提取 (IDEA)**: `generateIdea()` → `confirmIdea()` / `rejectIdea()`
- **设定集 (SETTING)**: `generateSetting()` → `confirmSetting()` / `rejectSetting()`
- **剧情大纲 (OUTLINE)**: `generateOutline()` → `confirmOutline()` / `rejectOutline()`；`switchStructure()` 切换大纲格式
- **细纲拆解 (BEATS)**: `generateBeats()` → `confirmBeats()` / `rejectBeats()`；`updateBeatWordCount()` / `updateBeatStructure()` 轻量修改
  - `updateBeatWordCount()` — 仅改字数：该 Beat 标记 STALE，AI 重平衡前后 Beat 字数配额。邻居 Beat 不标 STALE，已生成 Chapter 不标 STALE（仅更新 targetWordCount）
  - `updateBeatStructure()` — 改结构内容（冲突点/钩子/POV）：该 Beat 标记 STALE，对应 Chapter（如已生成）标记 STALE。上下游 Beat 不受影响
  - 两种修改均不触发跨 Phase 回退（Project.status 保持 DRAFTING）
  - `shouldUseR1()` — 关键章节双重判定（ADR-0007 Decision 3）：结构位置（开篇 1-3 章 / 结局最后 3 章）|| hookCount ≥ 3 || isClimax → 满足任一即标记 `useR1`。在 `confirmBeats()` 中批量计算并固化到 Beat 文档
  - `resolveChapterTaskType()` — 生成管道读取 `Beat.useR1` 路由模型：useR1=true → `CRITICAL_CHAPTER`（deepseek-r1），false → `CHAPTER_GENERATION`（deepseek-v3）。`generateChapter()` 和 `continueChapterGeneration()` 均应用此路由
- **正文迭代 (DRAFTING)**: `generateChapter()` → `confirmChapter()` / `disputeChapter()`；支持三种模式（new-continue / paragraph-rewrite / style-upgrade）

### Chapter 生命周期

- `generateChapter()` — 流式生成 + 后处理管道（指纹提取 → FactSheet 更新 → ChangeAnalysis → 审核）
- `pauseChapterGeneration()` / `continueChapterGeneration()` — 暂停/继续
- `retryChapterGeneration()` — 重试
- `confirmChapter()` → COMPLETED
- `disputeChapter()` → DISPUTED

### 审核决策路径 (`review.service.ts`)

- 四档结论（PASS / PASS_WITH_SUGGESTIONS / NEEDS_REVISION / BLOCKED）
- `evaluateChapter()` — 自动审核
- `appealReview()` — 上诉（仅一次）
- `forceDisputeChapter()` — 强制标记 DISPUTED（需完成上诉流程）
- `getAvailableActions()` / `getActionsForChapter()` — 决策路径查询

### FactSheet 补偿队列 (`factsheet-compensation.service.ts`)

- `enqueue()` — 入队（乐观锁冲突两次失败后）
- `getQueueDepth()` — 队列深度
- `getAlertLevel()` — 告警级别（≥50 CRITICAL / ≥10 WARNING / ≥5 PRIORITY / else NORMAL）
- `consumeQueue()` — 消费队列（下次成功更新时自动调用）
- `forceSync()` — 手动强制同步

### ChangeAnalysis 生命周期 (`change-analysis.service.ts`)

- 编辑关闭后触发实质性变更检测（Levenshtein 距离 < 50 字符为微小变更，跳过 ChangeAnalysis）
- 生成 ChangeFingerprint + ImpactPropagation 分析
- 受影响章节按 severity（HIGH/MEDIUM/LOW/NONE）分组
- TargetedFix 执行 + targetedFixHistory 记录
- DEFERRED 条目重新提醒

### Project 完结流程

- `confirmCompletion(projectId, action?)` — 完结确认
  - 验证所有 Chapter ∈ {COMPLETED, DISPUTED}
  - 检查 pendingFactUpdates 队列
  - action 为 `sync-and-complete` → 强制同步后完本
  - action 为 `skip-and-complete` → 保留队列完本
  - 无 action + 队列非空 → 返回三选项
  - 无 action + 队列为空 → 直接完本
- `reopenProject(projectId)` — 继续创作（COMPLETED → DRAFTING）
- `appendMilestone()` — 里程碑记录

### 模型降级与容错 (Issue #19)

- **`callWithFallback(taskType, prompt)`** — AIGatewayService 公开降级方法，单向链 V3→R1→阻塞 / R1→V3→阻塞
- **降级日志**: `getDegradationLogs()` 返回 `DegradationLogEntry[]`（taskType / originalModel / degradedModel / failureReason / timestamp），暂用内存存储
- **扩展阻断分类 (`BLOCKING_TASKS`)**: 生成（CHAPTER_GENERATION / CRITICAL_CHAPTER / CHAPTER_REWRITE / CHAPTER_POLISH）+ 审核（INDEPENDENT_REVIEW）+ 创意（IDEA / SETTING / OUTLINE / BEATS）= 9 种 TaskType 在双模型均失败时 throw；3 种后台任务（FINGERPRINT_EXTRACTION / FACTSHEET_UPDATE / CHANGE_ANALYSIS）skip
- **AI 元数据传播**: `collectAiOutput()` 返回 `{ content, aiMeta }` → `StepData.aiMeta`（含 modelUsed / degraded / failed）→ 前端 API 响应 → `useAiStatus` composable
- **前端组件**: `<AiUnavailableModal />` 双模型不可用弹窗 + `<ModelBadge />` 模型状态指示器

- **三层硬上限**: 全局静态 3000t / 全局动态 2000t / 局部上下文 3000t，总预算 8000t
- **优先级裁剪**: 总预算超限时按 local → globalDynamic → globalStatic 顺序压缩
- **`calculateBudget(gs, gd, local)`** — 三层注入 + 单层硬上限 + 优先级总预算裁剪
- **`computeBudget(projectId, chapterId)`** — 从 Project 数据自动组装三层上下文
- **`generateContextSummary(chapterContent)`** — 长章 AI 摘要生成（>2500t 触发，目标 400t），含出场角色/关键事件/情感转折三维度
- **`trimToBudget(text, maxTokens)`** — 单层裁剪
- **`estimateTokens(text)`** — Token 估算（4 chars/token）
- **`countTokens(text)`** — 精确 Token 计数，委托 `IChatModel.getNumTokens()`（OpenRouter DeepSeek tokenizer），用于 `computeBudgetPrecise()` 预算预计算
- 第 1 章特殊处理：用 IDEA 简介替代前一章
- 前一章优先使用 contextSummary（若有），否则使用全文

### 跨 Phase 回退后 FactSheet 处理

当跨 Phase 回退导致章节数变更（如大纲从 30 章变为 40 章）时：
- 旧章节的 ChapterFingerprint 随文档标记 STALE 后不再参与 ChangeAnalysis 匹配
- 旧 FactSheet 条目保留——它们代表历史有效状态
- 新章节生成后 FactSheet 增量更新自然覆盖或合并旧条目
- 不执行批量清理，以防误删跨结构仍然有效的事实

## 尚未实现（来自 PRD）

（无——所有 PRD 规划的领域功能均已实现）
