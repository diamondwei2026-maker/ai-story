# CONTEXT-MAP

NovelCraft Pro — AI 长篇小说分步创作系统

## Contexts

- [project](src/project/CONTEXT.md) — 项目管理：Project 实体、CRUD、状态流转、里程碑
- [step](src/step/CONTEXT.md) — 创作管道：Phase 流转、Chapter 生命周期、审核、FactSheet、ChangeAnalysis、完结

## System-wide ADRs

| ADR | 主题 |
|-----|------|
| [0001](docs/adr/0001-chapter-referenced-storage.md) | 章节引用存储方案 |
| [0002](docs/adr/0002-fingerprint-factsheet-consistency.md) | 指纹与事实簿一致性 |
| [0003](docs/adr/0003-tiered-review-and-model-strategy.md) | 分层审核与模型策略 |
| [0004](docs/adr/0004-ai-gateway-langchain-openrouter.md) | AI Gateway 技术选型 |
| [0005](docs/adr/0005-state-machine-completeness.md) | 状态机闭环：审核决策、完结流程 |
| [0006](docs/adr/0006-change-analysis-lifecycle.md) | ChangeAnalysis 生命周期 |
| [0007](docs/adr/0007-runtime-guardrails.md) | 运行时护栏：上下文预算、补偿队列、模型容错 |
