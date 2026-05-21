# 蓝图逻辑审计报告

**审计日期**: 2026-05-21
**审计范围**: Issue #8 工作流容器完成后，PRD ↔ CONTEXT.md 实施状态 ↔ ADR
**审计原则**: 只审文档，不审代码

---

### Warning（存在隐患）

- **[W1] PRD 前端模块表未定义"工作流容器"模块**: CONTEXT.md 新增行"前端工作流容器（#8）"记录了 `WorkflowView.vue` 作为独立模块，但 PRD 前端模块表中无对应条目。PRD 将 WorkflowStepper 定义为同时处理步进度条和步骤面板内容的模块，而实现将其拆分为"WorkflowView（容器+路由） + WorkflowStepper（导航栏）"两层。文档未记录此架构决策——后续开发者可能困惑 WorkflowView 和 WorkflowStepper 的区别。
  → 涉及：`docs/prd/novelcraft-pro.md` 前端模块表 / `CONTEXT.md` 实施状态

- **[W2] ProjectHubView 功能偏离 PRD 定义**: PRD 将 ProjectHub 模块定义为含 `ProjectList`、`ProjectCard`、`CreateProjectModal` 三个子组件。当前 `ProjectHubView.vue` 内联实现了标题+按钮+空状态，未拆分 `ProjectCard` 和 `CreateProjectModal`。虽为渐进实现，但 CONTEXT.md 未标注"子组件待拆分"或指向后续 Issue，读者可能误以为模块已完整交付。
  → 涉及：`docs/prd/novelcraft-pro.md` 第 167 行 / `CONTEXT.md` 第 117 行

- **[W3] WorkflowStepper CompletionBanner 缺口持续存在**: 此问题在上次审计（audit-2026-05-21-issue6.md W3）已标记，Issue #8 未涉及。PRD 要求 WorkflowStepper 包含 `CompletionBanner`（完本横幅）+ `ConfirmButton`（确认完本）+ COMPLETED 只读覆盖层 + "继续创作"按钮。当前 WorkflowStepper 仅含 5 步进度条。AD-0005 也明确要求"前端 WorkflowStepper 需增加 DRAFTING→COMPLETED 的横幅提示组件"。
  → 涉及：`docs/prd/novelcraft-pro.md` 第 168 行 / `docs/adr/0005-state-machine-completeness.md` / `CONTEXT.md`

### Info（优化建议）

- **[I1] 上次审计 W1 已修复**: audit-2026-05-21-issue6.md 标记的"Vue Router 已声明但未使用"已在 #8 中通过 `router/index.ts` 和 `main.ts` 完成路由配置。建议在上次审计报告中标注 W1 为已修复。
  → 涉及：`docs/audit-reports/audit-2026-05-21-issue6.md`

- **[I2] 路由设计缺少 PRD 溯源**: `router/index.ts` 定义了两条路由（`/` → ProjectHubView，`/project/:id` → WorkflowView），但 PRD 中无用户故事或 API 契约明确描述路由结构。路由作为架构决策，建议在未来 ADR 或 PRD 迭代中补记。
  → 涉及：`docs/prd/novelcraft-pro.md` / `CONTEXT.md`

- **[I3] 前端模块命名约定未统一**: PRD 定义模块名（ProjectHub / WorkflowStepper / StepIdea 等），CONTEXT.md 实施状态混用"模块名"和"Vue 文件名"两种记录方式（如"前端基础设施（#6）"列出组件名，"前端工作流容器（#8）"同时列出文件名和功能描述）。建议统一实施状态表的命名粒度——要么全用模块名，要么全用文件名+功能描述。
  → 涉及：`CONTEXT.md` 实施状态表

- **[I4] `env.d.ts` 未纳入模块清单**: Issue #8 新增了 `src/env.d.ts`（Vue SFC 类型声明），属于前端基础设施类型的文件，当前未在 CONTEXT.md 实施状态中记录。与上次审计 I2（`persist.ts` 未纳入模块清单）同类问题。
  → 涉及：`CONTEXT.md`

---

**审计统计**：B: 0 | W: 3 | I: 4
**结论**：无 Blocker 级别问题，W 级别可渐进处理。上次审计 W1 已修复。建议在下一个前端 Issue 中解决 W3（CompletionBanner），在 PRD 迭代中补记路由设计（I2）。
