import { createRouter, createWebHistory } from 'vue-router';
import ProjectHubView from '@/views/ProjectHubView.vue';
import WorkflowView from '@/views/WorkflowView.vue';
import SettingView from '@/views/SettingView.vue';

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
        path: 'setting',
        name: 'workflow.setting',
        component: SettingView,
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
