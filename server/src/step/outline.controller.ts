import { Controller, Post, Body, Param, NotFoundException, HttpCode } from '@nestjs/common';
import { StepService } from './step.service';
import { PhaseControllerBase } from './phase.controller.base';

@Controller('projects/:projectId/steps/outline')
export class OutlineController extends PhaseControllerBase {
  constructor(stepService: StepService) {
    super(stepService);
  }

  protected doGenerate(projectId: string, body: any) {
    return this.stepService.generateOutline(projectId, body);
  }

  @Post('switch-structure')
  @HttpCode(200)
  switchStructure(
    @Param('projectId') projectId: string,
    @Body() body: { structure: string },
  ) {
    return this.stepService.switchStructure(projectId, body.structure);
  }

  protected doConfirm(projectId: string) {
    return this.stepService.confirmOutline(projectId);
  }

  protected doReject(projectId: string) {
    return this.stepService.rejectOutline(projectId);
  }

  protected doGet(projectId: string) {
    const step = this.stepService.getOutlineByProjectId(projectId);
    if (!step) throw new NotFoundException('No OUTLINE step found for this project');
    return step;
  }
}
