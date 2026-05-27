# AI 网关：OpenRouter + LangChain 薄层封装

AI 调用层从「DeepSeek 代理 + OpenAI 兼容 SDK」切换为「OpenRouter 模型网关 + LangChain 薄层（仅 ChatModel + PromptTemplate）」，为多模型按任务路由和未来供应商切换保留灵活性。当前所有模型限定 DeepSeek 生态。

**Considered Options**：
- 直接调用 DeepSeek API（无网关）：最简洁，但无供应商切换能力，每次换模型需改代码。
- OpenRouter 直连（无 LangChain）：保留供应商灵活性，但 Prompt 模板管理需自建。
- LangChain 全量（Chain + Memory + Agent）：功能丰富但复杂度远超项目需求——AI 调用是线性管道，不需要 Chain/Agent 的动态路由。

**Consequences**：
- 模型分配由代码中的 `TaskType → ModelName` 集中映射（非模板文件声明），便于审计和测试。
- Prompt 模板存放在 `prompts/` 目录的独立 `.md` 文件中，与模型路由解耦。
- SSE 流式路径：NestJS `@Sse()` + RxJS Observable 包装 LangChain `.stream()` 的 AsyncIterable。
- 断点续传策略：已生成 ≥ 60% 回传全部内容续写，< 60% 直接重试，最多 3 次。（*Phase 1 已实现 `pauseChapterGeneration`/`continueChapterGeneration` 暂停续写流程；指数退避重试留待后续迭代。*）
- 未来切换到非 DeepSeek 模型只需修改路由 Map，不改 Prompt 文件。
