import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Project, ProjectStatus, PendingFactUpdate, StatusHistoryEntry } from './project.entity';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { title: string; config?: Project['config'] }): Promise<Project> {
    const now = new Date();
    const doc = await this.prisma.project.create({
      data: {
        title: data.title.trim(),
        status: 'IDEA',
        currentPhase: 'IDEA',
        config: (data.config ?? {}) as any,
        pendingFactUpdates: [],
        statusHistory: [
          {
            status: 'IDEA',
            changedAt: now.toISOString(),
            reason: 'Project created',
          },
        ],
      },
    });
    return this.toProject(doc);
  }

  async findAll(): Promise<Project[]> {
    const docs = await this.prisma.project.findMany({
      where: { status: { not: 'ARCHIVED' } },
      orderBy: { updatedAt: 'desc' },
    });
    return docs.map((d) => this.toProject(d));
  }

  async findById(id: string): Promise<Project | null> {
    const doc = await this.prisma.project.findUnique({ where: { id } });
    return doc ? this.toProject(doc) : null;
  }

  async update(
    id: string,
    data: {
      title?: string;
      config?: Project['config'];
      status?: Project['status'];
      pendingFactUpdates?: PendingFactUpdate[];
      statusHistory?: StatusHistoryEntry[];
    },
  ): Promise<Project | null> {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData['title'] = data.title.trim();
    if (data.config !== undefined) updateData['config'] = data.config;
    if (data.status !== undefined) updateData['status'] = data.status;
    if (data.pendingFactUpdates !== undefined) updateData['pendingFactUpdates'] = data.pendingFactUpdates;
    if (data.statusHistory !== undefined) updateData['statusHistory'] = data.statusHistory;

    const doc = await this.prisma.project.update({
      where: { id },
      data: updateData,
    });
    return this.toProject(doc);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.project.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async archive(id: string): Promise<Project | null> {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) return null;

    const doc = await this.prisma.project.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    return this.toProject(doc);
  }

  async restore(id: string): Promise<Project | null> {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing || existing.status !== 'ARCHIVED') return null;

    const doc = await this.prisma.project.update({
      where: { id },
      data: { status: 'DRAFTING' },
    });
    return this.toProject(doc);
  }

  private toProject(doc: Record<string, unknown>): Project {
    return {
      id: doc['id'] as string,
      title: doc['title'] as string,
      status: doc['status'] as ProjectStatus,
      config: (doc['config'] ?? {}) as Project['config'],
      pendingFactUpdates: (doc['pendingFactUpdates'] ?? []) as PendingFactUpdate[],
      statusHistory: (doc['statusHistory'] ?? []) as StatusHistoryEntry[],
      createdAt: new Date(doc['createdAt'] as string),
      updatedAt: new Date(doc['updatedAt'] as string),
    };
  }
}
