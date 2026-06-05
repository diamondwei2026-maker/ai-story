import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectService } from '../../project/project.service';
import { ProjectStatus, StatusHistoryEntry } from '../../project/project.entity';
import { AIGatewayService, TaskType } from '../../ai-gateway/ai-gateway.service';
import {
  StepData,
  PhaseType,
  BeatData,
  ChapterData,
  AiMeta,
} from '../step.entity';

const DEFAULT_INTENSITY = 3;
const DEFAULT_EXPECTATION = 3;
const DEFAULT_PACING = '中';
const VALID_PACING_LABELS = ['快', '中', '慢'] as const;

const POWER_SYSTEM_REDLINES: { label: string; keywords: string[] }[] = [
  { label: '禁止宣扬暴力至上', keywords: ['暴力至上', '以暴制暴', '暴力崇拜'] },
  { label: '禁止详细描述邪术修炼方法', keywords: ['邪术修炼', '血祭', '生魂'] },
  { label: '禁止贬低现实制度', keywords: ['颠覆政权', '反动', '颠覆国家'] },
];

export function clampIntensity(value: number): number {
  return Math.max(1, Math.min(5, value));
}

@Injectable()
export class StepCoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectService: ProjectService,
    private readonly aiGateway: AIGatewayService,
  ) {}

  async getStepByProjectId(projectId: string, phaseType: PhaseType): Promise<StepData | null> {
    const doc = await this.prisma.stepData.findFirst({
      where: { projectId, phaseType },
      orderBy: { version: 'desc' },
    });
    return doc ? this.toStepData(doc) : null;
  }

  async getBeatsByProjectId(projectId: string): Promise<BeatData[]> {
    const docs = await this.prisma.beat.findMany({
      where: { projectId },
      orderBy: { chapterNumber: 'asc' },
    });
    return docs.map((d) => this.toBeat(d));
  }

  async getChaptersByProjectId(projectId: string): Promise<ChapterData[]> {
    const docs = await this.prisma.chapter.findMany({
      where: { projectId },
      orderBy: { chapterNumber: 'asc' },
    });
    return docs.map((d) => this.toChapter(d));
  }

  async findBeatById(beatId: string): Promise<BeatData | null> {
    const doc = await this.prisma.beat.findUnique({ where: { id: beatId } });
    return doc ? this.toBeat(doc) : null;
  }

  async findChapterById(chapterId: string): Promise<ChapterData | null> {
    const doc = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    return doc ? this.toChapter(doc) : null;
  }

  async getChapterOrThrow(chapterId: string): Promise<ChapterData> {
    const chapter = await this.findChapterById(chapterId);
    if (!chapter) throw new BadRequestException('Chapter not found');
    return chapter;
  }

  async findPreviousChapter(projectId: string, chapterNumber: number): Promise<ChapterData | null> {
    if (chapterNumber <= 1) return null;
    const doc = await this.prisma.chapter.findFirst({
      where: { projectId, chapterNumber: chapterNumber - 1 },
    });
    return doc ? this.toChapter(doc) : null;
  }

  async createPendingStep(projectId: string, phaseType: PhaseType): Promise<StepData> {
    const doc = await this.prisma.stepData.create({
      data: { projectId, phaseType, status: 'PENDING', input: null, output: null, review: null, version: 1, confirmedAt: null },
    });
    return this.toStepData(doc);
  }

  async confirmPhase(projectId: string, phaseType: PhaseType, nextStatus: ProjectStatus, label: string): Promise<StepData> {
    const existing = await this.getStepByProjectId(projectId, phaseType);
    if (!existing) throw new BadRequestException(`No generated ${label} to confirm`);
    if (existing.status === 'CONFIRMED') throw new BadRequestException(`${label} already confirmed`);
    if (existing.status !== 'AWAITING_REVIEW') {
      throw new BadRequestException(`${label} must be AWAITING_REVIEW to confirm (current: ${existing.status})`);
    }
    const project = await this.projectService.findById(projectId);
    if (!project) throw new BadRequestException(`Project ${projectId} not found`);
    try {
      await this.prisma.stepData.update({ where: { id: existing.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
    } catch (e) {
      console.error(`[confirmPhase] Failed to update stepData`, e);
      throw new InternalServerErrorException(`Failed to confirm ${label}`);
    }
    try {
      const updatedProject = await this.projectService.update(projectId, { status: nextStatus });
      if (!updatedProject) throw new InternalServerErrorException(`Failed to update project status`);
    } catch (e) {
      if (e instanceof InternalServerErrorException) throw e;
      throw new InternalServerErrorException(`Failed to update project status`);
    }
    existing.status = 'CONFIRMED';
    existing.confirmedAt = new Date();
    return existing;
  }

  async rejectPhase(projectId: string, phaseType: PhaseType, label: string): Promise<StepData> {
    const existing = await this.getStepByProjectId(projectId, phaseType);
    if (!existing) throw new BadRequestException(`No generated ${label} to reject`);
    if (existing.status === 'CONFIRMED') throw new BadRequestException(`${label} already confirmed`);
    if (existing.status === 'REJECTED') throw new BadRequestException(`${label} already rejected`);
    await this.prisma.stepData.update({ where: { id: existing.id }, data: { status: 'REJECTED' } });
    existing.status = 'REJECTED';
    return existing;
  }

  async transitionChapterStatus(chapterId: string, expectedStatus: ChapterData['status'], targetStatus: ChapterData['status']): Promise<ChapterData> {
    const chapter = await this.getChapterOrThrow(chapterId);
    if (chapter.status !== expectedStatus) {
      throw new BadRequestException(`Chapter must be ${expectedStatus} (current: ${chapter.status})`);
    }
    await this.prisma.chapter.update({ where: { id: chapterId }, data: { status: targetStatus } });
    chapter.status = targetStatus;
    return chapter;
  }

  async collectAiOutput(taskType: TaskType, prompt: string, modelOverride?: string): Promise<{ content: string; aiMeta: AiMeta }> {
    return this.aiGateway.collectFullOutput(taskType, prompt, modelOverride);
  }

  runPowerSystemCheck(output: string): Record<string, unknown> {
    const flags: string[] = [];
    for (const redline of POWER_SYSTEM_REDLINES) {
      if (redline.keywords.some((kw) => output.includes(kw))) flags.push(redline.label);
    }
    return { passed: flags.length === 0, flags, checkedAt: new Date().toISOString() };
  }

  runPacingReview(output: string): Record<string, unknown> {
    const hasMultiAct = /第[一二三四五六七八九十]幕|第[一二三四五六七八九十]章/.test(output);
    return { passed: hasMultiAct, score: hasMultiAct ? 85 : 50, notes: hasMultiAct ? '节奏分布合理' : '缺少多幕/章结构' };
  }

  runConflictReview(output: string): Record<string, unknown> {
    const hasConflict = /冲突|矛盾|对抗|危机|敌人|反派/.test(output);
    return { passed: hasConflict, notes: hasConflict ? '冲突要素存在' : '缺少冲突要素' };
  }

  runClimaxReview(output: string): Record<string, unknown> {
    const hasClimax = /高潮|决战|终极|巅峰/.test(output);
    return { passed: hasClimax, notes: hasClimax ? '高潮点存在' : '缺少高潮点' };
  }

  estimateTokens(content: string): number {
    const cjkChars = (content.match(/[一-鿿㐀-䶿]/g) || []).length;
    const asciiWords = content.replace(/[一-鿿㐀-䶿]/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.ceil(cjkChars + asciiWords * 0.25);
  }

  appendMilestone(project: { id: string; statusHistory?: StatusHistoryEntry[] }, status: ProjectStatus, reason: string): void {
    const history = [...(project.statusHistory ?? [])];
    history.push({ status, changedAt: new Date().toISOString(), reason });
  }

  toStepData(doc: Record<string, unknown>): StepData {
    return {
      id: doc['id'] as string, projectId: doc['projectId'] as string,
      phaseType: doc['phaseType'] as PhaseType, status: doc['status'] as StepData['status'],
      input: (doc['input'] as string) ?? null, output: (doc['output'] as string) ?? null,
      review: (doc['review'] as Record<string, unknown>) ?? null,
      version: (doc['version'] as number) ?? 1,
      confirmedAt: doc['confirmedAt'] ? new Date(doc['confirmedAt'] as string) : null,
      aiMeta: (doc['aiMeta'] as AiMeta) ?? undefined,
    };
  }

  toBeat(doc: Record<string, unknown>): BeatData {
    const plan = (doc['plan'] as Record<string, unknown>) ?? {};
    const narrativeSummary = (doc['narrativeSummary'] as string) ?? '';
    const pacingLabelRaw = (doc['pacingLabel'] as string) ?? '';
    const pacingLabel = (VALID_PACING_LABELS as readonly string[]).includes(pacingLabelRaw) ? pacingLabelRaw : DEFAULT_PACING;
    const conflictIntensity = clampIntensity(Number(doc['conflictIntensity'] ?? DEFAULT_INTENSITY));
    const readerExpectation = clampIntensity(Number(doc['readerExpectation'] ?? DEFAULT_EXPECTATION));
    let hookCausalChain: { hook: string; resolvesInChapter: number | null }[] = [];
    const chainFromDb = doc['hookCausalChain'];
    if (Array.isArray(chainFromDb) && chainFromDb.length > 0) {
      hookCausalChain = chainFromDb as typeof hookCausalChain;
    } else if (plan.hookPresets && Array.isArray(plan.hookPresets)) {
      hookCausalChain = (plan.hookPresets as string[]).map((h) => ({ hook: h, resolvesInChapter: null }));
    }
    let conflictDescription = (doc['conflictDescription'] as string) ?? '';
    if (!conflictDescription && plan.conflictPoint) conflictDescription = plan.conflictPoint as string;
    return {
      id: doc['id'] as string, projectId: doc['projectId'] as string,
      chapterNumber: doc['chapterNumber'] as number, plan,
      targetWordCount: (doc['targetWordCount'] as number) ?? 3000,
      hookCount: (doc['hookCount'] as number) ?? 0,
      isClimax: (doc['isClimax'] as boolean) ?? false,
      useR1: (doc['useR1'] as boolean) ?? false,
      status: (doc['status'] as BeatData['status']) ?? 'PENDING',
      narrativeSummary, conflictDescription, pacingLabel, hookCausalChain,
      conflictIntensity, readerExpectation,
      createdAt: new Date(doc['createdAt'] as string),
      updatedAt: new Date(doc['updatedAt'] as string),
    };
  }

  toChapter(doc: Record<string, unknown>): ChapterData {
    return {
      id: doc['id'] as string, projectId: doc['projectId'] as string,
      chapterNumber: doc['chapterNumber'] as number,
      title: (doc['title'] as string) ?? null,
      beatPlan: (doc['beatPlan'] as Record<string, unknown>) ?? null,
      targetWordCount: (doc['targetWordCount'] as number) ?? 3000,
      content: (doc['content'] as string) ?? null,
      status: (doc['status'] as ChapterData['status']) ?? 'PENDING',
      chapterFingerprint: (doc['chapterFingerprint'] as string) ?? null,
      contextSummary: (doc['contextSummary'] as string) ?? null,
      reviewResult: (doc['reviewResult'] as Record<string, unknown>) ?? null,
      changeAnalysis: (doc['changeAnalysis'] as Record<string, unknown>) ?? null,
      targetedFixHistory: (doc['targetedFixHistory'] as ChapterData['targetedFixHistory']) ?? [],
      createdAt: new Date(doc['createdAt'] as string),
      updatedAt: new Date(doc['updatedAt'] as string),
    };
  }
}
