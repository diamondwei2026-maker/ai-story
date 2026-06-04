import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import ProjectHubView from '@/views/ProjectHubView.vue';
import WorkflowView from '@/views/WorkflowView.vue';
import IdeaView from '@/views/IdeaView.vue';
import SettingView from '@/views/SettingView.vue';
import OutlineView from '@/views/OutlineView.vue';
import BeatsView from '@/views/BeatsView.vue';
import DraftingView from '@/views/DraftingView.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: ProjectHubView,
  },
  {
    path: '/project/:id',
    name: 'workflow',
    component: WorkflowView,
    children: [
      {
        path: 'idea',
        name: 'workflow.idea',
        component: IdeaView,
        props: (route: RouteLocationNormalized) => ({ projectId: route.params.id as string }),
      },
      {
        path: 'setting',
        name: 'workflow.setting',
        component: SettingView,
        props: (route: RouteLocationNormalized) => ({ projectId: route.params.id as string }),
      },
      {
        path: 'outline',
        name: 'workflow.outline',
        component: OutlineView,
        props: (route: RouteLocationNormalized) => ({ projectId: route.params.id as string }),
      },
      {
        path: 'beats',
        name: 'workflow.beats',
        component: BeatsView,
        props: (route: RouteLocationNormalized) => ({ projectId: route.params.id as string }),
      },
      {
        path: 'drafting',
        name: 'workflow.drafting',
        component: DraftingView,
        props: (route: RouteLocationNormalized) => ({ projectId: route.params.id as string }),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
