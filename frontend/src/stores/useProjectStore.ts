import { defineStore } from 'pinia';
import { ref } from 'vue';
import { createStorePersistence } from './persist';
import * as projectApi from '@/api/project';

export interface Project {
  id: string;
  title: string;
  status: 'IDEA' | 'SETTING' | 'OUTLINE' | 'BEATS' | 'DRAFTING' | 'COMPLETED' | 'ARCHIVED';
  config: { style?: string; platform?: string; genre?: string };
  createdAt: string;
  updatedAt: string;
}

interface PersistedState {
  projects: Project[];
  currentProject: Project | null;
}

const storePersist = createStorePersistence<PersistedState>('projectStore', {
  projects: [],
  currentProject: null,
});

export const useProjectStore = defineStore('projectStore', () => {
  const persisted = storePersist.load();

  const projects = ref<Project[]>(persisted.projects);
  const currentProject = ref<Project | null>(persisted.currentProject);

  function setProjects(list: Project[]) {
    projects.value = list;
    storePersist.save({ projects: projects.value, currentProject: currentProject.value });
  }

  function setCurrentProject(id: string) {
    currentProject.value = projects.value.find((p) => p.id === id) ?? null;
    storePersist.save({ projects: projects.value, currentProject: currentProject.value });
  }

  function clearCurrentProject() {
    currentProject.value = null;
    storePersist.save({ projects: projects.value, currentProject: currentProject.value });
  }

  async function createProject(title: string): Promise<Project> {
    const project = await projectApi.createProject(title);
    projects.value.push(project);
    storePersist.save({ projects: projects.value, currentProject: currentProject.value });
    return project;
  }

  async function loadProjects(): Promise<void> {
    const list = await projectApi.listProjects();
    projects.value = list;
    storePersist.save({ projects: projects.value, currentProject: currentProject.value });
  }

  return { projects, currentProject, setProjects, setCurrentProject, clearCurrentProject, createProject, loadProjects };
});
