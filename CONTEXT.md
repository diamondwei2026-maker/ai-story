# NovelCraft Pro — 领域术语表

> 此文件为项目统一词汇表。不含实现细节、不含技术选型——只定义"这个词在业务中代表什么"。

## 创作生命周期

| 术语 | 定义 |
|------|------|
| **Project（小说项目）** | 用户创建的一本小说的完整创作容器，包含所有 Phase、Chapter 和审核记录。Project 状态：IDEA → SETTING → OUTLINE → BEATS → DRAFTING → COMPLETED，可从 DRAFTING/COMPLETED 归档（ARCHIVED）。 |
| **Phase（创作阶段）** | 用户视角的 5 个顶层进度节点，顺序固定，不可跳过。五个 Phase：IDEA（灵感提取）、SETTING（设定集）、OUTLINE（剧情大纲）、BEATS（细纲拆解）、DRAFTING（正文迭代）。 |
| **归档（Archive）** | 将不再活跃创作的小说项目从仪表盘隐藏的操作。归档保留全部数据（Phase、Beat、Chapter、FactSheet），可随时恢复为 DRAFTING 继续创作。 |
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
| **ReviewAppeal（审核上诉）** | 用户对 NEEDS_REVISION 或 BLOCKED 审核结果提出异议的机制。系统将原始内容 + 审核结果 + 用户异议理由发送给 AI 做二次审核。二次审核降级（如 BLOCKED→PASS_WITH_SUGGESTIONS）则按降级后结论处理；维持原判则用户可选"再次修改正文"或"强制标记争议"。上诉仅一次机会——防止上诉→驳回→上诉死循环。 |
| **GenerationContext（生成上下文）** | 每章正文生成时注入 AI Prompt 的完整信息窗口，分三层硬上限：全局静态（≤3000 tokens，来自 SETTING Phase，超限按优先级裁剪）、全局动态（≤2000 tokens，FactSheet 检索条目按匹配度取前 N 条）、局部上下文（≤3000 tokens，当前 Beat + 上下文衔接）。上下文衔接：第 2 章起为前一章全文（超 2500 tokens 则用 AI 摘要替代），第 1 章用 IDEA Phase 的一句简介和 500 字简介替代。三层各自独立预算，总预算 ≤8000 tokens。 |
| **ContextSummary（章节摘要）** | 当章节正文超过 2500 tokens 时，Chapter 生成管道步骤 5 在审核通过后自动生成的约 400 tokens 结构化摘要（出场角色、关键事件、情感转折），存入 Chapter.contextSummary。用于下一章生成时替代全文注入，控制上下文预算。 |
| **完本确认（Complete）** | DRAFTING Phase 的特殊终点动作。所有 Chapter ∈ {COMPLETED, DISPUTED} 时 UI 展示"完本"提示横幅，但 Project 不自动变为 COMPLETED——用户必须显式点击"确认完本"。COMPLETED 后为只读模式，用户可通过"继续创作"退回 DRAFTING。 |
| **BEATS 轻量修改** | 在已确认的 BEATS Phase 中对单条 Beat 做局部修改，不触发跨 Phase 回退。分两级：仅改字数（targetWordCount）→ 仅该 Beat 标记 STALE，不影响 DRAFTING 下游；改结构内容（冲突点/钩子/POV 等）→ 该 Beat 及对应 Chapter 标记 STALE。若需全局重构 BEATS，应使用正式的"回退到 BEATS"触发跨 Phase 回退。 |
| **ChangeAnalysis 持久化** | ChangeAnalysis 的分析结果（lastAnalyzedAt、ChangeFingerprint、受影响章节列表及处理状态）嵌入源 Chapter 文档的 changeAnalysis 字段。用户刷新页面后结果不丢失，可通过源 Chapter 编辑器的影响分析面板重新查看。 |
| **实质性变更检测** | 关闭编辑器时前端计算编辑内容与 Chapter.content 的差异。仅空白变更或 Levenshtein 距离 < 50 字符且无段落新增/删除 → 跳过 ChangeAnalysis。防止改标点或微调措辞触发完整 AI 管道。 |
| **DEFERRED（延期处理）** | 受影响章节的一种处理状态。MEDIUM/LOW severity 的受影响章节可标记 DEFERRED——下次打开任意已确认章节编辑器并关闭时重新提醒。HIGH severity 不可推迟，必须当场决策。处理状态持久化在源 Chapter 的 changeAnalysis 中。 |
| **targetedFixHistory（修补记录）** | 每个 Chapter 的可选数组字段，记录该章被 TargetedFix 修补的历史。每条包含：修补时间、触发修补的源 Chapter、变更指纹、AI 生成的修补摘要。为每次修补保留完整溯源链。 |
| **pendingFactUpdates（事实簿待处理队列）** | 存储在 Project 文档中的 FactSheet 更新补偿队列。当 FactSheet 乐观锁写冲突两次均失败时，待合并条目入队而非丢失。下次任意 Chapter 成功更新 FactSheet 时批量消费队列（去重 + 冲突裁决）。三级队列深度监控：≥5 → 下次 AI 调用 Prompt 加优先级标记；≥10 → UI 展示告警横幅 + 手动强制同步按钮；≥50 → 拒绝入队并强制触发同步。 |
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
- **ReviewAppeal** 仅一次机会：降级则按新结论处理；维持原判则用户选"再次修改"或"强制标记争议"。争议不阻塞下一章生成
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

> 最后更新：2026-05-29（IDEA Phase 数据职责分离：`generateIdea` → output 仅含卖点方案 + 简介泄露 sanitization；`generateIdeaSummary` → 仅传选中卖点给 AI + 简介存入 `review` JSON 独立字段 + 卖点泄露 sanitization；Prompt 双向加强输出约束；`useIdeaParser` 从 `review` 优先读取简介，output 正则回退兼容旧数据。实机全链路 curl 验证通过）

| 模块 | 状态 | 已实现接口 | 备注 |
|------|------|-----------|------|
| ProjectModule | 已完成 (#7) | `POST /projects`（创建项目，含 title 校验） `GET /projects`（列表，过滤 ARCHIVED） `GET /projects/:id`（详情） `PATCH /projects/:id`（更新标题/配置） `DELETE /projects/:id`（永久删除） `POST /projects/:id/archive`（归档，状态→ARCHIVED） `POST /projects/:id/restore`（恢复归档→DRAFTING，非归档拒绝 400） | 当前使用内存 Map 存储，待后续迭代接入 PrismaService。ProjectStatus 类型已对齐 Prisma Schema 全量枚举 |
| PrismaModule | 已完成 (#4) | PrismaService（含 `$connect`/`$disconnect` 生命周期钩子） | `@Global()` 全局模块，已注册但业务服务尚未注入——当前 ProjectService/StepService 使用内存 Map 存储，待后续迭代接入 |
| Prisma Schema | 已完成 (#4) | 5 个 Collection：`Project` / `StepData` / `Beat` / `Chapter` / `FactSheet`；7 个枚举；1 个嵌入类型 `TargetedFixEntry` | Prisma 6.19.3 + MongoDB（replica set 模式，`:27018`），Schema 文件位于 `server/prisma/schema.prisma` |
| AIGatewayModule | 已完成 (#5) | `GET /ai/generate`（SSE 流式逐 token 推送，TaskType→Model 路由 + 单向降级 V3→R1→阻塞 / R1→V3→阻塞，降级时响应含 modelUsed+degraded 字段）+ `GET /ai/stream/:taskId`（流式状态查询） | TDD 五轮完成 + 2 个 Blocker 修复（SSE 真流式逐 chunk 发射、TaskType 差异化降级终端——正文→Error 阻塞 / 审核→failed 标记优雅完成 / 指纹提取→跳过）。AIGatewayService（12 种 TaskType→Model 路由 + SSE Observable + 降级链防死循环守卫）+ ContextBudgetService（三层裁剪 3000/2000/3000，总预算≤8000 tokens）+ PromptTemplateLoaderService（`prompts/` 目录 5 个分类 .md 模板加载渲染，`{{variable}}` 变量替换） |
| StepModule（SETTING Phase #9） | 已完成 (#9) | `SettingController`（原名 StepController，重命名以对齐路由 `steps/setting`）+ `POST /projects/:id/steps/setting/generate` + `POST /projects/:id/steps/setting/confirm`+ 前端 `SettingView.vue` + `WorldBuilder.vue`（4维度，a-card）+ `CharacterCard.vue`（3角色，a-card + a-tag）+ `RelationGraph.vue`（a-card）+ `useContentParser.ts` composable + 路由 `/project/:id/setting` | TDD 红→绿→重构完成。力量体系红线检查：`runPowerSystemCheck()` 关键词匹配 3 类违规。控制器继承 `PhaseControllerBase` 抽象基类（统一 generate/confirm/reject/GET 路由模式，消除 IdeaController/SettingController/OutlineController/BeatsController 间的 4 份重复样板）。 |
| StepModule（OUTLINE Phase #10） | 已完成 (#10) | `OutlineController`（继承 `PhaseControllerBase`——generate/confirm/reject/GET 统一路由模式，附加 `switch-structure` 端点）。`POST /projects/:id/steps/outline/generate` + `POST /projects/:id/steps/outline/confirm` + `POST /projects/:id/steps/outline/switch-structure` + `GET /projects/:id/steps/outline`。前端 `OutlineView.vue` + `usePhaseWorkflow.ts` composable + 路由 `/project/:id/outline` | TDD 红→绿→重构完成。内嵌审核含节奏/冲突/高潮评估。`api/outline.ts` 使用统一 `StepDataResponse` 类型。 |
| StepModule（BEATS Phase #11） | 已完成 (#11) | `BeatsController`（继承 `PhaseControllerBase`——generate/confirm/reject/GET 统一路由模式）+ `BeatModificationController`（全局 Beat 修改路由）。`POST /projects/:id/steps/beats/generate` + `POST /projects/:id/steps/beats/confirm` + `POST /projects/:id/steps/beats/reject` + `GET /projects/:id/steps/beats` + `PATCH /beats/:id/wordcount` + `PATCH /beats/:id/structure`。前端 `BeatList.vue` + `BeatEditor.vue` + `HookDensityChart.vue` + `useBeatStore.ts`（Pinia store，使用 `createStorePersistence` 工厂 + 共享 `sortByChapter` 工具） | TDD 红→绿→重构完成。两档轻量修改均不触发跨 Phase 回退（ADR-0005 Decision 1）。 |
| StepModule（DRAFTING Phase #12） | 已完成 (#12) | `POST /projects/:id/chapters/:chapterId/generate`（五步管道：SSE流式正文→指纹提取→FactSheet 乐观锁增量更新→独立审核→摘要，含顺序锁）+ `POST /projects/:id/chapters/:chapterId/confirm`/`dispute`/`pause`/`continue`/`retry` + `GET /projects/:id/chapters`。前端 `StreamingEditor.vue` + `ModeSwitcher.vue` + `TextToolbar.vue` + `useChapterStore.ts`（Pinia store，使用 `createStorePersistence` 工厂 + SSE 流式写入 localStorage 300ms 限流） | TDD 红→绿→重构完成。五步管道顺序执行。FactSheet 管线使用 `FactsheetService` CAS 乐观锁。Review 委托 `ReviewService`。 |
| StepModule（Review 审核决策 #13） | 已完成 (#13) | `ReviewService`（独立审核服务，从 StepService 提取 ~200 行审核逻辑——含 `evaluateChapter`/`appealReview`/`getAvailableActions`/`getActionsForChapter`/`forceDisputeChapter` + 5 个私有辅助，通过共享 `chaptersByProject` Map 引用与 StepService 协作）。`evaluateChapter(chapterId)`（独立 AI 四维审核）+ `appealReview(chapterId, reason)`（上诉二次审核，仅一次机会）+ `getAvailableActions(verdict)`（四档判决动作表查询）+ `getActionsForChapter(chapterId)`（章节级便捷封装）+ `forceDisputeChapter(chapterId)`（强制标记争议→解锁下一章）。前端 `ReviewPanel.vue` + `AppealModal.vue` + `DisputeConfirm.vue` | TDD 红→绿→重构完成。后端提取 ReviewService 独立服务消除 StepService God Class。Prompt 模板：`review/independent-review.md`、`review/appeal-review.md`。 |
| StepModule（ChangeAnalysis #14） | 已完成 (#14) | `POST /projects/:id/chapters/:chapterId/analyze-change`（变更分析触发：4-tier 实质性变更检测→无变更/仅空白/微小Δ<50+无段变跳过→实质性变更触发 AI ChangeFingerprint+ImpactPropagation 合并调用，HIGH/MEDIUM/LOW/NONE 分级，HIGH 不可 DEFERRED）+ `POST /projects/:id/chapters/:chapterId/targeted-fix`（定向修补：AI 生成→diff 对比视图→用户确认应用→写入 targetedFixHistory）+ 前端 `ChangeAnalysisPanel.vue`（影响分析面板：按 severity 分 HIGH/MEDIUM/LOW 三组，HIGH 组无推迟按钮，各条目含章节号/原因/状态标签/应用修复/跳过/推迟操作）+ `TargetedFixDiff.vue`（差异对比视图：左源右修双栏布局+确认应用/取消）+ `api/chapter.ts`（analyzeChange/applyTargetedFix API 函数） | TDD 红→绿→重构完成。`ChangeAnalysisService`：`detectChangeType` 4-tier 检测（Levenshtein 两行优化+段落变化检测）+ `analyzeChange` 完整管道（含 DEFERRED 合并：重分析时旧 DEFERRED 条目保留取更高 severity）+ `applyTargetedFix`（AI 生成修补+持久化 targetedFixHistory）+ `getDeferredReminders`（跨章扫描 DEFERRED 条目）。Prompt 模板：`creation/change-analysis.md`、`creation/targeted-fix.md`。后端 45 tests + 前端 37 tests。 |
| StepModule（FactSheet Compensation #15） | 已完成 (#15) | `FactsheetService`（FactSheet 数据管理，从 StepService 提取：`getFactsheet`/`readFactsheet`/`casWriteFactsheet`/`applyCompensationQueue`/`forceSyncFactsheet`——拥有独立 `factSheetByProject` Map 存储）。`FactsheetCompensationService`（5 个方法：`enqueue`/`consumeQueue`/`forceSync`/`getQueueDepth`/`getAlertLevel`，含三级阈值 NORMAL<5/PRIORITY≥5/WARNING≥10/CRITICAL≥50，`enqueue` 满 50 抛 `FactsheetQueueFullError`；`drainQueue` 按 `queuedAt` 排序 + `entryById` Map 去重 + latest-wins 冲突裁决）；`GET /projects/:projectId/factsheet-alert` + `POST /projects/:projectId/factsheet-force-sync`；前端 `WorkflowStepper.vue` 告警横幅（WARNING 黄色 / CRITICAL 红色 + 队列深度显示 + 手动同步按钮） | TDD 红→绿→重构完成。39 后端 service 测试 + 6 controller 测试 + 10 前端组件测试。新增 `PendingFactUpdate` 接口于 `project.entity.ts`。 |
| StepModule（Project Completion #16） | 已完成 (#16) | `confirmCompletion(projectId, action?)`（完结确认：验证所有 Chapter ∈ {COMPLETED, DISPUTED} + 队列检查 + `sync-and-complete`/`skip-and-complete` 三选项）；`reopenProject(projectId)`（继续创作 COMPLETED→DRAFTING）；`appendMilestone()`（里程碑记录） | COMPLETED 后只读，可逆退回 DRAFTING。 |
| StepModule（Context Budget #17） | 已完成 (#17) | `calculateBudget(gs, gd, local)`（三层注入 3000/2000/3000 + 单层硬上限 + 优先级总预算 8000t 裁剪）；`computeBudget(projectId, chapterId)`（从 Project 数据自动组装三层上下文）；`generateContextSummary(chapterContent)`（>2500t 触发 AI 摘要 400t，含出场角色/关键事件/情感转折）；`trimToBudget(text, maxTokens)`（单层裁剪）；`estimateTokens(text)`（Token 估算 4 chars/token）；第 1 章特殊处理（IDEA 简介替代前一章） | `ContextBudgetService` 方法已实现并测试通过；`STEP_DATA_ACCESS` provider 尚未注册——`computeBudget`/`computeBudgetPrecise` 暂未接入 Chapter 生成管道。当前生成管道直接构造 Prompt 模板变量，上下文预算三层裁剪待后续迭代连线。 |
| StepModule（Model Degradation #19） | 已完成 (#19) | `callWithFallback(taskType, prompt)`（单向降级 V3→R1→阻塞 / R1→V3→阻塞，不循环）；`getDegradationLogs()`（降级日志）；`BLOCKING_TASKS` 9 种（生成+审核+创意）+ `SKIP_ON_FAILURE_TASKS` 3 种（指纹/FactSheet/变更分析）；`AiMeta` 从 AIGatewayService → StepService → 前端 API 传播；前端 `<AiUnavailableModal />`（双模型不可用弹窗）+ `<ModelBadge />`（模型状态指示器）+ `useAiStatus` composable | ADR-0007 Decision 4 落地。降级日志内存存储。注意：`callWithFallback` 已定义并通过测试，但 StepService/ChangeAnalysisService 当前通过 `generate()` 直接调用 AI——降级链尚未接入实际调用路径，待后续迭代连线。 |
| StepModule（Token Pre-calculation #20） | 已完成 (#20) | `countTokens(text)`（精确 Token 计数，委托 `IChatModel.getNumTokens()` — OpenRouter DeepSeek tokenizer，替代 4 chars/token 启发式）；`computeBudgetPrecise(projectId, chapterId)`（异步精确预算计算，三层独立 `countTokens` + `Promise.all` 并行）；`IChatModel.getNumTokens()` 接口方法（匹配 LangChain `ChatOpenRouter` 原生 API） | 精确 tokenizer 相比启发式估算：中文 ~1.8 chars/token（vs 4 chars/token 低估），提供更准确的预算边界。`estimateTokens` 仍保留用于裁剪逻辑的同步路径。 |
| StepModule（Critical Chapter Routing #18） | 已完成 (#18) | `shouldUseR1()`（三重判定：结构位置开篇 1-3/结局末 3 ‖ hookCount ≥ 3 ‖ isClimax → `useR1`）；`resolveChapterTaskType()`（生成管道读 `Beat.useR1` 路由模型：true→CRITICAL_CHAPTER/r1，false→CHAPTER_GENERATION/v3）；Beat 字段 `hookCount`/`isClimax`/`useR1`；前端 BeatEditor isClimax 勾选框 + BeatList useR1 标记 + HookDensityChart | ADR-0007 Decision 3 落地。`generateChapter()` 和 `continueChapterGeneration()` 均应用路由。 |
| IDEA Phase | 已完成 (#8) | `IdeaController`（继承 `PhaseControllerBase`——generate/confirm/reject/GET 统一路由模式，附加 `summary` 端点）。`POST /projects/:id/steps/idea/generate` + `POST /projects/:id/steps/idea/summary` + `POST /projects/:id/steps/idea/confirm` + `POST /projects/:id/steps/idea/reject` + `GET /projects/:id/steps/idea`。前端 `IdeaView.vue` + `IdeaInput.vue` + `SellPointSelector.vue` + `MarketAnalysisCard.vue` + `SummaryCard.vue` + `useIdeaParser.ts` + `api/idea.ts` + 路由 `/project/:id/idea` | 数据职责分离：`generateIdea` → `output` 仅含 3 个卖点方案（PRD 规划 3-5 个，实现固定为 3）（正则 `#+` 剥离 AI 可能泄露的简介段落）；`generateIdeaSummary` → 仅提取选中卖点传给 AI + 简介存入 `review.oneLiner`/`review.fullSummary`/`review.summaryGenerated` + `output` 原封不动（正则 `#+ 卖点方案` 剥离 AI 可能泄露的卖点段落）。Prompt 双向加强：`idea-generation.md` 明令禁止输出简介，`idea-summary-generation.md` 指定 `## 一句话简介`/`## 500字简介` 格式并禁止输出卖点。前端 `useIdeaParser(output, review)` 优先从 `review` 读取简介，`#+` 正则回退解析 `output` 兼容旧数据。 |
| 前端基础设施（#6） | 已完成 (#6) | `useProjectStore`/`useWorkflowStore`/`useBeatStore`/`useChapterStore`（4 个 Pinia store，统一使用 `createStorePersistence` 工厂消除样板代码）。`useChapterStore.updateChapterContent` SSE 流式写入 localStorage 限流 300ms（~6000 次/章→~20 次/章）。`sortByChapter` 提取到 `stores/sort.ts` 共享工具。`api/common.ts` 统一 `StepDataResponse` 类型 + `getOrNull` 404 辅助（替代 3 个 `getXxx()` 中的重复 fetch 模式）。`<AppLayout />`（a-layout）/`<WorkflowStepper />`（a-steps）/`<CanvasBackground />`（canvas 保留）/`<ModelBadge />`（a-tag）/`<ErrorModal />`（a-modal） | TDD 三轮完成。设计系统 34 个 CSS 自定义属性（teal 绿 `#0d9488` + 琥珀橙 `#f59e0b` + slate 中性色系）+ ConfigProvider 主题 Token 映射，全局注入于 `main.ts`。 |
| 设计系统刷新 + UI 中文化 | 已完成 | `css-variables.css` 34 个自定义属性：品牌主色 teal 绿（`--color-primary: #0d9488`，传达健康/成长/创意）、强调色琥珀橙（`--color-accent: #f59e0b`，积极/能量）、中性色系 slate（背景 `#f8fafc`，文字 `#1e293b`/`#64748b`）、状态色（success/warning/error/info + light 变体）、3 级阴影、3 级圆角、2 级过渡时长。全局字体 Google Fonts Inter + Noto Sans SC（抗锯齿渲染）+ serif 衬线字体（`Noto Serif SC`）。ant-design-vue 4.x ConfigProvider 全局主题 Token 映射（colorPrimary/colorSuccess/colorWarning/colorError/colorInfo/colorBorder/borderRadius）。CanvasBackground 浮字粒子 teal 色 `rgba(13, 148, 136, opacity)`。写作书房风格美化：a-card hover 微动效（`translateY(-2px)` + `box-shadow-lg`）、封面渐变色板（teal/amber/slate/navy/emerald/rose 六色）。UI 文案全量中文化：8 个文件 11 处残留英文（New Project/Retry/Section/DISPUTED 等）替换为中文。 | 全量 ant-design-vue 迁移 + UI 中文化完成，416 条测试零回归。 |
| 前端工作流容器 | 已完成 (#7) | `main.ts`（App 入口：createApp → Pinia → Router → `#app` 挂载） `App.vue`（AppLayout + CanvasBackground + `<router-view />`） `router/index.ts`（Vue Router 4 配置：`/` → ProjectHubView，`/project/:id` → WorkflowView，`/project/:id/idea` → IdeaView 子路由，`/project/:id/setting` → SettingView 子路由，`/project/:id/outline` → OutlineView 子路由） `ProjectHubView.vue`（仪表盘：我的项目标题 + 创建按钮 + 项目列表 + 空状态提示） `WorkflowView.vue`（工作流容器：WorkflowStepper 集成 + 项目标题/ID 展示 + 子路由 `<router-view />` 占位） | TDD 红→绿→重构完成。Vue Router 4 路由已配置，`useRoute()` 动态读取 `:id` 参数。WorkflowView 通过 `useWorkflowStore` 驱动 WorkflowStepper 的 Phase 状态与步骤交互 |
| 测试基础设施 | 已完成 (#4–#20) | 后端：Jest 30 + supertest — 18 套件 403 条（含 Unit + E2E）。前端：Vitest 2.1 + @vue/test-utils + happy-dom — 37 套件 416 条 | TDD 红→绿→重构完成。前后端合计 819 条测试，零回归 |


**技术栈已落地：**
- 后端：NestJS 11 + TypeScript 5
- 前端：Vue 3.5 + Vite 6 + Ant Design Vue v4 + Pinia 3 + Vue Router 4
- AI 网关：OpenAI SDK (`openai`) 直连 DeepSeek API（`api.deepseek.com`）→ DeepSeek V3 (`deepseek-chat`) / R1 (`deepseek-reasoner`)；`IChatModel` 接口保留 OpenRouter 可扩展性
- ORM：Prisma 6.19.3 + MongoDB（replica set `rs0` on `127.0.0.1:27018`）
- 后端测试：Jest 30 + supertest + RxJS Observable
- 前端测试：Vitest 2.1 + @vue/test-utils + happy-dom
- 运行时：Node.js 22.16
