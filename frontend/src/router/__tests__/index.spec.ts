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

  it('has 7 routes: home, workflow, workflow.idea, workflow.setting, workflow.outline, workflow.beats, and workflow.drafting', () => {
    const routes = router.getRoutes();
    expect(routes).toHaveLength(7);
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

  it('defines "/project/:id/idea" as a child of workflow', () => {
    const ideaRoute = router.getRoutes().find((r: any) => r.name === 'workflow.idea');
    expect(ideaRoute).toBeDefined();
    expect(ideaRoute.path).toBe('/project/:id/idea');
  });

  it('resolves "/project/123/idea" to the IdeaView', async () => {
    await router.push('/project/123/idea');
    await router.isReady();
    expect(router.currentRoute.value.name).toBe('workflow.idea');
    expect(router.currentRoute.value.params.id).toBe('123');
  });

  it('defines "/project/:id/beats" as a child of workflow', () => {
    const beatsRoute = router.getRoutes().find((r: any) => r.name === 'workflow.beats');
    expect(beatsRoute).toBeDefined();
    expect(beatsRoute.path).toBe('/project/:id/beats');
  });

  it('defines "/project/:id/drafting" as a child of workflow', () => {
    const draftingRoute = router.getRoutes().find((r: any) => r.name === 'workflow.drafting');
    expect(draftingRoute).toBeDefined();
    expect(draftingRoute.path).toBe('/project/:id/drafting');
  });
});
