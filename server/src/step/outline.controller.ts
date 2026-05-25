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

@Controller('projects/:projectId/steps/outline')
export class OutlineController {
  constructor(private readonly stepService: StepService) {}

  @Post('generate')
  generate(
    @Param('projectId') projectId: string,
    @Body() body: { setting?: string; structure?: string; currentContent?: string },
  ): Promise<StepData> {
    return this.stepService.generateOutline(projectId, body);
  }

  @Post('confirm')
  @HttpCode(200)
  confirm(@Param('projectId') projectId: string): Promise<StepData> {
    return this.stepService.confirmOutline(projectId);
  }

  @Post('reject')
  @HttpCode(200)
  reject(@Param('projectId') projectId: string): Promise<StepData> {
    return this.stepService.rejectOutline(projectId);
  }

  @Post('switch-structure')
  @HttpCode(200)
  switchStructure(
    @Param('projectId') projectId: string,
    @Body() body: { structure: string },
  ): Promise<StepData> {
    return this.stepService.switchStructure(projectId, body.structure);
  }

  @Get()
  getOutline(@Param('projectId') projectId: string): StepData {
    const step = this.stepService.getOutlineByProjectId(projectId);
    if (!step) {
      throw new NotFoundException('No OUTLINE step found for this project');
    }
    return step;
  }
}
