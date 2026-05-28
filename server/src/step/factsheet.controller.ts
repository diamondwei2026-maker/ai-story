import { Controller, Post, Get, Param, HttpCode } from '@nestjs/common';
import { FactsheetCompensationService, QueueAlert } from './factsheet-compensation.service';
import { StepService } from './step.service';

@Controller('projects/:projectId')
export class FactsheetController {
  constructor(
    private readonly factsheetCompensation: FactsheetCompensationService,
    private readonly stepService: StepService,
  ) {}

  @Get('factsheet-alert')
  async getFactsheetAlert(@Param('projectId') projectId: string): Promise<QueueAlert> {
    return this.factsheetCompensation.getAlertLevel(projectId);
  }

  @Post('factsheet-force-sync')
  @HttpCode(200)
  async forceFactsheetSync(
    @Param('projectId') projectId: string,
  ): Promise<{ mergedEntries: Record<string, unknown>; consumedCount: number }> {
    return this.stepService.forceSyncFactsheet(projectId);
  }
}
