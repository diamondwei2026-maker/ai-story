# Project Context

## 实体

### Project

核心聚合根。一个 Project 代表一部小说的完整创作生命周期。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 主键 |
| title | string | 作品标题 |
| status | ProjectStatus | 当前阶段状态 |
| config | { style?, platform?, genre?, defaultChapterWordCount? } | 创作配置（含全局默认章节字数） |
| pendingFactUpdates | PendingFactUpdate[] | FactSheet 补偿队列 |
| statusHistory | StatusHistoryEntry[] | 状态变更里程碑 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 最后更新时间 |

### ProjectStatus

```
IDEA → SETTING → OUTLINE → BEATS → DRAFTING → COMPLETED
                                                    ↓
                                               ARCHIVED
```

- **COMPLETED** 可逆：通过"继续创作"退回 DRAFTING，里程碑保留在 statusHistory
- **ARCHIVED** 可恢复：`restore()` 退回 DRAFTING

### StatusHistoryEntry

| 字段 | 类型 | 说明 |
|------|------|------|
| status | ProjectStatus | 进入的状态 |
| changedAt | string (ISO) | 变更时间 |
| reason | string | 变更原因 |

### PendingFactUpdate

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 条目 ID |
| chapterId | string | 来源章节 |
| chapterNumber | number | 章节序号 |
| entries | Record<string, unknown> | 待合并条目 |
| queuedAt | string (ISO) | 入队时间 |

## 服务

### ProjectService (`project.service.ts`)

- `create(data)` — 创建 Project，自动记录 IDEA 里程碑
- `findAll()` — 列出非 ARCHIVED 项目
- `findById(id)` — 按 ID 查询
- `update(id, data)` — 更新字段（title/config/status/pendingFactUpdates/statusHistory）
- `delete(id)` — 删除
- `archive(id)` — 归档（→ ARCHIVED）
- `restore(id)` — 恢复（ARCHIVED → DRAFTING）

## 已实现功能

- 项目管理 CRUD + 归档/恢复
- 状态流转与 statusHistory 里程碑记录（StatusHistoryEntry 独立接口导出）
- COMPLETED 完结流程（`confirmCompletion()` 显式确认、队列检查、`sync-and-complete` / `skip-and-complete` 三选项）
- "继续创作"（`reopenProject()`）退回 DRAFTING
- FactSheet 补偿队列（`pendingFactUpdates` 字段，乐观锁冲突后入队，下次成功写入时自动消费）
