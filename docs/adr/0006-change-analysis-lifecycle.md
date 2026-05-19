# ChangeAnalysis 生命周期：持久化、触发阈值与下游处理

修复 PRD 自检中发现的 ChangeAnalysis 结果无持久化、触发过于激进的问题。

**Context**：PRD 定义 ChangeAnalysis 管道为"关闭编辑器→AI 合并提取 ChangeFingerprint + ImpactPropagation→展示受影响章节→用户逐章 TargetedFix/跳过"。但（1）分析结果未定义存储位置，刷新即丢失；（2）任何编辑（包括改标点）都触发完整管道，浪费 token；（3）TargetedFix 执行后 Chapter 的状态流转未定义。

## Decision 1 — ChangeAnalysis 结果嵌入 Chapter 文档

Chapter 文档新增 `changeAnalysis` 嵌入子文档：

```typescript
{
  changeAnalysis?: {
    lastAnalyzedAt: Date;           // 最近一次分析时间
    sourceChangeFingerprint: string; // 本次变更指纹（约 100 tokens）
    impactedChapters: Array<{
      chapterId: ObjectId;
      chapterNumber: number;
      severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
      reason: string;               // 一句话冲突描述
      status: 'PENDING' | 'FIXED' | 'SKIPPED' | 'DEFERRED';
    }>;
  }
}
```

- `changeAnalysis` 存储在被修改的源 Chapter 上
- 受影响的下游 Chapter 通过 `chapterId` 引用定位，不需要额外的独立文档
- 用户可在源 Chapter 的编辑器中查看"影响分析面板"（展示 impactedChapters 列表 + 各章处理状态）
- 受影响章节的当前处理状态（PENDING/FIXED/SKIPPED/DEFERRED）随源 Chapter 的 changeAnalysis 一起持久化

**理由**：影响分析是源 Chapter 的"副作用"——跟着源 Chapter 存储最自然。受影响章节是只读引用，不需要反向索引。状态枚举放在源 Chapter 上避免了分布式状态同步。

## Decision 2 — 触发阈值：实质性变更检测

关闭编辑器时，比较编辑器内容与 Chapter.content 的差异：

| 差异类型 | 检测方式 | 行为 |
|---------|---------|------|
| 无变更 | 内容完全一致 | 跳过一切处理 |
| 仅空白变更 | trim 后一致 | 跳过 ChangeAnalysis，不更新任何状态 |
| 微小变更 | Levenshtein 距离 < 50 字符，且无段落新增/删除 | 跳过 ChangeAnalysis，但更新 Chapter.content（不触发状态变更） |
| 实质性变更 | 以上都不满足 | 触发完整 ChangeAnalysis 管道 |

- 段落新增/删除的判定：变更前后的段落数不一致，或任意段落内容差异 > 100 字符
- 跳过 ChangeAnalysis 时，Chapter 保持当前状态不变（COMPLETED 仍为 COMPLETED）
- 实质性变更触发时，被修改 Chapter 状态回退到 DRAFT——对已确认内容的实质性修改应重新进入生成→审核→确认管道，确保变更后的内容经过合规校验
- DRAFT 状态下的 Chapter（生成中或暂停中）不触发 ChangeAnalysis——ChangeAnalysis 仅适用于已确认（COMPLETED / DISPUTED）章节的修改。流式生成中途用户手动编辑后继续生成的行为不经过编辑器关闭事件，因此不触发变更分析

**理由**：对标点、空格、拼写修正等微操作不应该触发 AI 管道调用。50 字符 Levenshtein 阈值覆盖了大多数"改一句话"的场景。段落级变更检测防止用户在段间插入大量内容却未达到字符阈值的情况。

## Decision 3 — 受影响章节的处理流程

ChangeAnalysis 完成后，UI 展示受影响章节列表。用户逐章决策：

```
对每个受影响章节（按 chapterNumber 升序）：

  HIGH severity:
    → 推荐：TargetedFix（差异对比视图，确认后应用）
    → 备选：跳过（用户自担风险，标记为 SKIPPED + 记录跳过时间）
    → 不可 DEFERRED（HIGH 级别必须当场决策）

  MEDIUM severity:
    → 推荐：TargetedFix
    → 可 DEFERRED（标记稍后处理，下次打开任意章节编辑器时重新提醒）

  LOW severity:
    → 推荐：跳过
    → 可 TargetedFix
    → 可 DEFERRED

  NONE: 不展示在列表中（过滤掉）
```

**TargetedFix 执行**：
- AI 生成修补内容 → 差异对比视图（类似 git diff）→ 用户审查 → 确认后应用
- 修补后 Chapter 保持原状态不变（COMPLETED 仍为 COMPLETED，无需重新审核——修补仅修复不一致部分）
- Chapter 新增 `targetedFixHistory` 数组字段记录修补日志：

```typescript
{
  targetedFixHistory?: Array<{
    appliedAt: Date;
    sourceChapterId: ObjectId;   // 哪个 Chapter 的变更触发了此修补
    sourceChangeFingerprint: string;
    diffSummary: string;          // AI 生成的修补摘要
  }>;
}
```

**DEFERRED 章节的重新提醒**：
- 用户下次打开任意已 COMPLETED/DISPUTED 章节编辑器并关闭时，检查该 Chapter 所在 Project 中所有源 Chapter 的 changeAnalysis
- 如有 DEFERRED 条目指向当前章 → 再次弹出提醒

**理由**：
- HIGH 不可推迟——高严重度影响意味着叙事逻辑断裂（如角色已死亡但后续章节正常出场），必须当场解决
- MEDIUM 可推迟——中等影响（如角色头发颜色不一致）可以稍后处理，不阻塞当前工作流
- TargetedFix 不触发重新审核——修补是最小化修改，仅对齐不一致部分。如果修补引入了新内容，AI 在管道内自检即可
- targetedFixHistory 为每次修补保留溯源链

## Decision 4 — 清除陈旧 ChangeAnalysis

当源 Chapter 再次被修改并重新生成 ChangeAnalysis 时：
- 旧的 `changeAnalysis` 被完全覆盖
- 旧记录中标记为 DEFERRED 但尚未处理的条目：新分析结果中如仍存在同一 chapterId → 合并 severity（取较高者）和 reason；如不存在 → 丢弃（变更内容已不再影响该章）

当受影响 Chapter 被重新生成（用户主动重试、或因上游 Phase 回退变为 STALE 后重新生成）时：
- 该 Chapter 从所有源 Chapter 的 `changeAnalysis.impactedChapters` 中移除（新生成的 Chapter 已对齐最新上下文）

---

## Consequences

- Chapter schema 新增 `changeAnalysis` 和 `targetedFixHistory` 两个可选嵌入字段
- 编辑器关闭时需要 diff 计算（前端执行，无需后端参与）
- ChangeAnalysis 面板需要支持按 severity 分组展示 + 批量操作（如"全部 MEDIUM 章节标记 DEFERRED"）
- 无需新增独立 MongoDB 集合——数据跟随 Chapter 文档，查询通过 projectId + impactedChapters.chapterId 完成
- **与审核流程的并发交互**：当受影响章节正处于 REVIEWING 状态时，审核流程优先——先完成当前的审核决策。审核完成后：若章节内容在审核过程中被修改（用户采纳建议或手动修改），重新评估 TargetedFix 的必要性（内容已变更，原影响分析可能失效）；若审核直接通过（PASS → COMPLETED）且内容未变，按原 severity 继续 TargetedFix 流程
