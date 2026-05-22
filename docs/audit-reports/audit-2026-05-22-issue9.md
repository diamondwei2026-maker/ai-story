# 蓝图逻辑审计报告

**审计日期**: 2026-05-22
**审计范围**: Issue #9 SETTING 设定集 Phase 完成后，PRD ↔ CONTEXT.md 实施状态 ↔ ADR
**审计原则**: 只审文档，不审代码

---

### Warning（存在隐患）

- **[W1] IDEA Phase 未实现但 SETTING 已完成**: Phase 流转顺序为 IDEA → SETTING → OUTLINE。SETTING 已完整实现（#9），但 IDEA Phase（灵感提取、市场分析、卖点方案）尚未开发。当前 `step.service.ts` 的 `confirmSetting` 将 Project 直接推进到 OUTLINE，跳过了 IDEA 确认环节。CONTEXT.md 实施状态表中无 IDEA Phase 对应行——读者无法判断 IDEA 是"未开始"还是"被跳过"。建议在下一个 Issue 中实现 IDEA Phase。
  → 涉及：`docs/prd/novelcraft-pro.md` 用户故事 5-8 / `CONTEXT.md` 实施状态

- **[W2] SETTING 合规检查使用关键词匹配而非 AI 内嵌审核**: ADR-0003（Decision 1）要求 IDEA/SETTING 使用内嵌审核（创作 Prompt 包含审核指令）。当前实现 `runPowerSystemCheck()` 使用静态关键词列表做红线检测，输出 `{ passed, flags[] }` 结构。这并非 AI 基于上下文的审核——无法检测隐含违规（如隐喻性政治影射）。CONTEXT.md 中未注明此简化，读者可能误以为 ADR-0003 的分层审核已完整落地。
  → 涉及：`docs/adr/0003-tiered-review-and-model-strategy.md` / `CONTEXT.md`

- **[W3] CompletionBanner 缺口持续存在（第三次审计标记）**: 此问题在 audit-2026-05-21-issue6.md（W3）和 audit-2026-05-21-issue8.md（W3）中已连续两次标记。ADR-0005（Decision 4）明确要求"前端 WorkflowStepper 需增加 DRAFTING→COMPLETED 的横幅提示组件"。当前 WorkflowStepper 仅含 5 步进度条，缺少 CompletionBanner、ConfirmButton、COMPLETED 只读覆盖层和"继续创作"按钮。建议在近期 Issue 中立项解决——多次审计同一缺口意味着它正在成为技术债务。
  → 涉及：`docs/adr/0005-state-machine-completeness.md` / `CONTEXT.md`

- **[W4] StepData 完整状态机未激活**: StepData 实体定义了 7 个状态（PENDING → IN_PROGRESS → AI_GENERATING → AWAITING_REVIEW → REVIEWING → CONFIRMED / REJECTED），但当前 `generateSetting()` 直接从调用跳至 AWAITING_REVIEW，`confirmSetting()` 从 AWAITING_REVIEW 跳至 CONFIRMED。中间状态（IN_PROGRESS、AI_GENERATING、REVIEWING）虽已定义但未被任何代码路径使用。CONTEXT.md StepData 描述与代码行为存在"定义完备 vs 实现简化"的落差，读者无法从文档中得知当前阶段的状态机实际可达状态。
  → 涉及：`CONTEXT.md` StepData 术语定义 / PRD 状态机设计章节

### Info（优化建议）

- **[I1] 测试计数已过时**: CONTEXT.md 实施状态记录"后端 96 条 + 前端 71 条 = 共 167 条"。实测当前：后端 89（单元）+ 28（e2e）= 117 条，前端 133 条，合计 250 条。建议更新为精确数字。
  → 涉及：`CONTEXT.md` 测试基础设施行

- **[I2] CONTEXT.md 缺少 Issue #9 SETTING Phase 行**: 实施状态表目前列出 ProjectModule、PrismaModule、AIGatewayModule、前端基础设施、前端工作流容器等，但 StepModule/SETTING Phase（#9）及其对应的前端 SettingView、WorldBuilder、CharacterCard、RelationGraph、regenerate 流均未在表中独立成行。
  → 涉及：`CONTEXT.md` 实施状态表

- **[I3] "其他后端模块"行需拆分**: CONTEXT.md 将 WorkflowModule / ReviewModule / ChangeAnalysisService / FactSheetCompensationService 统列为"其他后端模块（未开始）"。StepService（部分 WorkflowModule 的子模块）现已实现，应拆分为独立的 StepModule 行。
  → 涉及：`CONTEXT.md`

- **[I4] W1/I2/I4 从前次审计延续**: audit-2026-05-21-issue8.md 的 W1（PRD 前端模块表未定义工作流容器模块）和 I2（路由设计缺少 PRD 溯源）和 I4（`env.d.ts` 未纳入模块清单）在 Issue #9 中未涉及，仍为开放项。
  → 涉及：`docs/audit-reports/audit-2026-05-21-issue8.md`

- **[I5] regenerate 流程未在 PRD 文档中追溯**: PRD 用户故事 12（"手动编辑和补充设定内容，AI 能基于修改重新生成关联内容"）已通过 `currentContent` 参数 + `regenerate-setting-btn` 实现，但 CONTEXT.md 未单独记录此功能点。这是 Issue #9 的核心交付之一，建议在实施状态中标注。
  → 涉及：`CONTEXT.md` / `docs/prd/novelcraft-pro.md` 故事 12

---

**审计统计**：B: 0 | W: 4 | I: 5
**结论**：无 Blocker，所有 Warning 均为渐进实现过程中的已知简化。W1（IDEA Phase 缺失）建议作为 Issue #10 解决。W3（CompletionBanner）已连续三次审计标记，建议在 2 个 Issue 周期内立项。
