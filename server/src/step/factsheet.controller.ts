import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
} from '@nestjs/common';
import { FactsheetCompensationService, QueueAlert, ConsumeResult } from './factsheet-compensation.service';

@Controller('projects/:projectId')
export class FactsheetController {
  constructor(
    private readonly factsheetCompensation: FactsheetCompensationService,
  ) {}

  @Get('factsheet-alert')
  getFactsheetAlert(@Param('projectId') projectId: string): QueueAlert {
    return this.factsheetCompensation.getAlertLevel(projectId);
  }

  @Post('factsheet-force-sync')
  @HttpCode(200)
  forceFactsheetSync(@Param('projectId') projectId: string): ConsumeResult {
    return this.factsheetCompensation.forceSync(projectId, {});
  }
}
