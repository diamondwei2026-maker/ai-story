import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Project } from './project.entity';

@Injectable()
export class ProjectService {
  private projects: Map<string, Project> = new Map();

  create(data: { title: string; config?: Project['config'] }): Project {
    const now = new Date();
    const project: Project = {
      id: randomUUID(),
      title: data.title.trim(),
      status: 'IDEA',
      config: data.config ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    return project;
  }
}
