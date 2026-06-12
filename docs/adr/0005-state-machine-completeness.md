# 状态机闭环：BEATS 内部修改、审核决策路径与 Project 完结

修复 PRD 自检中发现的 5 个状态机相关闭环缺口和决策冲突。

**Context**：自检发现（1）BEATS 确认后修改字数在 DRAFTING 进行中时，两档回退规则与 Example Dialogue 的矛盾；（2）Project COMPLETED 后无可操作路径；（3）非 PASS 审核结论的用户决策链不完整；（4）Chapter.status 枚举中存在未使用的 PUBLISHED；（5）DRAFTING→COMPLETED 自动转换与"逐阶段显式确认"设计哲学冲突。

## Decision 1 — BEATS Phase 内部修改的 STALE 传播

区分两种修改深度，不使用统一的跨 Phase 回退：

| 修改类型 | 触发方式 | 影响范围 | DRAFTING 下游 |
|---------|---------|---------|---------------|
| 仅改字数（targetWordCount） | 直接在 Beat 编辑器中修改数值 | 该 Beat 标记 STALE，AI 重平衡前后 Beat 字数配额（纯数值微调，不改 Beat 结构内容）。邻居 Beat 不标记 STALE | 对应 Chapter（如已生成）**不标记 STALE**，仅其 targetWordCount 更新。用户下次编辑该 Chapter 时提示字数目标已变更。AI 润色/续写时使用新目标字数 |
| 改 Beat 结构内容（冲突点、钩子预设、POV 视角等） | 用户显式点击"重新生成该 Beat"或编辑核心字段 | 该 Beat 标记 STALE，AI 重新生成结构内容 | 对应 Chapter（如已生成）标记 STALE。上下游 Beat 不受影响 |

- 以上两种修改均**不触发跨 Phase 回退**——Project.status 保持 DRAFTING
- 用户若需批量修改 BEATS（如全局结构调整），应使用正式的"回退到 BEATS Phase"操作 → 触发跨 Phase 回退 → DRAFTING 全部 STALE

**关于"STALE"在 Chapter 上的语义**：Chapter.status 枚举（PENDING | DRAFT | REVIEWING | COMPLETED | DISPUTED）不含 STALE 值。本 ADR 中"Chapter 标记 STALE"是概念性描述——该章内容因上游 Beat 结构变更而过时，但其 status 字段保持原值。用户下次访问该章时，系统提示选择"重新生成"（触发 status → DRAFT，进入生成→审核→确认管道）或"保留现有正文并手动调整"。Phase 级别的 STALE 含义不同：它是系统级标记，表示整个 Phase 需重新确认后才能继续推进。

**理由**：两档回退规则定义的是用户主动"回退 Phase"的宏观操作。BEATS 内部逐条微调是高频轻量操作，强制级联 STALE 整个 DRAFTING 会让用户不敢做任何调整。"仅改字数"和"改结构内容"的区分基于影响深度——前者是数值参数，后者是叙事结构。

## Decision 2 — COMPLETED 后的操作空间

小说 Project 达到 COMPLETED 后：

- **默认状态**：所有内容只读。每个 Phase 面板可展开查看但不可编辑
- **重新打开**：提供"继续创作"按钮 → Project.status 退回到 DRAFTING，所有 Chapter 保持 COMPLETED 不变
- 重新打开后，用户可修改任意 Chapter——行为与正常 DRAFTING 阶段完全一致（编辑→ChangeAnalysis→ImpactPropagation）
- COMPLETED 状态保留在 Project 的 statusHistory 中作为里程碑记录
- Project 额外提供 `archive()` 操作（COMPLETED → ARCHIVED）：归档项目从活跃列表中隐藏，`restore()` 可恢复至 DRAFTING。ARCHIVED 是软归档，与"继续创作"（COMPLETED → DRAFTING）是两条独立路径——前者用于清理工作区，后者用于继续迭代
- COMPLETED 本身是软性里程碑，不阻止"继续创作"退回 DRAFTING

**理由**：创作是迭代过程，即使"完本"后也可能回头修改。COMPLETED 应是一个可逆的里程碑而非终点锁。ARCHIVED 独立于继续创作路径，用于用户主动清理活跃项目列表，避免 COMPLETED 作品长期占据 ProjectHub。

**完结前检查**：用户点击"确认完本"时，系统检查两项——

1. **FactSheet 队列检查**：若 `Project.pendingFactUpdates` 队列非空，展示提示"有 N 条待处理的事实簿更新，建议同步后再完本"，提供三个选项："立即同步并完本"（触发 forceSync → 消费队列 → 完结）、"跳过并完本"（队列保留，下次"继续创作"时消费）、"取消"（回到 DRAFTING）。若用户选择跳过，队列中的条目不丢失，仅在 COMPLETED 只读期间暂不消费。

2. **DEFERRED ChangeAnalysis 检查**：跨所有源 Chapter 扫描 `changeAnalysis.impactedChapters` 中 `status === 'DEFERRED'` 的条目。若有未处理的 DEFERRED → 展示提示"有 N 条待处理的变更影响（来自之前的章节修改）"，提供两个选项："查看并处理"（回到 DRAFTING 逐条解决）和"跳过并完本"（DEFERRED 条目保留，下次"继续创作"时重新提醒）。此检查防止已推迟的中等影响在完本后永久静默丢失。

**归档时的队列处理**：用户归档（ARCHIVED）Project 时，`pendingFactUpdates` 队列和 DEFERRED ChangeAnalysis 条目**保留不清理**，归档操作不因队列非空而阻止。恢复（`restore()`→DRAFTING）时队列监控和 DEFERRED 提醒自动恢复——理由：归档是用户主动清理工作区的操作，不应被系统状态阻塞，队列数据不会因归档而过时（FactSheet 最终一致性由下次消费保证）。

## Decision 3 — 审核结论的完整用户决策路径

```
生成正文 → 合规审核 → 四档结论

PASS:
  → Chapter 自动变为 COMPLETED（无需用户操作）

PASS_WITH_SUGGESTIONS:
  → 用户两个选择：
    a) 一键采纳某条建议 → AI 改写受影响段落 → 重新审核（回到审核入口）
    b) 忽略建议并确认 → Chapter 变为 COMPLETED，建议记录保留在 reviewResult 中

NEEDS_REVISION:
  → 用户三个选择：
    a) 一键采纳建议 → AI 改写段落 → 重新审核
    b) 手动修改正文 → 关闭编辑器 → ChangeAnalysis → 重新生成 → 重新审核
    c) 上诉 → ReviewAppeal

BLOCKED:
  → 用户两个选择：
    a) 手动修改正文后重新生成 → 重新审核（不能一键采纳，零容忍红线需人工判断）
    b) 上诉 → ReviewAppeal
```

**ReviewAppeal 二次审核后的收敛规则**：

| 原始结论 | 二次审核降级为 | 处理 |
|---------|-------------|------|
| BLOCKED | PASS / PASS_WITH_SUGGESTIONS / NEEDS_REVISION | 按降级后结论处理 |
| BLOCKED | 维持 BLOCKED | 用户可选：再次修改正文 或 强制标记 DISPUTED |
| NEEDS_REVISION | PASS / PASS_WITH_SUGGESTIONS | 按降级后结论处理 |
| NEEDS_REVISION | 维持 NEEDS_REVISION | 用户可选：再次修改 或 强制标记 DISPUTED |

- DISPUTED = 用户签字但保留意见。Chapter 标记 DISPUTED，下一章解锁。审核记录完整保留
- 强制 DISPUTED 前 UI 弹出二次确认："你将自行承担合规风险，确认继续？"

**理由**：PASS_WITH_SUGGESTIONS 不能强制用户修改——建议类问题应由作者自己判断。NEEDS_REVISION/BLOCKED 提供上诉出口以避免 AI 误判永久卡死流程（CONTEXT.md Example Dialogue 已确立此原则）。上诉只给一次机会是为了防止上诉→驳回→上诉的死循环。

## Decision 4 — DRAFTING → COMPLETED 显式确认

- 当所有 Chapter.status ∈ {COMPLETED, DISPUTED} 时，UI 醒目展示"完本提示"横幅
- Project 状态**不自动**改变——用户必须显式点击"确认完本"
- 用户可选择忽略提示继续编辑（如修改已确认章节、添加新章节等）
- 用户也可通过 BEATS Phase 增加新 Beat（从而增加新 Chapter），DRAFTING 自动延续

**理由**：PRD 的核心哲学是"分步确认"——每个 Phase 都需要用户显式确认。DRAFTING→COMPLETED 不该成为例外。自动转换剥夺用户控制感，且与小说创作的仪式感不符——"完本"是作者有意识的决定。

## Decision 5 — 数据模型修正

Chapter.status 枚举修正为：

```
PENDING | DRAFT | PENDING_REVIEW | REVIEWING | COMPLETED | DISPUTED
```

- `PENDING_REVIEW`（#22/#23 实施后新增）——正文已保存但用户尚未提交审核的中间状态。用户编辑正文并保存后进入此状态；编辑器关闭时若触发实质性变更（ADR-0006 Decision 2）则重置为此状态。此状态与 `REVIEWING`（审核 AI 运行中）分离，使用户可在提交审核前自由编辑而不触发审核管道。
- 移除 `PUBLISHED`——当前 Out of Scope 已明确不涉及平台发布。若后续引入发布功能，Chapter 应新增独立的 `publishStatus` 字段与创作状态解耦，而非在 status 枚举中混入发布语义。

Project.status 枚举：

```
IDEA | SETTING | OUTLINE | BEATS | DRAFTING | COMPLETED | ARCHIVED
```

- ARCHIVED 在 Decision 2 中定义，用于软归档已完成作品，与 COMPLETED→DRAFTING 继续创作路径分离

---

## Consequences

- BEATS 编辑器需要区分"字数修改"和"结构修改"两种编辑模式，触发不同的 STALE 逻辑
- 审核面板需要根据审核结论动态展示不同的用户操作按钮组合
- Project 需要新增 `statusHistory` 字段记录里程碑变更
- Chapter 模型需移除 `PUBLISHED` 枚举值（如尚未实现，则在 schema 定义时排除；如已有代码引用需清理）
- 前端 WorkflowStepper 需增加 DRAFTING→COMPLETED 的横幅提示组件
