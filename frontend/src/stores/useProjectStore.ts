import { defineStore } from 'pinia';
import { ref } from 'vue';
import { loadJSON, saveJSON } from './persist';

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

const STORAGE_KEY = 'projectStore';
const FALLBACK: PersistedState = { projects: [], currentProject: null };

function persist(projects: Project[], currentProject: Project | null) {
  saveJSON(STORAGE_KEY, { projects, currentProject });
}

export const useProjectStore = defineStore('projectStore', () => {
  const persisted = loadJSON(STORAGE_KEY, FALLBACK);

  const projects = ref<Project[]>(persisted.projects);
  const currentProject = ref<Project | null>(persisted.currentProject);

  function setProjects(list: Project[]) {
    projects.value = list;
    persist(projects.value, currentProject.value);
  }

  function setCurrentProject(id: string) {
    currentProject.value = projects.value.find((p) => p.id === id) ?? null;
    persist(projects.value, currentProject.value);
  }

  function clearCurrentProject() {
    currentProject.value = null;
    persist(projects.value, currentProject.value);
  }

  return { projects, currentProject, setProjects, setCurrentProject, clearCurrentProject };
});
