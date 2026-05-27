import { request } from './common';
import type { Project } from '@/stores/useProjectStore';

export async function createProject(title: string): Promise<Project> {
  return request('/projects', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function listProjects(): Promise<Project[]> {
  return request('/projects');
}
