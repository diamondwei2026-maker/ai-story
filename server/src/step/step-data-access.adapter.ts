import { Injectable } from '@nestjs/common';
import { StepService } from './step.service';
import { IStepDataAccess } from '../ai-gateway/context-budget.service';

@Injectable()
export class StepDataAccessAdapter implements IStepDataAccess {
  constructor(private readonly stepService: StepService) {}

  async getChapter(projectId: string, chapterId: string) {
    const chapters = await this.stepService.getChaptersByProjectId(projectId);
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return null;
    return {
      chapterNumber: chapter.chapterNumber,
      beatPlan: chapter.beatPlan,
      content: chapter.content,
      contextSummary: chapter.contextSummary,
    };
  }

  async getPreviousChapter(projectId: string, chapterNumber: number) {
    if (chapterNumber <= 1) return null;
    const chapters = await this.stepService.getChaptersByProjectId(projectId);
    const prev = chapters.find((c) => c.chapterNumber === chapterNumber - 1);
    if (!prev) return null;
    return {
      content: prev.content,
      contextSummary: prev.contextSummary,
    };
  }

  async getBeat(projectId: string, chapterNumber: number) {
    const beats = await this.stepService.getBeatsByProjectId(projectId);
    const beat = beats.find((b) => b.chapterNumber === chapterNumber);
    if (!beat) return null;
    return {
      plan: beat.plan,
    };
  }

  async getIdeaStep(projectId: string) {
    const step = await this.stepService.getIdeaByProjectId(projectId);
    if (!step) return null;
    return {
      output: step.output,
    };
  }

  async getSettingStep(projectId: string) {
    const step = await this.stepService.getSettingByProjectId(projectId);
    if (!step) return null;
    return {
      output: step.output,
    };
  }

  async getFactsheet(projectId: string) {
    const sheet = this.stepService.getFactsheet(projectId);
    if (!sheet) return null;
    return {
      entries: sheet.data as Record<string, string>,
    };
  }
}
