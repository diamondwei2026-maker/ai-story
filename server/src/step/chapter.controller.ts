import { Controller, Post, Get, Body, Param, HttpCode } from '@nestjs/common';
import { StepService } from './step.service';
import { ChangeAnalysisService, AnalyzeChangeResult, TargetedFixResult } from './change-analysis.service';
import { ReviewService } from './review.service';
import type { ReviewResult } from './entities/review.types';
import { ChapterData } from './step.entity';

@Controller('projects/:projectId/chapters')
export class ChapterController {
  constructor(
    private readonly stepService: StepService,
    private readonly changeAnalysisService: ChangeAnalysisService,
    private readonly reviewService: ReviewService,
  ) {}

  @Get()
  async getChapters(@Param('projectId') projectId: string): Promise<ChapterData[]> {
    return this.stepService.getChaptersByProjectId(projectId);
  }

  @Post(':chapterId/generate')
  async generate(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
    @Body() body: { mode: 'new-continue' | 'paragraph-rewrite' | 'style-upgrade'; feedback?: string },
  ): Promise<ChapterData> {
    return this.stepService.generateChapter(projectId, chapterId, body);
  }

  @Post(':chapterId/confirm')
  @HttpCode(200)
  async confirm(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
  ): Promise<ChapterData> {
    return this.stepService.confirmChapter(projectId, chapterId);
  }

  @Post(':chapterId/dispute')
  @HttpCode(200)
  async dispute(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
  ): Promise<ChapterData> {
    return this.stepService.disputeChapter(projectId, chapterId);
  }

  @Post(':chapterId/pause')
  @HttpCode(200)
  async pause(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
  ): Promise<ChapterData> {
    return this.stepService.pauseChapterGeneration(projectId, chapterId);
  }

  @Post(':chapterId/continue')
  async continue_(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
    @Body() body: { currentContent: string },
  ): Promise<ChapterData> {
    return this.stepService.continueChapterGeneration(projectId, chapterId, body);
  }

  @Post(':chapterId/retry')
  async retry(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
    @Body() body: { mode: 'new-continue' | 'paragraph-rewrite' | 'style-upgrade'; feedback?: string },
  ): Promise<ChapterData> {
    return this.stepService.retryChapterGeneration(projectId, chapterId, body);
  }

  @Post(':chapterId/review')
  @HttpCode(200)
  async review(
    @Param('projectId') _projectId: string,
    @Param('chapterId') chapterId: string,
  ): Promise<ReviewResult> {
    return this.reviewService.evaluateChapter(chapterId);
  }

  @Post(':chapterId/analyze-change')
  @HttpCode(200)
  async analyzeChange(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
    @Body() body: { newContent: string },
  ): Promise<AnalyzeChangeResult> {
    return this.changeAnalysisService.analyzeChange(projectId, chapterId, body.newContent);
  }

  @Post(':chapterId/targeted-fix')
  @HttpCode(200)
  async applyTargetedFix(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
    @Body() body: { impactedChapterId: string },
  ): Promise<TargetedFixResult> {
    return this.changeAnalysisService.applyTargetedFix(projectId, chapterId, body.impactedChapterId);
  }
}
