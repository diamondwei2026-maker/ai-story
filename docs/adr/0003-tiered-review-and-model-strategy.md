# AI 分层审核与模型分级策略

合规审核按 Phase 采用不同策略，正文生成按章节钩子密度自动分配模型等级。

**Context**：系统有两类 AI 调用有成本与质量的权衡——（1）合规审核：每个 Phase 都需要，但不同 Phase 的内容量和合规风险不同；（2）正文生成：每章都需要，但不同章节的叙事重要性不同。

**Decision 1 — 分层审核**：IDEA/SETTING 使用内嵌审核（创作 Prompt 包含审核指令，一次调用）；OUTLINE/BEATS 内嵌为主，用户可手动触发独立审核；DRAFTING 每章强制执行独立的"资深编辑 AI"审核（二次调用）。审核输出四个维度的结构化 JSON（POLITICAL_SAFETY / SEXUAL_CONTENT / VIOLENCE / VALUES），每维度含四档结论（PASS / PASS_WITH_SUGGESTIONS / NEEDS_REVISION / BLOCKED）。内嵌审核的评分精度低于独立审核——IDEA/SETTING 的审核结果标注"[内嵌审核，仅供参考]"，用户可在 OUTLINE/BEATS Phase 手动触发独立审核以获得更精确的评估。

**Decision 2 — 模型分级**：章节正文按调用类型和重要性分级使用不同模型。前期 Phase 生成（IDEA/SETTING/OUTLINE/BEATS）和关键章节正文（开篇、高潮、结局等，由 BEATS 钩子密度自动识别）使用 DeepSeek-R1；普通章节正文、正文改写/润色、独立合规审核、指纹/FactSheet 提取等高频任务使用 DeepSeek-V3。模型选择由代码集中映射（ADR-0004），当前不支持用户手动覆盖——钩子密度自动分配已覆盖关键章节识别。*后续 ADR-0007 将关键章节判定升级为双重判定（结构位置 + hookCount ≥ 3 + isClimax 用户勾选），用户可通过 isClimax 标记间接影响模型选择。*

**Considered Options**：
- 全 Pro：质量统一但成本高，1000 章规模不可行。
- 全 Flash：成本低但关键章节质量不够。
- 所有 Phase 统一独立审核：前期 Phase 字数少、合规风险低，独立审核 ROI 不高。
- 所有 Phase 统一内嵌审核：DRAFTING 正文面对平台真实审核，自审不够客观。

**Consequences**：
- 需维护两套审核 Prompt 模板（内嵌 vs 独立）。
- BEATS 阶段的钩子密度数据成为 DRAFTING 模型分配的依据，需 BEATS Phase 输出标准化。
- 项目需追踪 Token 用量并按用户设置的预算上限报警。
- AI 调用统一通过 AIGatewayModule（ADR-0004），模型路由在 TaskType→Model 映射表中集中管理。
