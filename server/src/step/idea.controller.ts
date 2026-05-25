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

@Controller('projects/:projectId/steps/idea')
export class IdeaController {
  constructor(private readonly stepService: StepService) {}

  @Post('generate')
  generate(
    @Param('projectId') projectId: string,
    @Body() body: { idea?: string; feedback?: string },
  ): Promise<StepData> {
    return this.stepService.generateIdea(projectId, body);
  }

  @Post('summary')
  summary(
    @Param('projectId') projectId: string,
    @Body() body: { selectedSellPoint?: number; customBrief?: string },
  ): Promise<StepData> {
    return this.stepService.generateIdeaSummary(projectId, body);
  }

  @Post('confirm')
  @HttpCode(200)
  confirm(
    @Param('projectId') projectId: string,
    @Body() body: { selectedSellPoint: number; customBrief?: string },
  ): Promise<StepData> {
    return this.stepService.confirmIdea(projectId, body);
  }

  @Post('reject')
  @HttpCode(200)
  reject(@Param('projectId') projectId: string): Promise<StepData> {
    return this.stepService.rejectIdea(projectId);
  }

  @Get()
  getIdea(@Param('projectId') projectId: string): StepData {
    const step = this.stepService.getIdeaByProjectId(projectId);
    if (!step) {
      throw new NotFoundException('No IDEA step found for this project');
    }
    return step;
  }
}
