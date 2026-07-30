import { request } from './common';
import type { Project } from '@/stores/useProjectStore';

export async function createProject(input: {
  title: string;
  genre?: string;
  skipIdea?: boolean;
  description?: string;
}): Promise<Project> {
  return request('/projects', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      config: input.genre ? { genre: input.genre } : undefined,
      skipIdea: input.skipIdea,
      description: input.description,
    }),
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

export async function deleteProject(projectId: string): Promise<void> {
  return request(`/projects/${projectId}`, { method: 'DELETE' });
}

export async function updateProject(
  projectId: string,
  body: { title?: string; config?: Project['config'] },
): Promise<Project> {
  return request(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function archiveProject(projectId: string): Promise<Project> {
  return request(`/projects/${projectId}/archive`, { method: 'POST' });
}

export async function restoreProject(projectId: string): Promise<Project> {
  return request(`/projects/${projectId}/restore`, { method: 'POST' });
}
