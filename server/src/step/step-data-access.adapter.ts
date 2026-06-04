import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IStepDataAccess } from '../ai-gateway/context-budget.service';

@Injectable()
export class StepDataAccessAdapter implements IStepDataAccess {
  constructor(private readonly prisma: PrismaService) {}

  async getChapter(projectId: string, chapterId: string) {
    const doc = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!doc) return null;
    return {
      chapterNumber: (doc as unknown as Record<string, unknown>).chapterNumber as number,
      beatPlan: (doc as unknown as Record<string, unknown>).beatPlan as Record<string, unknown> | null,
      content: (doc as unknown as Record<string, unknown>).content as string | null,
      contextSummary: (doc as unknown as Record<string, unknown>).contextSummary as string | null,
    };
  }

  async getPreviousChapter(projectId: string, chapterNumber: number) {
    if (chapterNumber <= 1) return null;
    const doc = await this.prisma.chapter.findFirst({
      where: { projectId, chapterNumber: chapterNumber - 1 },
    });
    if (!doc) return null;
    return {
      content: (doc as unknown as Record<string, unknown>).content as string | null,
      contextSummary: (doc as unknown as Record<string, unknown>).contextSummary as string | null,
    };
  }

  async getBeat(projectId: string, chapterNumber: number) {
    const doc = await this.prisma.beat.findFirst({
      where: { projectId, chapterNumber },
    });
    if (!doc) return null;
    return {
      plan: (doc as unknown as Record<string, unknown>).plan as Record<string, unknown>,
    };
  }

  async getIdeaStep(projectId: string) {
    const doc = await this.prisma.stepData.findFirst({
      where: { projectId, phaseType: 'IDEA' },
      orderBy: { version: 'desc' },
    });
    if (!doc) return null;
    return {
      output: (doc as unknown as Record<string, unknown>).output as string | null,
    };
  }

  async getSettingStep(projectId: string) {
    const doc = await this.prisma.stepData.findFirst({
      where: { projectId, phaseType: 'SETTING' },
      orderBy: { version: 'desc' },
    });
    if (!doc) return null;
    return {
      output: (doc as unknown as Record<string, unknown>).output as string | null,
    };
  }

  async getFactsheet(projectId: string) {
    const doc = await this.prisma.factSheet.findUnique({ where: { projectId } });
    if (!doc) return null;
    return {
      entries: (doc as unknown as Record<string, unknown>).entries as Record<string, string>,
    };
  }
}
