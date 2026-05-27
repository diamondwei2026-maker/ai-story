import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
} from '@nestjs/common';
import { FactsheetCompensationService, QueueAlert, ConsumeResult } from './factsheet-compensation.service';
import { StepService } from './step.service';

@Controller('projects/:projectId')
export class FactsheetController {
  constructor(
    private readonly factsheetCompensation: FactsheetCompensationService,
    private readonly stepService: StepService,
  ) {}

  @Get('factsheet-alert')
  getFactsheetAlert(@Param('projectId') projectId: string): QueueAlert {
    return this.factsheetCompensation.getAlertLevel(projectId);
  }

  @Post('factsheet-force-sync')
  @HttpCode(200)
  forceFactsheetSync(
    @Param('projectId') projectId: string,
  ): { mergedEntries: Record<string, unknown>; consumedCount: number } {
    return this.stepService.forceSyncFactsheet(projectId);
  }
}
