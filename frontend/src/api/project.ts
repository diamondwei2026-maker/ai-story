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

export async function getProject(projectId: string): Promise<Project> {
  return request(`/projects/${projectId}`);
}

export async function confirmCompletion(
  projectId: string,
  body: { action: string },
): Promise<{ status: string }> {
  return request(`/projects/${projectId}/complete`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function reopenProject(projectId: string): Promise<{ status: string }> {
  return request(`/projects/${projectId}/reopen`, {
    method: 'POST',
  });
}
