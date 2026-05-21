import { createRouter, createWebHistory } from 'vue-router';
import ProjectHubView from '@/views/ProjectHubView.vue';
import WorkflowView from '@/views/WorkflowView.vue';

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
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
