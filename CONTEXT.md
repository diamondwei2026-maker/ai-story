# NovelCraft Pro — 领域术语表

> 此文件为项目统一词汇表。不含实现细节、不含技术选型——只定义"这个词在业务中代表什么"。

## 创作生命周期

| 术语 | 定义 |
|------|------|
| **Project（小说项目）** | 用户创建的一本小说的完整创作容器，包含所有 Phase、Chapter 和审核记录。Project 状态：IDEA → SETTING → OUTLINE → BEATS → DRAFTING → COMPLETED，可从 DRAFTING/COMPLETED 归档（ARCHIVED）。 |
| **Phase（创作阶段）** | 用户视角的 5 个顶层进度节点，顺序固定，不可跳过。五个 Phase：IDEA（灵感提取）、SETTING（设定集）、OUTLINE（剧情大纲）、BEATS（细纲拆解）、DRAFTING（正文迭代）。 |
| **归档（Archive）** | 将不再活跃创作的小说项目从仪表盘隐藏的操作。归档保留全部数据（Phase、Beat、Chapter、FactSheet），可随时恢复为 DRAFTING 继续创作。仅 DRAFTING 或 COMPLETED 状态的项目可归档。 |
| **Step（阶段内步骤）** | 单个 Phase 内部的子状态流转，表示用户在特定 Phase 中所处的操作环节。Step 状态机：PENDING → IN_PROGRESS（用户开始输入/触发 AI）→ AI_GENERATING（AI 返回中）→ AWAITING_REVIEW（AI 完成，等待审核）→ REVIEWING（审核中）→ CONFIRMED（用户确认）/ REJECTED（用户驳回，回到 PENDING）。StepData 为独立 MongoDB 文档，通过 `projectId` 关联 Project，记录每个 Phase 的输入、输出、审核结果和版本历史。 |
| **STALE（过时状态）** | 两层语义：**Phase 级别**——用户回退到上游 Phase 修改内容后，下游已确认 Phase 整体标记 STALE，重新推进时提示"复用旧数据"或"基于新上下文重新生成"。STALE 数据不自动删除。**文档级别**（Beat/Chapter）——单条 Beat 或单章因上游变更而过时，但 status 字段保持原值（STALE 非 Chapter.status 枚举值），用户访问时提示"重新生成"或"保留现有内容"。 |
| **确认（Confirm）** | 用户对当前 Phase 的 AI 输出和审核结果表示认可的动作。确认后 Phase 状态变为 CONFIRMED，允许推进到下一 Phase。 |
| **Beat（细纲节拍）** | BEATS Phase 的输出单元，描述单章的冲突点、钩子预设、读者期待值和目标字数。每个 Beat 在 DRAFTING Phase 展开为一个 Chapter。Beat 决定了后续 Chapter 的结构密度。 |
| **Chapter（章节）** | DRAFTING Phase 内部的独立写作单元，每个 Chapter 由一条 Beat 展开而来。Chapter 状态流转：PENDING（空壳）→ DRAFT（AI 生成中）→ REVIEWING（审核中）→ COMPLETED（确认）/ DISPUTED（上诉后保留意见）。第 N 章 COMPLETED 或 DISPUTED 后，第 N+1 章方可生成。目标字数（targetWordCount）继承自 Beat，用户可在 BEATS 阶段逐章覆盖。Chapter 不包含 PUBLISHED 状态——发布功能不在当前范围内。 |
| **targetWordCount（目标字数）** | 用户对单章的预期字数，分两级：Project.config.defaultChapterWordCount 作为全局默认；Beat 级别可逐条覆盖。BEATS Phase 生成细纲时以此为拆解密度依据，DRAFTING Phase 以此为 AI 生成的内容量目标。 |
| **ChangeAnalysis（变更分析）** | 用户关闭章节编辑器时经"实质性变更检测"通过后自动触发，AI 合并执行 ChangeFingerprint 提取 + ImpactPropagation 影响评估，输出变更要点及对下游章节的影响分级（HIGH/MEDIUM/LOW/NONE）。结果持久化嵌入源 Chapter 的 changeAnalysis 字段。 |
| **ImpactPropagation（影响传导）** | 从被修改章节向后传播的影响标记，按严重程度（HIGH/MEDIUM/LOW/NONE）分级，精确到具体受影响章节。ChangeAnalysis 合并调用中一并完成。 |
| **TargetedFix（针对性修补）** | 对受影响的已生成章节做最小化修改，保留主体结构和优质段落，仅修正不一致部分。输出为差异对比视图，用户审查确认后替换——非直接覆盖。修补后 Chapter 保持原状态不变，修补记录写入 targetedFixHistory 数组。 |
| **ChapterFingerprint（章节指纹）** | 每章生成时 AI 自动提取的极简元数据（出场角色、关键情节节点、世界观元素、情感弧线），约 200 tokens。用于大规模跨章变更时快速匹配受影响章节。管道步骤 2 产出。 |
| **ChangeFingerprint（变更指纹）** | 用户修改已确认章节后 AI 提取的变更特征，与各章的 ChapterFingerprint 做匹配。与 ImpactPropagation 合并在一个 AI 调用中完成。 |
| **FactSheet（事实簿）** | 项目级汇聚文件，存储角色状态、地点描述、时间线事件、关键物件等确切事实。BEATS 确认后从 SETTING Phase 的角色卡和世界观中提取初始条目；每章生成/修改后 AI 自动增量更新；生成新章时按关键词检索注入相关条目到 Prompt。乐观锁写冲突时自动重试一次，仍失败则将条目写入 pendingFactUpdates 补偿队列（而非丢弃），下次成功更新时批量消费合并。 |
| **FactConflict（事实冲突）** | 新生成内容与 FactSheet 已有条目矛盾时触发。判定为剧情演进（更新 FactSheet）或笔误（修正正文）。 |
| **分层审核（Tiered Review）** | 合规审核策略：IDEA/SETTING Phase 采用内嵌自审（创作 Prompt 包含审核指令），OUTLINE/BEATS Phase 内嵌为主可手动触发独立审核，DRAFTING Phase 强制执行独立的"资深编辑 AI"审核。正文阶段成本最高但合规防线不容妥协。 |
| **ReviewVerdict（审核结论）** | 四档结论及完整用户决策路径——PASS：自动确认（Chapter→COMPLETED）。PASS_WITH_SUGGESTIONS：用户可选"一键采纳建议→重新审核"或"忽略并确认→COMPLETED"。NEEDS_REVISION：用户可选"采纳修改→重新审核""手动修改正文→重新生成→重新审核"或"上诉→ReviewAppeal"。BLOCKED：用户可选"手动修改后重新生成→重新审核"（不可一键采纳——零容忍红线需人工判断）或"上诉→ReviewAppeal"。 |
| **ReviewDimension（审核维度）** | 合规安全性一级评分下的四个检查子维度，参见 EvaluationDimension。四个维度：POLITICAL_SAFETY（政治安全）、SEXUAL_CONTENT（色情尺度）、VIOLENCE（暴力渲染）、VALUES（价值观）。每个平台对四个维度的权重和阈值不同，在项目创建时根据目标平台自动配置。 |
| **EvaluationDimension（综合评分维度）** | 每步确认时"资深编辑 AI"给出的综合评分涵盖三个一级维度：市场潜力（1-10 分，含市场匹配度和商业潜力评级）、合规安全性（1-10 分，细分为 ReviewDimension 四个子维度）、逻辑自洽性（1-10 分，含剧情逻辑一致性和设定冲突检查）。 |
| **ReviewIssue（审核问题）** | 审核发现的单个问题，包含：严重程度（LOW/MEDIUM/HIGH/CRITICAL）、精确定位（到句子）、违规规则引用、具体修改建议、AI 是否可自动修复标记。 |
| **ReviewAppeal（审核上诉）** | 用户对 NEEDS_REVISION 或 BLOCKED 审核结果提出异议的机制。系统将原始内容 + 审核结果 + 用户异议理由发送给 AI 做二次审核。二次审核降级（如 BLOCKED→PASS_WITH_SUGGESTIONS）则按降级后结论处理；维持原判则用户可选"再次修改正文"或"强制标记 DISPUTED"。上诉仅一次机会——防止上诉→驳回→上诉死循环。 |
| **GenerationContext（生成上下文）** | 每章正文生成时注入 AI Prompt 的完整信息窗口，分三层硬上限：全局静态（≤3000 tokens，来自 SETTING Phase，超限按优先级裁剪）、全局动态（≤2000 tokens，FactSheet 检索条目按匹配度取前 N 条）、局部上下文（≤3000 tokens，当前 Beat + 上下文衔接）。上下文衔接：第 2 章起为前一章全文（超 2500 tokens 则用 AI 摘要替代），第 1 章用 IDEA Phase 的一句简介和 500 字简介替代。三层各自独立预算，总预算 ≤8000 tokens。 |
| **ContextSummary（章节摘要）** | 当章节正文超过 2500 tokens 时，Chapter 生成管道步骤 5 在审核通过后自动生成的约 400 tokens 结构化摘要（出场角色、关键事件、情感转折），存入 Chapter.contextSummary。用于下一章生成时替代全文注入，控制上下文预算。 |
| **完本确认（Complete）** | DRAFTING Phase 的特殊终点动作。所有 Chapter ∈ {COMPLETED, DISPUTED} 时 UI 展示"完本"提示横幅，但 Project 不自动变为 COMPLETED——用户必须显式点击"确认完本"。COMPLETED 后为只读模式，用户可通过"继续创作"退回 DRAFTING。 |
| **BEATS 轻量修改** | 在已确认的 BEATS Phase 中对单条 Beat 做局部修改，不触发跨 Phase 回退。分两级：仅改字数（targetWordCount）→ 仅该 Beat 标记 STALE，不影响 DRAFTING 下游；改结构内容（冲突点/钩子/POV 等）→ 该 Beat 及对应 Chapter 标记 STALE。若需全局重构 BEATS，应使用正式的"回退到 BEATS"触发跨 Phase 回退。 |
| **ChangeAnalysis 持久化** | ChangeAnalysis 的分析结果（lastAnalyzedAt、ChangeFingerprint、受影响章节列表及处理状态）嵌入源 Chapter 文档的 changeAnalysis 字段。用户刷新页面后结果不丢失，可通过源 Chapter 编辑器的影响分析面板重新查看。 |
| **实质性变更检测** | 关闭编辑器时前端计算编辑内容与 Chapter.content 的差异。仅空白变更或 Levenshtein 距离 < 50 字符且无段落新增/删除 → 跳过 ChangeAnalysis。防止改标点或微调措辞触发完整 AI 管道。 |
| **DEFERRED（延期处理）** | 受影响章节的一种处理状态。MEDIUM/LOW severity 的受影响章节可标记 DEFERRED——下次打开任意已确认章节编辑器并关闭时重新提醒。HIGH severity 不可推迟，必须当场决策。处理状态持久化在源 Chapter 的 changeAnalysis 中。 |
| **targetedFixHistory（修补记录）** | 每个 Chapter 的可选数组字段，记录该章被 TargetedFix 修补的历史。每条包含：修补时间、触发修补的源 Chapter、变更指纹、AI 生成的修补摘要。为每次修补保留完整溯源链。 |
| **pendingFactUpdates（事实簿待处理队列）** | 存储在 Project 文档中的 FactSheet 更新补偿队列。当 FactSheet 乐观锁写冲突两次均失败时，待合并条目入队而非丢失。下次任意 Chapter 成功更新 FactSheet 时批量消费队列（去重 + 冲突裁决）。队列长度 ≥ 10 时 UI 告警。 |
| **关键章节（Critical Chapter）** | 需要 DeepSeek-R1 模型生成的章节，统一通过双重判定——满足任一条件：结构位置（开篇第 1-3 章 / 结局最后 3 章，BEATS 确认时自动计算）、钩子密度（Beat.hookCount ≥ 3，AI 自动提取）、高潮标记（Beat.isClimax = true，用户手动标记）。判定结果固化到 Beat.useR1。 |
| **hookCount（钩子计数）** | Beat 的属性字段，BEATS 生成时 AI 自动提取。计数范围通常 1-5，代表本章内悬念点 + 冲突转折点合计。≥3 的章节被自动识别为关键章节，使用 R1 模型生成正文。 |
| **模型单向降级** | AI 调用失败时的容错策略：V3→R1→阻塞用户，R1→V3→阻塞用户。不循环降级。两个模型同时不可用时弹 Modal 告知用户并提供手动重试按钮，不自动轮询。 |

## Relationships

- 一个 **Project** 包含 5 个顺序 **Phase**
- 一个 **Phase** 包含多个 **Beat**（仅 BEATS Phase）或多个 **Chapter**（仅 DRAFTING Phase）
- 一个 **Beat** 展开为一个 **Chapter**（一对一）
- **Beat** 的 `targetWordCount` 继承自 **Project** 的 `defaultChapterWordCount`，可逐条覆盖
- **BEATS 轻量修改**（已确认 BEATS 内）：仅改字数 → 该 Beat STALE，对应 Chapter 仅更新 targetWordCount；改结构内容 → 该 Beat 及对应 Chapter STALE。均不触发跨 Phase 回退
- 用户正式"回退到 BEATS Phase"（跨 Phase 回退）→ 下游 **DRAFTING** 全部 STALE
- 用户回退修改任意已确认 **Phase** → 下游所有 Phase 标记 **STALE**；Project.status 回退到该 Phase
- 用户修改已确认 **Chapter**（关闭编辑器触发，经实质性变更检测通过）→ **ChangeAnalysis**（持久化到源 Chapter）→ **ImpactPropagation** 影响下游 **Chapter**；Project.status 保持 DRAFTING
- **ChangeFingerprint** 匹配 **ChapterFingerprint** 定位受影响章节（合并为一个 AI 调用）
- **Chapter** 状态流转：PENDING → DRAFT → REVIEWING → COMPLETED / DISPUTED（无 PUBLISHED）
- 第 N 章 ∈ {COMPLETED, DISPUTED} → 第 N+1 章"生成"按钮解锁
- **FactSheet** BEATS 确认后从 SETTING 提取初始种子，每章生成/修改后增量更新
- **FactSheet** 乐观锁冲突时自动重试一次，仍失败 → 条目入队 **pendingFactUpdates**，下次成功更新时批量消费
- **分层审核** PASS → 自动 COMPLETED；PASS_WITH_SUGGESTIONS → 采纳或忽略确认；NEEDS_REVISION → 采纳/手动修改/上诉；BLOCKED → 手动修改/上诉（不可一键采纳）
- **ReviewAppeal** 仅一次机会：降级则按新结论处理；维持原判则用户选"再次修改"或"强制 DISPUTED"。DISPUTED 不阻塞下一章生成
- DRAFTING 所有 Chapter ∈ {COMPLETED, DISPUTED} → UI 展示"完本提示"横幅 → 用户**显式确认** → Project → COMPLETED
- COMPLETED 后只读，用户可通过"继续创作"退回 DRAFTING
- **上下文注入**三层硬上限（静态 ≤3000 / 动态 ≤2000 / 局部 ≤3000 tokens），超限按优先级裁剪。前一章超 2500 tokens 时用 AI 摘要替代全文
- **关键章节**双重判定（结构位置 / hookCount ≥ 3 / isClimax）→ Beat.useR1 = true → DRAFTING 使用 R1 模型
- **模型降级**单向链：V3→R1→阻塞，R1→V3→阻塞。不循环。双模型同时不可用时弹 Modal 用户手动重试

## Example dialogue

> **Dev:** "用户在 BEATS 阶段想把第 5 章的目标字数从 3000 改到 5000，Beat 需要重新生成吗？"
> **Domain expert:** "需要。Beat 的拆解密度取决于 targetWordCount——5000 字的章节需要更多节拍点。修改目标字数后该 Beat 标记为 STALE，用户触发重新生成。同时 AI 会自动重新平衡前后章节的字数配额（如第 4、6 章各减去 1000 字），但仅做数值微调，不改变前后 Beat 的结构内容，因此不会触发邻居 STALE。"
>
> **Dev:** "所以改字数只影响自己的 Beat 内容，邻居只是字数配额变化？"
> **Domain expert:** "对。只有当用户在 DRAFTING 阶段修改已确认的 Chapter 内容时，才会触发 ChangeAnalysis → ImpactPropagation 影响下游章节。"
>
> **Dev:** "如果用户回退到 SETTING 修改了世界观设定呢？"
> **Domain expert:** "那 OUTLINE、BEATS、DRAFTING 全部标记 STALE。这是跨 Phase 回退，不同于 Phase 内部的单章修改。"
>
> **Dev:** "第 3 章的审核结论是 BLOCKED，用户上诉后二次审核还是维持原判，标记了 DISPUTED。用户能生成第 4 章吗？"
> **Domain expert:** "能。DISPUTED 代表用户签字但保留意见——流程继续，第 4 章解锁。如果阻塞在这里，用户就被永远卡在第 3 章了。"
>
> **Dev:** "DRAFTING 已经写到第 10 章了，用户突然回 BEATS 把第 5 章的目标字数从 2000 改到 3000。第 5 章的正文要重新生成吗？"
> **Domain expert:** "不用。仅改字数属于 BEATS 轻量修改——Beat 标记 STALE 重新拆解节拍密度，但已生成的第 5 章正文保留，只是 targetWordCount 更新到 3000。用户下次编辑第 5 章时会提示字数目标已变更，续写或润色时 AI 按新目标输出。如果用户改的是 Beat 的结构内容（比如冲突点全换了），那第 5 章正文标记 STALE 需要重新生成。但无论哪种，都不会让第 6-10 章 STALE——这不是跨 Phase 回退。"
>
> **Dev:** "第 7 章审核结论 PASS_WITH_SUGGESTIONS——有一条建议说'此处节奏可加速'。用户觉得无所谓，想直接确认。可以吗？"
> **Domain expert:** "可以。PASS_WITH_SUGGESTIONS 的建议不阻塞流程，用户有两个按钮：'采纳建议并重新审核'和'忽略并确认'。点后者直接 COMPLETED，建议记录保留供后续参考。但若是 NEEDS_REVISION——有 HIGH 级别问题——就不能直接确认了，必须修改或上诉。"
>
> **Dev:** "用户改了第 5 章的几个标点然后关闭编辑器，会触发 ChangeAnalysis 吗？"
> **Domain expert:** "不会。编辑器关闭时前端做实质性变更检测——标点修改在 trim 后内容一致，属于'仅空白变更'，跳过一切处理。就算用户改了一句话（不到 50 字符差异），只要没新增/删除段落，也跳过 ChangeAnalysis。只有实质性变更才触发完整管道。"
>
> **Dev:** "ChangeAnalysis 触发后用户看到有 3 个下游章节受影响，但用户说'我先不管，明天再处理'——第二天还能看到这个列表吗？"
> **Domain expert:** "能。分析结果已经持久化到源 Chapter 的 changeAnalysis 字段了。第二天用户打开第 5 章的编辑器，影响分析面板还在，各章的处理状态（PENDING/DEFERRED/SKIPPED/FIXED）一目了然。HIGH 的章节当时就逼用户决策了，MEDIUM/LOW 的可以 DEFERRED——下次打开任意章节再提醒。"
>
> **Dev:** "第 100 章的正文有 6000 tokens 那么长，生成第 101 章时上下文怎么处理？"
> **Domain expert:** "第 100 章审核通过后 AI 自动生成约 400 tokens 的摘要存入 contextSummary。第 101 章生成时局部上下文层（上限 3000 tokens）注入第 100 章的摘要而非全文。三层各自有硬上限——全局静态 ≤3000、全局动态 ≤2000、局部上下文 ≤3000——超了就按优先级裁剪，总预算不超 8000 tokens。极端情况三层都满再从局部上下文开始进一步压缩。"
>
> **Dev:** "FactSheet 更新时乐观锁冲突了两次都失败，会影响第 11 章的生成吗？"
> **Domain expert:** "不会阻塞。冲突的条目写入 Project 的 pendingFactUpdates 队列，管道继续。第 12 章生成时 FactSheet 更新成功，会把队列里的待处理条目一起消费合并。如果队列积压超过 10 条，UI 会提醒用户'事实簿同步延迟'。只有两个 AI 模型同时宕机才会阻塞——弹 Modal 让用户手动重试。"
>
> **Dev:** "怎么判断第 20 章算不算关键章节？"
> **Domain expert:** "三重判断任满足一即算：第 20 章在不在开篇（1-3）或结局（最后 3 章）范围内；Beat.hookCount 是否 ≥3（AI 在 BEATS 阶段自动提取的悬念+冲突计数）；用户在 BEATS 阶段有没有手动勾选 isClimax。判定结果固化在 Beat.useR1，DRAFTING 阶段直接读取。第 20 章大概率是普通章节——除非用户特意标了高潮。"
>
> **Dev:** "小说完本了——全部 200 章都 COMPLETED 了。Project 会自动变成 COMPLETED 吗？"
> **Domain expert:** "不会自动变。所有章完成后 UI 顶部展示'完本提示'横幅，但 Project 保持 DRAFTING。用户需要显式点击'确认完本'才行——小说创作是有仪式感的事情，完本应该是作者的有意识决定，不是自动化脚本。用户也可以忽略横幅继续修改、继续加新章。确认完本后内容是只读的，但随时可以点'继续创作'退回 DRAFTING。"

## 实施状态

> 最后更新：2026-05-20

| 模块 | 状态 | 已实现接口 | 备注 |
|------|------|-----------|------|
| ProjectModule | 部分完成 | `POST /projects`（含 title 校验，创建后返回 Project，status 初始为 IDEA） | 当前使用内存 Map 存储，待后续迭代接入 PrismaService |
| PrismaModule | 已完成 (#4) | PrismaService（含 `$connect`/`$disconnect` 生命周期钩子） | `@Global()` 全局模块，供所有业务模块注入使用 |
| Prisma Schema | 已完成 (#4) | 5 个 Collection：`Project` / `StepData` / `Beat` / `Chapter` / `FactSheet`；7 个枚举；1 个嵌入类型 `TargetedFixEntry` | Prisma 6.19.3 + MongoDB（replica set 模式，`:27018`），Schema 文件位于 `server/prisma/schema.prisma` |
| 其他后端模块 | 未开始 | — | WorkflowModule / AIGatewayModule / ReviewModule / ChangeAnalysisService / ContextBudgetService / FactSheetCompensationService |
| 前端 | 未开始 | — | 全栈模块待 #0.3 前端基础设施搭建后启动 |
| 测试基础设施 | 已完成 (#4) | 单元测试（`*.spec.ts`, 10 条）+ 集成测试（`prisma.integration-spec.ts`, 5 条 MongoDB CRUD）+ e2e（`project.e2e-spec.ts`, 3 条） | TDD 红→绿→重构四轮完成，总计 18 条测试 |

**技术栈已落地：**
- 后端：NestJS 11 + TypeScript 5
- ORM：Prisma 6.19.3 + MongoDB（replica set `rs0` on `127.0.0.1:27018`）
- 测试：Jest 30 + supertest
- 运行时：Node.js 22.16
