# NovelCraft Pro — 领域术语表

> 此文件为项目统一词汇表。不含实现细节、不含技术选型——只定义"这个词在业务中代表什么"。

## 创作生命周期

| 术语 | 定义 |
|------|------|
| **Project（小说项目）** | 用户创建的一本小说的完整创作容器，包含所有 Phase、Chapter 和审核记录。 |
| **Phase（创作阶段）** | 用户视角的 5 个顶层进度节点，顺序固定，不可跳过。五个 Phase：IDEA（灵感提取）、SETTING（设定集）、OUTLINE（剧情大纲）、BEATS（细纲拆解）、DRAFTING（正文迭代）。 |
| **Step（阶段内步骤）** | 单个 Phase 内部的子状态流转，表示用户在特定 Phase 中所处的操作环节。 |
| **STALE（过时状态）** | 当用户回退到上游 Phase 并修改内容后，下游已确认 Phase 的数据被标记为 STALE。用户重新推进到该 Phase 时，系统提示选择"复用旧数据"或"基于新上下文重新生成"。STALE 数据不会被自动删除。 |
| **确认（Confirm）** | 用户对当前 Phase 的 AI 输出和审核结果表示认可的动作。确认后 Phase 状态变为 CONFIRMED，允许推进到下一 Phase。 |
| **Chapter（章节）** | DRAFTING Phase 内部的独立写作单元，每个 Chapter 对应 BEATS Phase 生成的一条 Beat 细纲。Chapter 拥有自己独立的 Step 状态机（生成→审核→确认）。每章字数由用户指定（不同平台有不同期望：起点 3-5K 字，番茄 2-3K 字等）。 |
| **ChangeAnalysis（变更分析）** | 用户手动修改已确认章节后，AI 自动对比新旧版本，输出变更要点及对下游章节的影响评估。 |
| **ImpactPropagation（影响传导）** | 从被修改章节向后传播的影响标记，按严重程度（HIGH/MEDIUM/LOW/NONE）分级，精确到具体受影响章节。 |
| **TargetedFix（针对性修补）** | 对受影响的已生成章节做最小化修改，保留主体结构和优质段落，仅修正不一致部分——区别于完全重写。 |
| **ChapterFingerprint（章节指纹）** | 每章生成时 AI 自动提取的极简元数据（出场角色、关键情节节点、世界观元素、情感弧线），约 200 tokens。用于大规模跨章变更时快速匹配受影响章节。 |
| **ChangeFingerprint（变更指纹）** | 用户修改已确认章节后 AI 提取的变更特征，与各章的 ChapterFingerprint 做匹配，定位真正需要关注的章节。 |
| **FactSheet（事实簿）** | 项目级汇聚文件，存储角色状态、地点描述、时间线事件、关键物件等确切事实。AI 在每章生成/修改后自动增量更新，生成新章时注入相关条目到 Prompt。 |
| **FactConflict（事实冲突）** | 新生成内容与 FactSheet 已有条目矛盾时触发。判定为剧情演进（更新 FactSheet）或笔误（修正正文）。 |
| **分层审核（Tiered Review）** | 合规审核策略：IDEA/SETTING Phase 采用内嵌自审（创作 Prompt 包含审核指令），OUTLINE/BEATS Phase 内嵌为主可手动触发独立审核，DRAFTING Phase 强制执行独立的"资深编辑 AI"审核。正文阶段成本最高但合规防线不容妥协。 |
| **ReviewVerdict（审核结论）** | 四档结论：PASS（全绿通过）/ PASS_WITH_SUGGESTIONS（有 LOW/MEDIUM 建议但不阻塞）/ NEEDS_REVISION（有 HIGH 级别问题，建议修改）/ BLOCKED（零容忍红线 CRITICAL，必须修改）。 |
| **ReviewDimension（审核维度）** | 四个检查维度：POLITICAL_SAFETY（政治安全）、SEXUAL_CONTENT（色情尺度）、VIOLENCE（暴力渲染）、VALUES（价值观）。每个平台对四个维度的权重和阈值不同，在项目创建时根据目标平台自动配置。 |
| **ReviewIssue（审核问题）** | 审核发现的单个问题，包含：严重程度（LOW/MEDIUM/HIGH/CRITICAL）、精确定位（到句子）、违规规则引用、具体修改建议、AI 是否可自动修复标记。 |
| **ReviewAppeal（审核上诉）** | 用户对审核结果提出异议的机制。系统将原始内容 + 审核结果 + 用户异议理由发送给 AI 做二次审核。二次审核仍不满意则标记 DISPUTED，不阻塞流程。 |
