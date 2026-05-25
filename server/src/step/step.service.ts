import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { lastValueFrom, Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { StepData, PhaseType } from './step.entity';
import { ProjectService } from '../project/project.service';
import { ProjectStatus } from '../project/project.entity';
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

const VALID_STRUCTURES = ['three-act', 'web-novel-ten', 'four-act-eight'] as const;
type OutlineStructure = (typeof VALID_STRUCTURES)[number];

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

    const existing = this.getSettingByProjectId(projectId);
    const step = existing ?? this.createPendingStep(projectId, 'SETTING');

    const idea = opts.idea ?? '';
    const currentContent = opts.currentContent ?? '';
    const prompt = this.promptLoader.renderTemplate(
      'creation',
      'setting-generation',
      { idea, currentContent },
    );

    step.status = 'AI_GENERATING';
    const output = await this.collectAiOutput(TaskType.SETTING, prompt);

    step.status = 'AWAITING_REVIEW';
    step.output = output;
    step.input = currentContent
      ? `${idea}\n\n--- 用户编辑内容 ---\n${currentContent}`
      : idea;
    step.review = {
      powerSystemCheck: this.runPowerSystemCheck(output),
      annotations: 'AI 生成内容，仅供参考',
    };
    step.version += 1;

    this.steps.set(step.id, step);
    return step;
  }

  async confirmSetting(projectId: string): Promise<StepData> {
    return this.confirmPhase(projectId, 'SETTING', 'OUTLINE', 'setting');
  }

  async rejectSetting(projectId: string): Promise<StepData> {
    return this.rejectPhase(projectId, 'SETTING', 'setting');
  }

  getStepByProjectId(projectId: string, phaseType: PhaseType): StepData | null {
    for (const step of this.steps.values()) {
      if (step.projectId === projectId && step.phaseType === phaseType) {
        return step;
      }
    }
    return null;
  }

  getSettingByProjectId(projectId: string): StepData | null {
    return this.getStepByProjectId(projectId, 'SETTING');
  }

  getOutlineByProjectId(projectId: string): StepData | null {
    return this.getStepByProjectId(projectId, 'OUTLINE');
  }

  // ─── OUTLINE Phase ──────────────────────────────────────────

  async generateOutline(
    projectId: string,
    opts: { setting?: string; structure?: string; currentContent?: string },
  ): Promise<StepData> {
    const project = this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.status !== 'OUTLINE') {
      throw new BadRequestException('Project status must be OUTLINE');
    }

    const setting = opts.setting ?? '';
    const structure = opts.structure ?? 'three-act';
    if (!VALID_STRUCTURES.includes(structure as OutlineStructure)) {
      throw new BadRequestException('Invalid structure type');
    }
    const currentContent = opts.currentContent ?? '';

    const existing = this.getOutlineByProjectId(projectId);
    const step = existing ?? this.createPendingStep(projectId, 'OUTLINE');

    const prompt = this.promptLoader.renderTemplate(
      'creation',
      'outline-generation',
      { setting, structure, currentContent },
    );

    step.status = 'AI_GENERATING';
    const output = await this.collectAiOutput(TaskType.OUTLINE, prompt);

    step.status = 'AWAITING_REVIEW';
    step.output = output;
    step.input = currentContent
      ? `structure: ${structure}\nsetting: ${setting}\n\n--- 用户编辑内容 ---\n${currentContent}`
      : `structure: ${structure}\nsetting: ${setting}`;
    step.review = {
      structurePacing: this.runPacingReview(output),
      conflictReview: this.runConflictReview(output),
      climaxReview: this.runClimaxReview(output),
      annotations: 'AI 生成内容，仅供参考',
    };
    step.version += 1;

    this.steps.set(step.id, step);
    return step;
  }

  async confirmOutline(projectId: string): Promise<StepData> {
    return this.confirmPhase(projectId, 'OUTLINE', 'BEATS', 'outline');
  }

  async rejectOutline(projectId: string): Promise<StepData> {
    return this.rejectPhase(projectId, 'OUTLINE', 'outline');
  }

  async switchStructure(
    projectId: string,
    newStructure: string,
  ): Promise<StepData> {
    const existing = this.getOutlineByProjectId(projectId);
    if (!existing) {
      throw new BadRequestException('No generated outline to switch');
    }
    if (existing.status === 'CONFIRMED') {
      throw new BadRequestException('Outline already confirmed');
    }
    if (!VALID_STRUCTURES.includes(newStructure as OutlineStructure)) {
      throw new BadRequestException('Invalid structure type');
    }

    const existingOutput = existing.output ?? '';
    const keyPoints = this.extractKeyPlotPoints(existingOutput);
    existing.status = 'AI_GENERATING';

    const prompt = this.promptLoader.renderTemplate(
      'creation',
      'outline-generation',
      {
        setting: '',
        structure: newStructure,
        currentContent: existingOutput,
        keyPoints: keyPoints || '（无已识别的情节点种子）',
      },
    );

    const output = await this.collectAiOutput(TaskType.OUTLINE, prompt);

    const review = {
      structurePacing: this.runPacingReview(output),
      conflictReview: this.runConflictReview(output),
      climaxReview: this.runClimaxReview(output),
      annotations: 'AI 生成内容，仅供参考',
    };

    existing.output = output;
    existing.review = review;
    existing.version += 1;
    existing.status = 'AWAITING_REVIEW';
    existing.input = `structure: ${newStructure}\nkeyPoints preserved: ${keyPoints}`;

    return existing;
  }

  private async confirmPhase(
    projectId: string,
    phaseType: PhaseType,
    nextStatus: ProjectStatus,
    label: string,
  ): Promise<StepData> {
    const existing = this.getStepByProjectId(projectId, phaseType);
    if (!existing) {
      throw new BadRequestException(`No generated ${label} to confirm`);
    }
    if (existing.status === 'CONFIRMED') {
      throw new BadRequestException(`${label} already confirmed`);
    }
    if (existing.status !== 'AWAITING_REVIEW') {
      throw new BadRequestException(
        `${label} must be AWAITING_REVIEW to confirm (current: ${existing.status})`,
      );
    }
    existing.status = 'CONFIRMED';
    existing.confirmedAt = new Date();
    this.projectService.update(projectId, { status: nextStatus });
    return existing;
  }

  private async rejectPhase(
    projectId: string,
    phaseType: PhaseType,
    label: string,
  ): Promise<StepData> {
    const existing = this.getStepByProjectId(projectId, phaseType);
    if (!existing) {
      throw new BadRequestException(`No generated ${label} to reject`);
    }
    if (existing.status === 'CONFIRMED') {
      throw new BadRequestException(`${label} already confirmed`);
    }
    if (existing.status === 'REJECTED') {
      throw new BadRequestException(`${label} already rejected`);
    }
    existing.status = 'REJECTED';
    return existing;
  }

  private createPendingStep(projectId: string, phaseType: PhaseType): StepData {
    const step: StepData = {
      id: randomUUID(),
      projectId,
      phaseType,
      status: 'PENDING',
      input: null,
      output: null,
      review: null,
      version: 0,
      confirmedAt: null,
    };
    this.steps.set(step.id, step);
    return step;
  }

  private async collectAiOutput(taskType: TaskType, prompt: string): Promise<string> {
    const chunks$: Observable<AIGenerateChunk> = this.aiGateway.generate({
      taskType,
      prompt,
    });
    const chunks = await lastValueFrom(chunks$.pipe(toArray()));
    return chunks.map((c) => c.content).join('');
  }

  private extractKeyPlotPoints(output: string): string {
    const lines = output.split('\n').filter((l) => l.match(/情节点\d+/));
    return lines.join('\n');
  }

  private runPacingReview(output: string): Record<string, unknown> {
    const hasMultiAct = /第[一二三四五六七八九十]幕|第[一二三四五六七八九十]章/.test(output);
    return {
      passed: hasMultiAct,
      score: hasMultiAct ? 85 : 50,
      notes: hasMultiAct ? '节奏分布合理' : '缺少多幕/章结构',
    };
  }

  private runConflictReview(output: string): Record<string, unknown> {
    const hasConflict = /冲突|矛盾|对抗|危机|敌人|反派/.test(output);
    return {
      passed: hasConflict,
      notes: hasConflict ? '冲突要素存在' : '缺少冲突要素',
    };
  }

  private runClimaxReview(output: string): Record<string, unknown> {
    const hasClimax = /高潮|决战|终极|巅峰/.test(output);
    return {
      passed: hasClimax,
      notes: hasClimax ? '高潮点存在' : '缺少高潮点',
    };
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
