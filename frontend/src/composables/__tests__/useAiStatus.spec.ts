import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('useAiStatus', () => {
  const mockAiMeta = {
    modelUsed: 'deepseek-r1',
    degraded: false,
  };

  const mockDegradedMeta = {
    modelUsed: 'deepseek-v3',
    degraded: true,
  };

  const mockFailedMeta = {
    modelUsed: 'deepseek-r1',
    degraded: true,
    failed: true,
  };

  beforeEach(() => {
    vi.resetModules();
  });

  it('应该导出 aiMeta 引用', async () => {
    const { useAiStatus } = await import('@/composables/useAiStatus');

    const { aiMeta } = useAiStatus();
    expect(aiMeta).toBeDefined();
  });

  it('应该导出 isUnavailable 引用，初始值为 false', async () => {
    const { useAiStatus } = await import('@/composables/useAiStatus');

    const { isUnavailable } = useAiStatus();
    expect(isUnavailable.value).toBe(false);
  });

  it('setAiMeta 应更新 aiMeta 值', async () => {
    const { useAiStatus } = await import('@/composables/useAiStatus');

    const { aiMeta, setAiMeta } = useAiStatus();
    setAiMeta(mockAiMeta);

    expect(aiMeta.value!).toEqual(mockAiMeta);
    expect(aiMeta.value!.modelUsed).toBe('deepseek-r1');
    expect(aiMeta.value!.degraded).toBe(false);
  });

  it('降级时 isDegraded 应为 true', async () => {
    const { useAiStatus } = await import('@/composables/useAiStatus');

    const { aiMeta, setAiMeta } = useAiStatus();
    setAiMeta(mockDegradedMeta);

    expect(aiMeta.value!.degraded).toBe(true);
  });

  it('setUnavailable(true) 后 isUnavailable 应为 true', async () => {
    const { useAiStatus } = await import('@/composables/useAiStatus');

    const { isUnavailable, setUnavailable } = useAiStatus();
    setUnavailable(true);

    expect(isUnavailable.value).toBe(true);
  });

  it('setUnavailable(false) 后 isUnavailable 应为 false', async () => {
    const { useAiStatus } = await import('@/composables/useAiStatus');

    const { isUnavailable, setUnavailable } = useAiStatus();
    setUnavailable(true);
    setUnavailable(false);

    expect(isUnavailable.value).toBe(false);
  });

  it('双模型均失败时 aiMeta.failed 为 true 且 isUnavailable 为 true', async () => {
    const { useAiStatus } = await import('@/composables/useAiStatus');

    const { aiMeta, isUnavailable, setAiMeta, setUnavailable } = useAiStatus();
    setAiMeta(mockFailedMeta);
    setUnavailable(true);

    expect(aiMeta.value!.failed).toBe(true);
    expect(isUnavailable.value).toBe(true);
  });

  it('clearAiStatus 应将状态重置为初始值', async () => {
    const { useAiStatus } = await import('@/composables/useAiStatus');

    const { aiMeta, isUnavailable, setAiMeta, setUnavailable, clearAiStatus } = useAiStatus();
    setAiMeta(mockFailedMeta);
    setUnavailable(true);
    clearAiStatus();

    expect(aiMeta.value).toBeNull();
    expect(isUnavailable.value).toBe(false);
  });
});
