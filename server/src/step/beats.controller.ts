import { Controller, Patch, Body, Param } from '@nestjs/common';
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
