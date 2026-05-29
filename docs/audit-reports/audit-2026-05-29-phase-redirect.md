# 蓝图逻辑审计报告

**审计日期**: 2026-05-29  
**审计范围**: PRD + ADR×7 + CONTEXT.md×3  
**触发事件**: Phase 确认自动跳转（IdeaView → 删除中间态 + router.push；usePhaseWorkflow → handleConfirm router.push；SettingView → initialLoadDone auto-generate）

### Blocker（必须先解决）

*无*

### Warning（存在隐患）

- **#W1 拖拽重排用户故事无追踪**（延续自 2026-05-27 审计 #W1）：PRD stories #18（拖拽调整大纲节点顺序）和 #18a（拖拽调整 Beat 顺序交换 chapterNumber）未出现在任何 CONTEXT.md 的"已实现"或"尚未实现"列表中。ADR 亦未涉及拖拽功能。这些故事既未被明确纳入实施计划，也未被明确标记为 descope。→ 涉及：`docs/prd/novelcraft-pro.md`, `src/step/CONTEXT.md`

- **#W2 Project.config.defaultChapterWordCount 字段缺失**（延续自 2026-05-27 审计 #W2）：根 CONTEXT.md 的 Example Dialogue 中多处引用 `defaultChapterWordCount`，但 `src/project/CONTEXT.md` 的 Project.config 字段表仅列出 `{ style?, platform?, genre? }`，未记录该字段。→ 涉及：`CONTEXT.md`, `src/project/CONTEXT.md`

- **#W3 BEATS/DRAFTING Phase 前端路由缺失 — `usePhaseWorkflow.handleConfirm` 对 BEATS 的 router.push 静默失败**：BEATS Phase 后端已完整实现（BeatsController + BeatModificationController），前端组件已到位（BeatList/BeatEditor/HookDensityChart/useBeatStore），但路由器 `router/index.ts` 中无 `workflow.beats` 路由、无 `BeatListView.vue`。DRAFTING Phase 同理无路由/View。今日修改中 OUTLINE → BEATS 的 `router.push('workflow.beats')` 被 `.catch()` 静默吞掉——功能不阻塞但等同于未生效。同时 `src/step/CONTEXT.md` 声称"所有 PRD 规划的领域功能均已实现"过于乐观——BEATS/DRAFTING 的前端 View+Route 是 PRD story #19-22a 的前端展示载体，缺失则用户在 Web UI 中无法进入这两个 Phase。→ 涉及：`frontend/src/router/index.ts`, `src/step/CONTEXT.md`, `frontend/src/composables/usePhaseWorkflow.ts`

### Info（优化建议）

- **#I1 实施状态表行序不按 Issue 编号**（延续自 2026-05-27 审计 #I1）：#19（模型降级）在 #18（关键章节路由）之前，#8（IDEA）在 #6（前端基础设施）之后。非功能性但新读者可能困惑。

- **#I2 `src/step/CONTEXT.md` "尚未实现"节与事实不符**：该节声明"（无——所有 PRD 规划的领域功能均已实现）"，但 BEATS/DRAFTING 前端 View+Route 缺失（见 #W3）。建议改为列出已知缺口。

---

**审计统计**：B: 0 | W: 3 | I: 2  
**结论**：今日修改（Phase 确认自动跳转）未引入新的逻辑冲突或文档矛盾——三个 Warning 均为先前已存在的债务或新发现的前端路由缺口。#W3 建议在下一个 Issue 中补齐 BEATS/DRAFTING 前端 View+Route，使 auto-redirect 全链路生效。
