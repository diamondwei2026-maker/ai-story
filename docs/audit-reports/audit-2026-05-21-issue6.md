# 蓝图逻辑审计报告

**审计日期**: 2026-05-21
**审计范围**: Issue #6 前端基础设施实现后，PRD ↔ CONTEXT.md ↔ ADR-0005/0006/0007
**审计原则**: 只审文档，不审代码

---

### Blocker（必须先解决）

- **[B1] PRD 状态管理方案与实际实现偏离**: PRD 技术架构表（第 140 行）规定 `Pinia + pinia-plugin-persistedstate` 作为状态持久化方案，但 CONTEXT.md 实施状态表记录了手动 `loadJSON`/`saveJSON`（`stores/persist.ts`）。两处描述矛盾——读者无法判断哪个是权威方案。若手动实现是最终选择，PRD 技术架构表应同步更新；若插件方案是目标，应记录为"临时手动实现，后续迁移至插件"。
  → 涉及：`docs/prd/novelcraft-pro.md` / `CONTEXT.md`

- **[B2] CONTEXT.md 重复记录行**: 实施状态表第 117 行"前端基础设施（#6）"和第 118 行"前端测试"分开记录，但第 117 行备注中已包含完整测试统计（52 条），与第 118 行重复。合并为一行可消除信息二义性。
  → 涉及：`CONTEXT.md`

### Warning（存在隐患）

- **[W1] Vue Router 已声明但未使用**: CONTEXT.md 技术栈列出 `Vue Router 4`，但 #6 实现不包含任何路由配置。前端基础设施阶段不要求路由，但声明了未使用的依赖会给后续开发者造成困惑——不知道路由是否应该已配置。
  → 涉及：`CONTEXT.md`
  → **状态：已于 #8 修复**（`router/index.ts` + `main.ts` 完成路由配置）

- **[W2] Ant Design Vue v4 未在组件中落地**: PRD 规定 Ant Design Vue v4 作为 UI 组件库，但 #6 的 5 个组件（AppLayout / WorkflowStepper / CanvasBackground / ModelBadge / ErrorModal）均使用纯 HTML/CSS 实现，未调用任何 Ant Design 组件。WorkflowStepper 和 ErrorModal 在后续 Issue（#8 工作流容器、#13 ReviewPanel）中可能需要切换到 a-steps / a-modal 组件，存在返工风险。
  → 涉及：`docs/prd/novelcraft-pro.md`

- **[W3] WorkflowStepper "CompletedBanner" 功能缺口**: PRD 前端模块表定义 WorkflowStepper 需包含 `CompleteBanner`（完本横幅），但 #6 实现的是基础 5 步进度条，不包含完本横幅。Issue #16（#3.3 Project 完结流程）的 F 路径明确要求 `Create <CompletionBanner />`。当前 WorkflowStepper 缺少嵌入 CompletionBanner 的插槽或扩展点，后续集成时可能需要修改 WorkflowStepper 而非仅新增组件。
  → 涉及：`docs/prd/novelcraft-pro.md`

- **[W4] CONTEXT.md Phase 标签缺少中文映射**: 术语表使用英文 Phase 标识（IDEA/SETTING/OUTLINE/BEATS/DRAFTING），前端 WorkflowStepper 使用中文标签（灵感提取/设定集/剧情大纲/细纲拆解/正文迭代），但术语表中未定义中英文映射关系。后续新增开发者可能使用不一致的标签。
  → 涉及：`CONTEXT.md`

### Info（优化建议）

- **[I1] css-variables.css 设计 token 命名偏视觉描述**: 变量名如 `--color-gold`、`--color-bg-warm` 描述的是视觉属性而非语义角色。若未来引入暗色主题或品牌重塑，这些变量名会失真。建议后续迭代将核心变量映射到语义化名称（`--color-primary` / `--color-accent` / `--color-bg`），保留视觉变量作为别名。
  → 涉及：`frontend/src/styles/css-variables.css`

- **[I2] persist.ts 未纳入模块清单**: `stores/persist.ts` 作为共享基础设施存在于代码中，但不属于 PRD 规划的任何模块。建议在 CONTEXT.md 实施状态表中新增一行记录此工具模块，或在后续 PRD 更新时纳入前端基础设施描述。
  → 涉及：`CONTEXT.md`

- **[I3] ADR-0007 Consequences 已全部落地**: ADR-0007 末尾的 Consequences 章节列出了 9 项实施后果，其中"前端新增模型状态指示器组件和 AI 不可用 Error Modal"已在 #6 中通过 ModelBadge + ErrorModal 实现。建议在 ADR-0007 中标注此条为"已完成"，保持 ADR 与实际进度同步。
  → 涉及：`docs/adr/0007-runtime-guardrails.md`

---

**审计统计**：B: 2 | W: 4 | I: 3
**结论**：需执行 reconcile-consistency（B1 和 B2 应优先修复，W 级别可渐进处理）
