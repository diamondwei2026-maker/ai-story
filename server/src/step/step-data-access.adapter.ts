import { Injectable } from '@nestjs/common';
import { StepService } from './step.service';
import { IStepDataAccess } from '../ai-gateway/context-budget.service';

@Injectable()
export class StepDataAccessAdapter implements IStepDataAccess {
  constructor(private readonly stepService: StepService) {}

  getChapter(projectId: string, chapterId: string) {
    // Synchronous adapter — returns cached data only
    // Async access should go through StepService directly
    return null;
  }

  getPreviousChapter(projectId: string, chapterNumber: number) {
    return null;
  }

  getBeat(projectId: string, chapterNumber: number) {
    return null;
  }

  getIdeaStep(projectId: string) {
    return null;
  }

  getSettingStep(projectId: string) {
    return null;
  }

  getFactsheet(projectId: string) {
    return null;
  }
}
