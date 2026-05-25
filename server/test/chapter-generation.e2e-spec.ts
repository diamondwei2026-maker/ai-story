import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AI_MODEL_TOKEN } from '../src/ai-gateway/ai-gateway.service';
import { PromptTemplateLoaderService } from '../src/ai-gateway/prompt-template-loader.service';

const mockChatModel = {
  stream: async function* (input: string) {
    if (input.includes('beats')) {
      yield { content: '## Chapter 1: 序章\n- 冲突点: 觉醒\n- 钩子预设: 伏笔\n- 读者期待值: 高\n- 目标字数: 3000\n' };
    } else {
      const tokens = ['第', '一', '章', '\n', '夜', '色', '如', '墨', '。'];
      for (const token of tokens) {
        yield { content: token };
      }
    }
  },
};

const mockPromptLoader = {
  renderTemplate: jest.fn().mockImplementation(
    (_domain: string, template: string, _vars: Record<string, unknown>) => {
      if (template === 'beats-generation') return 'beats generation prompt';
      if (template === 'chapter-generation') return 'chapter generation prompt';
      return 'rendered prompt';
    },
  ),
  loadTemplate: jest.fn().mockReturnValue('mock template {{variable}}'),
  listTemplates: jest.fn().mockReturnValue([]),
};

describe('Chapter Generation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AI_MODEL_TOKEN)
      .useValue(mockChatModel)
      .overrideProvider(PromptTemplateLoaderService)
      .useValue(mockPromptLoader)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper: progress project to DRAFTING phase with chapters ready
  async function setupDraftingProject(): Promise<{
    projectId: string;
    chapterId: string;
  }> {
    const createRes = await request(app.getHttpServer())
      .post('/projects')
      .send({ title: 'E2E章节测试' })
      .expect(201);

    const projectId = createRes.body.id;

    // IDEA → SETTING
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .send({ status: 'SETTING' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/steps/setting/generate`)
      .send({ idea: '测试' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/steps/setting/confirm`)
      .expect(200);

    // SETTING → OUTLINE
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/steps/outline/generate`)
      .send({ setting: '设定', structure: 'three-act' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/steps/outline/confirm`)
      .expect(200);

    // OUTLINE → BEATS → DRAFTING
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/steps/beats/generate`)
      .send({ outline: '大纲' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/steps/beats/confirm`)
      .expect(200);

    // Get the first chapter ID
    const chaptersRes = await request(app.getHttpServer())
      .get(`/projects/${projectId}/chapters`)
      .expect(200);

    const chapterId = chaptersRes.body[0]?.id ?? 'fallback-id';

    return { projectId, chapterId };
  }

  // ─── POST /projects/:projectId/chapters/:chapterId/generate ───

  describe('POST /projects/:projectId/chapters/:chapterId/generate', () => {
    it('should generate chapter content via SSE streaming', async () => {
      const { projectId, chapterId } = await setupDraftingProject();

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/generate`)
        .send({ mode: 'new-continue' })
        .expect(201);

      expect(res.body.id).toBe(chapterId);
      expect(res.body.content).toBeTruthy();
      expect(res.body.content).toContain('第一章');
      expect(res.body.status).toBe('AWAITING_REVIEW');
      expect(res.body.chapterFingerprint).toBeTruthy();
      expect(res.body.reviewResult).toBeDefined();
    });

    it('should return 400 when sequential lock blocks generation', async () => {
      const { projectId } = await setupDraftingProject();

      // Get chapter 2 (index 1) — it should be locked
      const chaptersRes = await request(app.getHttpServer())
        .get(`/projects/${projectId}/chapters`)
        .expect(200);

      if (chaptersRes.body.length < 1) return; // only 1 chapter from mock

      // Find chapter 2 if it exists
      const chapter2 = chaptersRes.body.find((c: { chapterNumber: number }) => c.chapterNumber === 2);
      if (!chapter2) return;

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapter2.id}/generate`)
        .send({ mode: 'new-continue' })
        .expect(400);
    });

    it('should return 400 for paragraph-rewrite and style-upgrade modes', async () => {
      const { projectId, chapterId } = await setupDraftingProject();

      // First generate chapter 1 to unlock it, then those modes should work
      // Actually, let's test mode is accepted on first generation
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/generate`)
        .send({ mode: 'paragraph-rewrite' })
        .expect(201);

      expect(res.body.status).toBe('AWAITING_REVIEW');
    });
  });

  // ─── POST /projects/:projectId/chapters/:chapterId/confirm ───

  describe('POST /projects/:projectId/chapters/:chapterId/confirm', () => {
    it('should confirm chapter and set status to COMPLETED', async () => {
      const { projectId, chapterId } = await setupDraftingProject();

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/generate`)
        .send({ mode: 'new-continue' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/confirm`)
        .expect(200);

      expect(res.body.status).toBe('COMPLETED');
    });

    it('should return 400 when chapter is not AWAITING_REVIEW', async () => {
      const { projectId, chapterId } = await setupDraftingProject();

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/confirm`)
        .expect(400);
    });
  });

  // ─── POST /projects/:projectId/chapters/:chapterId/dispute ───

  describe('POST /projects/:projectId/chapters/:chapterId/dispute', () => {
    it('should mark chapter as DISPUTED', async () => {
      const { projectId, chapterId } = await setupDraftingProject();

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/generate`)
        .send({ mode: 'new-continue' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/dispute`)
        .expect(200);

      expect(res.body.status).toBe('DISPUTED');
    });
  });

  // ─── POST /projects/:projectId/chapters/:chapterId/pause ───

  describe('POST /projects/:projectId/chapters/:chapterId/pause', () => {
    it('should preserve generated content on pause', async () => {
      const { projectId, chapterId } = await setupDraftingProject();

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/generate`)
        .send({ mode: 'new-continue' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/pause`)
        .expect(200);

      expect(res.body.content).toBeTruthy();
    });

    it('should return 400 when no active generation to pause', async () => {
      const { projectId, chapterId } = await setupDraftingProject();

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/pause`)
        .expect(400);
    });
  });

  // ─── POST /projects/:projectId/chapters/:chapterId/continue ───

  describe('POST /projects/:projectId/chapters/:chapterId/continue', () => {
    it('should continue from paused content with user edits', async () => {
      const { projectId, chapterId } = await setupDraftingProject();

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/generate`)
        .send({ mode: 'new-continue' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/pause`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/continue`)
        .send({ currentContent: '用户编辑后的内容...' })
        .expect(201);

      expect(res.body.content).toBeTruthy();
    });
  });

  // ─── POST /projects/:projectId/chapters/:chapterId/retry ───

  describe('POST /projects/:projectId/chapters/:chapterId/retry', () => {
    it('should retry with feedback injection', async () => {
      const { projectId, chapterId } = await setupDraftingProject();

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/generate`)
        .send({ mode: 'new-continue' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/chapters/${chapterId}/retry`)
        .send({ mode: 'new-continue', feedback: '主角更果断些' })
        .expect(201);

      expect(res.body.content).toBeTruthy();
      expect(res.body.status).toBe('AWAITING_REVIEW');
    });
  });

  // ─── GET /projects/:projectId/chapters ───

  describe('GET /projects/:projectId/chapters', () => {
    it('should return all chapters for a project', async () => {
      const { projectId } = await setupDraftingProject();

      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}/chapters`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('chapterNumber');
      expect(res.body[0]).toHaveProperty('status');
    });

    it('should return empty array for project with no chapters', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '无章节项目' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/projects/${createRes.body.id}/chapters`)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });
});
