import { Controller, Patch, Body, Param, NotFoundException } from '@nestjs/common';
import { StepService } from './step.service';
import { PhaseControllerBase } from './phase.controller.base';

@Controller('projects/:projectId/steps/beats')
export class BeatsController extends PhaseControllerBase {
  constructor(stepService: StepService) {
    super(stepService);
  }

  protected doGenerate(projectId: string, body: any) {
    return this.stepService.generateBeats(projectId, body);
  }

  protected doConfirm(projectId: string) {
    return this.stepService.confirmBeats(projectId);
  }

  protected doReject(projectId: string) {
    return this.stepService.rejectBeats(projectId);
  }

  protected doGet(projectId: string) {
    const beats = this.stepService.getBeatsByProjectId(projectId);
    if (beats.length === 0) throw new NotFoundException('No BEATS step found for this project');
    return beats;
  }
}

@Controller('beats')
export class BeatModificationController {
  constructor(private readonly stepService: StepService) {}

  @Patch(':id/wordcount')
  updateWordCount(
    @Param('id') id: string,
    @Body() body: { wordCount: number },
  ) {
    return this.stepService.updateBeatWordCount(id, body.wordCount);
  }

  @Patch(':id/structure')
  updateStructure(
    @Param('id') id: string,
    @Body() plan: Record<string, unknown>,
  ) {
    return this.stepService.updateBeatStructure(id, plan);
  }
}
