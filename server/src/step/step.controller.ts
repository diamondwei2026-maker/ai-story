import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { StepService } from './step.service';
import { StepData } from './step.entity';

@Controller('projects/:projectId/steps/setting')
export class StepController {
  constructor(private readonly stepService: StepService) {}

  @Post('generate')
  generate(
    @Param('projectId') projectId: string,
    @Body() body: { idea?: string; currentContent?: string },
  ): Promise<StepData> {
    return this.stepService.generateSetting(projectId, body);
  }

  @Post('confirm')
  @HttpCode(200)
  confirm(@Param('projectId') projectId: string): Promise<StepData> {
    return this.stepService.confirmSetting(projectId);
  }

  @Get()
  getSetting(@Param('projectId') projectId: string): StepData {
    const step = this.stepService.getSettingByProjectId(projectId);
    if (!step) {
      throw new NotFoundException('No SETTING step found for this project');
    }
    return step;
  }
}
