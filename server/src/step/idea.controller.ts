import { Controller, Post, Body, Param } from '@nestjs/common';
import { StepService } from './step.service';
import { PhaseControllerBase } from './phase.controller.base';

@Controller('projects/:projectId/steps/idea')
export class IdeaController extends PhaseControllerBase {
  constructor(stepService: StepService) {
    super(stepService);
  }

  protected async doGenerate(projectId: string, body: any) {
    return this.stepService.generateIdea(projectId, body);
  }

  @Post('summary')
  async summary(
    @Param('projectId') projectId: string,
    @Body() body: { selectedSellPoint?: number; customBrief?: string },
  ) {
    return this.stepService.generateIdeaSummary(projectId, body);
  }

  protected async doConfirm(projectId: string, body: any) {
    return this.stepService.confirmIdea(projectId, body);
  }

  protected async doReject(projectId: string) {
    return this.stepService.rejectIdea(projectId);
  }

  protected async doGet(projectId: string) {
    return this.stepService.getIdeaByProjectId(projectId) ?? null;
  }
}
