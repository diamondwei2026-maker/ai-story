import { Controller, Post, Body, Param, HttpCode } from '@nestjs/common';
import { StepService } from './step.service';
import { PhaseControllerBase } from './phase.controller.base';

@Controller('projects/:projectId/steps/outline')
export class OutlineController extends PhaseControllerBase {
  constructor(stepService: StepService) {
    super(stepService);
  }

  protected async doGenerate(projectId: string, body: any) {
    return this.stepService.generateOutline(projectId, body);
  }

  @Post('switch-structure')
  @HttpCode(200)
  async switchStructure(
    @Param('projectId') projectId: string,
    @Body() body: { structure: string },
  ) {
    return this.stepService.switchStructure(projectId, body.structure);
  }

  protected async doConfirm(projectId: string) {
    return this.stepService.confirmOutline(projectId);
  }

  protected async doReject(projectId: string) {
    return this.stepService.rejectOutline(projectId);
  }

  protected async doGet(projectId: string) {
    return this.stepService.getOutlineByProjectId(projectId) ?? null;
  }
}
