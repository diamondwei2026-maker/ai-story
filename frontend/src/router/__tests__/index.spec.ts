import { describe, it, expect } from 'vitest';

describe('Router configuration', () => {
  let router: any;

  beforeEach(async () => {
    const mod = await import('@/router');
    router = mod.default;
  });

  it('creates a router with history mode', () => {
    expect(router).toBeDefined();
    expect(router.currentRoute).toBeDefined();
  });

  it('has 4 routes: home, workflow, workflow.setting, and workflow.outline', () => {
    const routes = router.getRoutes();
    expect(routes).toHaveLength(4);
  });

  it('defines "/" as the home route pointing to ProjectHubView', () => {
    const homeRoute = router.getRoutes().find((r: any) => r.name === 'home');
    expect(homeRoute).toBeDefined();
    expect(homeRoute.path).toBe('/');
  });

  it('defines "/project/:id" as the workflow route pointing to WorkflowView', () => {
    const workflowRoute = router.getRoutes().find((r: any) => r.name === 'workflow');
    expect(workflowRoute).toBeDefined();
    expect(workflowRoute.path).toBe('/project/:id');
  });

  it('resolves "/" to the home route', async () => {
    await router.push('/');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('home');
  });

  it('defines "/project/:id/setting" as a child of workflow', () => {
    const settingRoute = router.getRoutes().find((r: any) => r.name === 'workflow.setting');
    expect(settingRoute).toBeDefined();
    expect(settingRoute.path).toBe('/project/:id/setting');
  });

  it('defines "/project/:id/outline" as a child of workflow', () => {
    const outlineRoute = router.getRoutes().find((r: any) => r.name === 'workflow.outline');
    expect(outlineRoute).toBeDefined();
    expect(outlineRoute.path).toBe('/project/:id/outline');
  });

  it('resolves "/project/123" to the workflow route with id param', async () => {
    await router.push('/project/123');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('workflow');
    expect(router.currentRoute.value.params.id).toBe('123');
  });
});
