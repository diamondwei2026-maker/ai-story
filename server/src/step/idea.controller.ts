import { Controller, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { StepService } from './step.service';
import { PhaseControllerBase } from './phase.controller.base';

@Controller('projects/:projectId/steps/idea')
export class IdeaController extends PhaseControllerBase {
  constructor(stepService: StepService) {
    super(stepService);
  }

  protected doGenerate(projectId: string, body: any) {
    return this.stepService.generateIdea(projectId, body);
  }

  @Post('summary')
  summary(
    @Param('projectId') projectId: string,
    @Body() body: { selectedSellPoint?: number; customBrief?: string },
  ) {
    return this.stepService.generateIdeaSummary(projectId, body);
  }

  protected doConfirm(projectId: string, body: any) {
    return this.stepService.confirmIdea(projectId, body);
  }

  protected doReject(projectId: string) {
    return this.stepService.rejectIdea(projectId);
  }

  protected doGet(projectId: string) {
    const step = this.stepService.getIdeaByProjectId(projectId);
    if (!step) throw new NotFoundException('No IDEA step found for this project');
    return step;
  }
}
