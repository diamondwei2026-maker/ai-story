import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Project, ProjectStatus } from './project.entity';

@Injectable()
export class ProjectService {
  private projects: Map<string, Project> = new Map();

  create(data: { title: string; config?: Project['config'] }): Project {
    const now = new Date();
    const project: Project = {
      id: randomUUID(),
      title: data.title.trim(),
      status: 'IDEA' as ProjectStatus,
      config: data.config ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    return project;
  }

  findAll(): Project[] {
    return Array.from(this.projects.values()).filter(
      (p) => p.status !== 'ARCHIVED',
    );
  }

  findById(id: string): Project | null {
    return this.projects.get(id) ?? null;
  }

  update(
    id: string,
    data: { title?: string; config?: Project['config']; status?: Project['status'] },
  ): Project | null {
    const project = this.projects.get(id);
    if (!project) return null;
    if (data.title !== undefined) {
      project.title = data.title.trim();
    }
    if (data.config !== undefined) {
      project.config = data.config;
    }
    if (data.status !== undefined) {
      project.status = data.status;
    }
    project.updatedAt = new Date();
    return project;
  }

  delete(id: string): boolean {
    return this.projects.delete(id);
  }

  archive(id: string): Project | null {
    const project = this.projects.get(id);
    if (!project) return null;
    project.status = 'ARCHIVED' as ProjectStatus;
    project.updatedAt = new Date();
    return project;
  }

  restore(id: string): Project | null {
    const project = this.projects.get(id);
    if (!project || project.status !== 'ARCHIVED') return null;
    project.status = 'DRAFTING' as ProjectStatus;
    project.updatedAt = new Date();
    return project;
  }
}
