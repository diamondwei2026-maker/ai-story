import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AI_MODEL_TOKEN } from '../src/ai-gateway/ai-gateway.service';

const mockChatModel = {
  stream: async function* () {
    yield { content: '## 第一幕：建置\n- 情节点1：主角登场 [爽点]\n' };
    yield { content: '- 情节点2：危机降临 [悬念点]\n' };
    yield { content: '## 第二幕：对抗\n- 情节点3：第一次失败 [虐点]\n' };
    yield { content: '- 情节点4：觉醒突破 [爽点]\n' };
    yield { content: '## 第三幕：解决\n- 情节点5：最终对决 [高潮]\n' };
  },
};

describe('Outline Phase (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AI_MODEL_TOKEN)
      .useValue(mockChatModel)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /projects/:id/steps/outline/generate', () => {
    it('should return 404 when project does not exist', async () => {
      await request(app.getHttpServer())
        .post('/projects/000000000000000000000000/steps/outline/generate')
        .send({ setting: '设定内容', structure: 'three-act' })
        .expect(404);
    });

    it('should generate plot outline for a project in OUTLINE status', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '剑道巅峰' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'OUTLINE' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/generate`)
        .send({ setting: '修真世界设定', structure: 'three-act' })
        .expect(201);

      expect(res.body).toMatchObject({
        projectId,
        phaseType: 'OUTLINE',
        status: 'AWAITING_REVIEW',
        version: 1,
      });

      expect(res.body.id).toBeTruthy();
      expect(res.body.output).toBeTruthy();
      expect(res.body.output).toContain('第一幕');
      expect(res.body.review).toBeDefined();
      expect(res.body.review.structurePacing).toBeDefined();
      expect(res.body.review.conflictReview).toBeDefined();
      expect(res.body.review.climaxReview).toBeDefined();
    });

    it('should return 400 for invalid structure type', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '无效结构项目' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'OUTLINE' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/generate`)
        .send({ setting: '设定', structure: 'bogus-format' })
        .expect(400);
    });

    it('should return 400 when project status is not OUTLINE', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '停留在IDEA的项目' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${createRes.body.id}/steps/outline/generate`)
        .send({ setting: '设定', structure: 'three-act' })
        .expect(400);
    });

    it('should default to three-act structure when not provided', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '默认结构项目' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'OUTLINE' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/generate`)
        .send({ setting: '设定内容' })
        .expect(201);

      expect(res.body.status).toBe('AWAITING_REVIEW');
    });

    it('should regenerate outline when currentContent is provided', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '刷新大纲项目' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'OUTLINE' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/generate`)
        .send({
          setting: '原始设定',
          structure: 'web-novel-ten',
          currentContent: '用户编辑后的大纲内容',
        })
        .expect(201);

      expect(res.body.input).toContain('用户编辑后的大纲内容');
      expect(res.body.output).toBeTruthy();
      expect(res.body.status).toBe('AWAITING_REVIEW');
    });
  });

  describe('POST /projects/:id/steps/outline/confirm', () => {
    it('should confirm outline and transition project to BEATS status', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '确认大纲项目' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'OUTLINE' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/generate`)
        .send({ setting: '设定内容', structure: 'three-act' })
        .expect(201);

      const confirmRes = await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/confirm`)
        .expect(200);

      expect(confirmRes.body.phaseType).toBe('OUTLINE');
      expect(confirmRes.body.status).toBe('CONFIRMED');
      expect(confirmRes.body.confirmedAt).toBeTruthy();

      const projectRes = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .expect(200);

      expect(projectRes.body.status).toBe('BEATS');
    });

    it('should return 400 when no generated outline exists', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '未生成大纲的项目' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${createRes.body.id}/steps/outline/confirm`)
        .expect(400);
    });

    it('should return 400 when outline is already confirmed', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '重复确认大纲' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'OUTLINE' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/generate`)
        .send({ setting: '设定', structure: 'three-act' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/confirm`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/confirm`)
        .expect(400);
    });
  });

  describe('POST /projects/:id/steps/outline/reject', () => {
    it('should reject a generated outline', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '驳回大纲项目' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'OUTLINE' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/generate`)
        .send({ setting: '设定', structure: 'three-act' })
        .expect(201);

      const rejectRes = await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/reject`)
        .expect(200);

      expect(rejectRes.body.status).toBe('REJECTED');
    });

    it('should return 400 when no generated outline exists', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '无大纲驳回' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${createRes.body.id}/steps/outline/reject`)
        .expect(400);
    });

    it('should return 400 when outline is already confirmed', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '已确认驳回' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'OUTLINE' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/generate`)
        .send({ setting: '设定', structure: 'three-act' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/confirm`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/reject`)
        .expect(400);
    });
  });

  describe('POST /projects/:id/steps/outline/switch-structure', () => {
    it('should switch structure and regenerate outline', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '格式切换项目' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'OUTLINE' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/generate`)
        .send({ setting: '设定', structure: 'three-act' })
        .expect(201);

      const switchRes = await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/switch-structure`)
        .send({ structure: 'web-novel-ten' })
        .expect(200);

      expect(switchRes.body.phaseType).toBe('OUTLINE');
      expect(switchRes.body.status).toBe('AWAITING_REVIEW');
      expect(switchRes.body.output).toBeTruthy();
    });

    it('should return 400 when no generated outline exists', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '无大纲切换' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${createRes.body.id}/steps/outline/switch-structure`)
        .send({ structure: 'four-act-eight' })
        .expect(400);
    });

    it('should return 400 for invalid structure type', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '无效结构' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'OUTLINE' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/generate`)
        .send({ setting: '设定', structure: 'three-act' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/switch-structure`)
        .send({ structure: 'invalid-structure' })
        .expect(400);
    });
  });

  describe('GET /projects/:id/steps/outline', () => {
    it('should return the latest OUTLINE step for a project', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '查询大纲项目' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'OUTLINE' })
        .expect(200);

      const genRes = await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/outline/generate`)
        .send({ setting: '设定', structure: 'four-act-eight' })
        .expect(201);

      const getRes = await request(app.getHttpServer())
        .get(`/projects/${projectId}/steps/outline`)
        .expect(200);

      expect(getRes.body.id).toBe(genRes.body.id);
      expect(getRes.body.output).toBe(genRes.body.output);
    });

    it('should return 404 when no OUTLINE step exists', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '无大纲步骤' })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/projects/${createRes.body.id}/steps/outline`)
        .expect(404);
    });
  });
});
