import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { lastValueFrom, Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { StepData } from './step.entity';
import { ProjectService } from '../project/project.service';
import {
  AIGatewayService,
  TaskType,
  AIGenerateChunk,
} from '../ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../ai-gateway/prompt-template-loader.service';

const POWER_SYSTEM_REDLINES: { label: string; keywords: string[] }[] = [
  { label: '禁止宣扬暴力至上', keywords: ['暴力至上', '以暴制暴', '暴力崇拜'] },
  { label: '禁止详细描述邪术修炼方法', keywords: ['邪术修炼', '血祭', '生魂'] },
  { label: '禁止贬低现实制度', keywords: ['颠覆政权', '反动', '颠覆国家'] },
];

@Injectable()
export class StepService {
  private steps: Map<string, StepData> = new Map();

  constructor(
    private readonly projectService: ProjectService,
    private readonly aiGateway: AIGatewayService,
    private readonly promptLoader: PromptTemplateLoaderService,
  ) {}

  async generateSetting(
    projectId: string,
    opts: { idea?: string; currentContent?: string },
  ): Promise<StepData> {
    const project = this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.status !== 'SETTING') {
      throw new BadRequestException('Project status must be SETTING');
    }

    const idea = opts.idea ?? '';
    const currentContent = opts.currentContent ?? '';
    const prompt = this.promptLoader.renderTemplate(
      'creation',
      'setting-generation',
      { idea, currentContent },
    );

    const chunks$: Observable<AIGenerateChunk> = this.aiGateway.generate({
      taskType: TaskType.SETTING,
      prompt,
    });

    const chunks = await lastValueFrom(chunks$.pipe(toArray()));
    const output = chunks
      .map((c) => c.content)
      .join('');

    const review = {
      powerSystemCheck: this.runPowerSystemCheck(output),
      annotations: 'AI 生成内容，仅供参考',
    };

    const step: StepData = {
      id: randomUUID(),
      projectId,
      phaseType: 'SETTING',
      status: 'AWAITING_REVIEW',
      input: currentContent
        ? `${idea}\n\n--- 用户编辑内容 ---\n${currentContent}`
        : idea,
      output,
      review,
      version: 1,
      confirmedAt: null,
    };

    this.steps.set(step.id, step);
    return step;
  }

  async confirmSetting(projectId: string): Promise<StepData> {
    const existing = this.getSettingByProjectId(projectId);
    if (!existing) {
      throw new BadRequestException('No generated setting to confirm');
    }
    if (existing.status === 'CONFIRMED') {
      throw new BadRequestException('Setting already confirmed');
    }

    existing.status = 'CONFIRMED';
    existing.confirmedAt = new Date();

    this.projectService.update(projectId, { status: 'OUTLINE' });

    return existing;
  }

  getSettingByProjectId(projectId: string): StepData | null {
    for (const step of this.steps.values()) {
      if (step.projectId === projectId && step.phaseType === 'SETTING') {
        return step;
      }
    }
    return null;
  }

  private runPowerSystemCheck(output: string): Record<string, unknown> {
    const flags: string[] = [];
    for (const redline of POWER_SYSTEM_REDLINES) {
      const matched = redline.keywords.some((kw) => output.includes(kw));
      if (matched) {
        flags.push(redline.label);
      }
    }
    return {
      passed: flags.length === 0,
      flags,
      checkedAt: new Date().toISOString(),
    };
  }
}
