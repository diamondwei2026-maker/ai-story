# 蓝图逻辑审计报告

**审计范围**: `src/project/CONTEXT.md`, `src/step/CONTEXT.md`, `docs/adr/0005`, `docs/adr/0006`, `docs/adr/0007`
**审计时间**: 2026-05-26
**审计对象**: Issue #17（上下文注入三层硬上限）实施后 + Issue #16（Project 完结流程）未提交变更

---

### Blocker（必须先解决）

- [B1] ~~**ARCHIVED 状态与 ADR-0005 显式冲突**~~ ✅ **已修复 (2026-05-26)**: ADR-0005 Decision 2 和 Decision 5 已更新，承认 ARCHIVED 为独立软归档状态，与 COMPLETED→DRAFTING 继续创作路径分离。 -> 涉及：`docs/adr/0005-state-machine-completeness.md`, `src/project/CONTEXT.md`

### Warning（存在隐患）

- [W1] **globalStatic 子优先级裁剪未实现**: ADR-0007 Decision 1 定义了第一层（全局静态）内部的 5 级子优先级裁剪（核心角色卡摘要 → 完整角色关系图 → 完整世界观描述），但 `context-budget.service.ts` 的 `trimToBudget()` 仅做简单截断，不做子优先级区分。当前行为会导致角色卡和世界观在截断中被同等对待。`step/CONTEXT.md` 已如实描述，但 ADR 与实现之间存在降级差距。 -> 涉及：`docs/adr/0007-runtime-guardrails.md`, `src/step/CONTEXT.md`

- [W2] **Token 计数方式与 ADR 规格存在差距**: ADR-0007 Decision 1 要求"使用 DeepSeek tokenizer（通过 OpenRouter API 的 token counting 端点）"做精确预计算。当前实现使用 `chars / 4` 估算，精度在 CJK 文本下偏差较大（中文字符 token 比率约 1.5-2 chars/token，而非 4）。`step/CONTEXT.md` 已将"Token 预计算模块"列入尚未实现，差距被追踪但短期内预算控制可能偏宽松或偏紧。 -> 涉及：`docs/adr/0007-runtime-guardrails.md`, `src/step/CONTEXT.md`

- [W3] ~~**BEATS 两档 STALE 传播未在 CONTEXT 中体现**~~ ✅ **已修复 (2026-05-26)**: `step/CONTEXT.md` BEATS 管理节已补充 `updateBeatWordCount()` 和 `updateBeatStructure()` 的两档 STALE 传播规则。 -> 涉及：`docs/adr/0005-state-machine-completeness.md`, `src/step/CONTEXT.md`

- [W4] ~~**跨 Phase 回退后 FactSheet 处理未记录**~~ ✅ **已修复 (2026-05-26)**: `step/CONTEXT.md` 新增"跨 Phase 回退后 FactSheet 处理"独立段落。 -> 涉及：`docs/adr/0007-runtime-guardrails.md`

- [W5] **COMPLETED 完结流程的归属模糊**: `confirmCompletion()`、`reopenProject()`、`appendMilestone()` 实现在 `StepService` 中（`step/step.service.ts`），但操作对象是 Project 状态。CONTEXT.md 中此功能同时出现在 project/CONTEXT.md 和 step/CONTEXT.md 两处。如果 ProjectService 是 Project 的聚合根服务，完结流程是否应该归属 ProjectService 而非 StepService？ -> 涉及：`src/project/CONTEXT.md`, `src/step/CONTEXT.md`

### Info（优化建议）

- [I1] ~~**Levenshtein 阈值未标定具体值**~~ ✅ **已修复 (2026-05-26)**: `step/CONTEXT.md` 已补上"< 50 字符"阈值。 -> 涉及：`src/step/CONTEXT.md`

- [I2] **contextSummary 触发阈值与 ADR 不完全一致**: ADR-0007 Decision 1 设定"正文 > 2500 tokens → AI 生成摘要"，`context-budget.service.ts` 中 `SUMMARY_THRESHOLD = 2500` 一致。但 ADR 还定义了第 1 章特殊上限 800 tokens 和前一章优先使用 contextSummary 的规则——这些在 CONTEXT.md 已更新，信息同步完整。仅标记为 Info 确认一致。

- [I3] **FactSheet 告警阈值已对齐**: ADR-0007 Decision 2 定义队列深度告警阈值 ≥10 WARNING / ≥5 PRIORITY，`step/CONTEXT.md` 记载 ≥50 CRITICAL / ≥10 WARNING / ≥5 PRIORITY。实际实现加了 CRITICAL 档（≥50），这是对 ADR 的增强而非矛盾——建议回写到 ADR 或标记为实现扩展。

---

**审计统计**：B: 0 (1 resolved) | W: 2 (3 resolved) | I: 2 (1 resolved)
**结论**：Blocker 已消除。剩余 2 个 Warning（W1 子优先级裁剪、W2 Token 计数精度）属于实现渐进完善项，W5 为代码架构优化建议。
