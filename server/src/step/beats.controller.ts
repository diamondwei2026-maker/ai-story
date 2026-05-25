import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { StepService } from './step.service';
import { StepData, BeatData } from './step.entity';

@Controller('projects/:projectId/steps/beats')
export class BeatsController {
  constructor(private readonly stepService: StepService) {}

  @Post('generate')
  generate(
    @Param('projectId') projectId: string,
    @Body() body: { outline?: string; currentContent?: string },
  ): Promise<BeatData[]> {
    return this.stepService.generateBeats(projectId, body);
  }

  @Post('confirm')
  @HttpCode(200)
  confirm(@Param('projectId') projectId: string): Promise<StepData> {
    return this.stepService.confirmBeats(projectId);
  }

  @Post('reject')
  @HttpCode(200)
  reject(@Param('projectId') projectId: string): Promise<StepData> {
    return this.stepService.rejectBeats(projectId);
  }

  @Get()
  getBeats(@Param('projectId') projectId: string): BeatData[] {
    const beats = this.stepService.getBeatsByProjectId(projectId);
    if (beats.length === 0) {
      throw new NotFoundException('No BEATS step found for this project');
    }
    return beats;
  }
}

@Controller('beats')
export class BeatModificationController {
  constructor(private readonly stepService: StepService) {}

  @Patch(':id/wordcount')
  updateWordCount(
    @Param('id') id: string,
    @Body() body: { wordCount: number },
  ): Promise<BeatData> {
    return this.stepService.updateBeatWordCount(id, body.wordCount);
  }

  @Patch(':id/structure')
  updateStructure(
    @Param('id') id: string,
    @Body() plan: Record<string, unknown>,
  ): Promise<BeatData> {
    return this.stepService.updateBeatStructure(id, plan);
  }
}
