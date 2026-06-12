import { Controller } from '@nestjs/common';
import { StepService } from './step.service';
import { PhaseControllerBase } from './phase.controller.base';

@Controller('projects/:projectId/steps/setting')
export class SettingController extends PhaseControllerBase {
  constructor(stepService: StepService) {
    super(stepService);
  }

  protected async doGenerate(projectId: string, body: any) {
    return this.stepService.generateSetting(projectId, body);
  }

  protected async doConfirm(projectId: string) {
    return this.stepService.confirmSetting(projectId);
  }

  protected async doReject(projectId: string) {
    return this.stepService.rejectSetting(projectId);
  }

  protected async doGet(projectId: string) {
    return this.stepService.getSettingByProjectId(projectId) ?? null;
  }
}
