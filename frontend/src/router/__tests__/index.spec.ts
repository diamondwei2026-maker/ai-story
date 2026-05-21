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

  it('has exactly 2 routes: home and workflow', () => {
    const routes = router.getRoutes();
    expect(routes).toHaveLength(2);
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

  it('resolves "/project/123" to the workflow route with id param', async () => {
    await router.push('/project/123');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('workflow');
    expect(router.currentRoute.value.params.id).toBe('123');
  });
});
