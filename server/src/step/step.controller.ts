import { Controller, NotFoundException } from '@nestjs/common';
import { StepService } from './step.service';
import { PhaseControllerBase } from './phase.controller.base';

@Controller('projects/:projectId/steps/setting')
export class SettingController extends PhaseControllerBase {
  constructor(stepService: StepService) {
    super(stepService);
  }

  protected doGenerate(projectId: string, body: any) {
    return this.stepService.generateSetting(projectId, body);
  }

  protected doConfirm(projectId: string) {
    return this.stepService.confirmSetting(projectId);
  }

  protected doReject(projectId: string) {
    return this.stepService.rejectSetting(projectId);
  }

  protected doGet(projectId: string) {
    const step = this.stepService.getSettingByProjectId(projectId);
    if (!step) throw new NotFoundException('No SETTING step found for this project');
    return step;
  }
}
