import { createRouter, createWebHistory } from 'vue-router';
import ProjectHubView from '@/views/ProjectHubView.vue';
import WorkflowView from '@/views/WorkflowView.vue';
import IdeaView from '@/views/IdeaView.vue';
import SettingView from '@/views/SettingView.vue';
import OutlineView from '@/views/OutlineView.vue';

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
        props: (route) => ({ projectId: route.params.id }),
      },
      {
        path: 'setting',
        name: 'workflow.setting',
        component: SettingView,
        props: (route) => ({ projectId: route.params.id }),
      },
      {
        path: 'outline',
        name: 'workflow.outline',
        component: OutlineView,
        props: (route) => ({ projectId: route.params.id }),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
