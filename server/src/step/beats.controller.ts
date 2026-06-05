import { Controller, Patch, Post, Body, Param, HttpCode } from '@nestjs/common';
import { StepService } from './step.service';
import { PhaseControllerBase } from './phase.controller.base';

@Controller('projects/:projectId/steps/beats')
export class BeatsController extends PhaseControllerBase {
  constructor(stepService: StepService) {
    super(stepService);
  }

  protected async doGenerate(projectId: string, body: any) {
    return this.stepService.generateBeats(projectId, body);
  }

  protected async doConfirm(projectId: string) {
    return this.stepService.confirmBeats(projectId);
  }

  protected async doReject(projectId: string) {
    return this.stepService.rejectBeats(projectId);
  }

  protected async doGet(projectId: string) {
    return this.stepService.getBeatsByProjectId(projectId);
  }

  // ─── Issue #26 Phase 1: Beat Adjust & Batch Adjust ──────────

  @Post(':beatId/adjust')
  @HttpCode(200)
  async adjustBeat(
    @Param('projectId') projectId: string,
    @Param('beatId') beatId: string,
    @Body() body: { feedback: string },
  ) {
    return this.stepService.adjustBeat(projectId, beatId, body.feedback);
  }

  @Post('batch-adjust')
  @HttpCode(200)
  async batchAdjustBeats(
    @Param('projectId') projectId: string,
    @Body() body: { startChapter: number; endChapter: number; problemDescription: string },
  ) {
    return this.stepService.batchAdjustBeats(
      projectId,
      body.startChapter,
      body.endChapter,
      body.problemDescription,
    );
  }
}

@Controller('beats')
export class BeatModificationController {
  constructor(private readonly stepService: StepService) {}

  @Patch(':id/wordcount')
  async updateWordCount(
    @Param('id') id: string,
    @Body() body: { wordCount: number },
  ) {
    return this.stepService.updateBeatWordCount(id, body.wordCount);
  }

  @Patch(':id/structure')
  async updateStructure(
    @Param('id') id: string,
    @Body() plan: Record<string, unknown>,
  ) {
    return this.stepService.updateBeatStructure(id, plan);
  }
}
