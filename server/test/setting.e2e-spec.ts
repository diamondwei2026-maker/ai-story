import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AI_MODEL_TOKEN } from '../src/ai-gateway/ai-gateway.service';

const mockChatModel = {
  stream: async function* () {
    yield { content: '## 时代背景\n仙历三千年，灵气复苏。\n' };
    yield { content: '## 地理环境\n九大洲漂浮于无尽海上。\n' };
    yield { content: '## 社会结构\n宗门、散修、凡人间三足鼎立。\n' };
    yield { content: '## 力量体系\n' };
    yield { content: '炼气→筑基→金丹→元婴→化神→渡劫→大乘。\n' };
  },
};

describe('Setting Phase (e2e)', () => {
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

  describe('POST /projects/:id/steps/setting/generate', () => {
    it('should return 404 when project does not exist', async () => {
      await request(app.getHttpServer())
        .post('/projects/000000000000000000000000/steps/setting/generate')
        .send({ idea: '测试创意' })
        .expect(404);
    });

    it('should generate world-building settings for a project in SETTING status', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '重生之剑道巅峰' })
        .expect(201);

      const projectId = createRes.body.id;

      // 将 Project 状态切换为 SETTING（模拟 IDEA 阶段已确认）
      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'SETTING' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/setting/generate`)
        .send({ idea: '一位现代剑客重生到修真世界，以剑入道。' })
        .expect(201);

      expect(res.body).toMatchObject({
        projectId,
        phaseType: 'SETTING',
        status: 'AWAITING_REVIEW',
        version: 1,
      });

      expect(res.body.id).toBeTruthy();
      expect(res.body.output).toBeTruthy();
      expect(res.body.output).toContain('时代背景');
      expect(res.body.output).toContain('力量体系');
      expect(res.body.review).toBeDefined();
      expect(res.body.review.powerSystemCheck).toBeDefined();
    });

    it('should return 400 when project status is not SETTING', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '停留在IDEA的项目' })
        .expect(201);

      // Project 默认状态为 IDEA，不应允许 SETTING 生成
      await request(app.getHttpServer())
        .post(`/projects/${createRes.body.id}/steps/setting/generate`)
        .send({ idea: '测试创意' })
        .expect(400);
    });

    it('should regenerate setting when currentContent is provided for refresh', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '刷新设定项目' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'SETTING' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/setting/generate`)
        .send({
          idea: '原始创意',
          currentContent: '用户编辑后的完整设定内容',
        })
        .expect(201);

      expect(res.body.input).toContain('用户编辑后的完整设定内容');
      expect(res.body.output).toBeTruthy();
      expect(res.body.status).toBe('AWAITING_REVIEW');
    });
  });

  describe('POST /projects/:id/steps/setting/confirm', () => {
    it('should confirm setting and transition project to OUTLINE status', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '确认设定的项目' })
        .expect(201);

      const projectId = createRes.body.id;

      // 切换到 SETTING 状态
      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'SETTING' })
        .expect(200);

      // 生成设定
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/setting/generate`)
        .send({ idea: '一个都市异能的故事' })
        .expect(201);

      // 确认设定
      const confirmRes = await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/setting/confirm`)
        .expect(200);

      expect(confirmRes.body.phaseType).toBe('SETTING');
      expect(confirmRes.body.status).toBe('CONFIRMED');
      expect(confirmRes.body.confirmedAt).toBeTruthy();

      // 验证 Project 状态已流转至 OUTLINE
      const projectRes = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .expect(200);

      expect(projectRes.body.status).toBe('OUTLINE');
    });

    it('should return 400 when no generated setting exists', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '未生成设定的项目' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${createRes.body.id}/steps/setting/confirm`)
        .expect(400);
    });

    it('should return 400 when setting is already confirmed', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '重复确认项目' })
        .expect(201);

      const projectId = createRes.body.id;

      // 切换到 SETTING 状态
      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'SETTING' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/setting/generate`)
        .send({ idea: '一个修真故事' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/setting/confirm`)
        .expect(200);

      // 再次确认应报 400
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/setting/confirm`)
        .expect(400);
    });
  });

  describe('POST /projects/:id/steps/setting/reject', () => {
    it('should reject a generated setting', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '驳回设定项目' })
        .expect(201);

      const projectId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'SETTING' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/setting/generate`)
        .send({ idea: '测试' })
        .expect(201);

      const rejectRes = await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/setting/reject`)
        .expect(200);

      expect(rejectRes.body.status).toBe('REJECTED');
    });

    it('should return 400 when no generated setting exists', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '无设定驳回' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${createRes.body.id}/steps/setting/reject`)
        .expect(400);
    });

    it('should return 400 when setting is already confirmed', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '已确认驳回' })
        .expect(201);

      const projectId = createRes.body.id;

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

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/setting/reject`)
        .expect(400);
    });
  });

  describe('GET /projects/:id/steps/setting', () => {
    it('should return the latest SETTING step for a project', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '查询设定项目' })
        .expect(201);

      const projectId = createRes.body.id;

      // 切换到 SETTING 状态
      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .send({ status: 'SETTING' })
        .expect(200);

      const genRes = await request(app.getHttpServer())
        .post(`/projects/${projectId}/steps/setting/generate`)
        .send({ idea: '奇幻设定' })
        .expect(201);

      const getRes = await request(app.getHttpServer())
        .get(`/projects/${projectId}/steps/setting`)
        .expect(200);

      expect(getRes.body.id).toBe(genRes.body.id);
      expect(getRes.body.output).toBe(genRes.body.output);
    });

    it('should return 404 when no SETTING step exists', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '无设定步骤' })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/projects/${createRes.body.id}/steps/setting`)
        .expect(404);
    });
  });
});
