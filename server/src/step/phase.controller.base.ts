import { Post, Get, Body, Param, HttpCode } from '@nestjs/common';
import { StepService } from './step.service';

export abstract class PhaseControllerBase {
  constructor(protected readonly stepService: StepService) {}

  protected abstract doGenerate(projectId: string, body: any): Promise<any>;
  protected abstract doConfirm(projectId: string, body?: any): Promise<any>;
  protected abstract doReject(projectId: string): Promise<any>;
  protected abstract doGet(projectId: string): any;

  @Post('generate')
  generate(@Param('projectId') projectId: string, @Body() body: any) {
    return this.doGenerate(projectId, body);
  }

  @Post('confirm')
  @HttpCode(200)
  confirm(@Param('projectId') projectId: string, @Body() body?: any) {
    return this.doConfirm(projectId, body);
  }

  @Post('reject')
  @HttpCode(200)
  reject(@Param('projectId') projectId: string) {
    return this.doReject(projectId);
  }

  @Get()
  getPhaseData(@Param('projectId') projectId: string) {
    return this.doGet(projectId);
  }
}
