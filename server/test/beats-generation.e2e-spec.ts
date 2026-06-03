import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AI_MODEL_TOKEN } from '../src/ai-gateway/ai-gateway.service';

const mockChatModel = {
  stream: async function* () {
    yield { content: '## Chapter 1: 序章·觉醒\n冲突点: 主角发现能力\n钩子预设: 神秘组织观察, 能力觉醒\n读者期待值: 高\n目标字数: 3000\n' };
    yield { content: '\n## Chapter 2: 初入江湖\n冲突点: 首次实战\n钩子预设: 神秘老人相助\n读者期待值: 中\n目标字数: 3500\n' };
    yield { content: '\n## Chapter 3: 暗流涌动\n冲突点: 发现阴谋\n钩子预设: 隐藏势力, 背叛, 预言\n读者期待值: 高\n目标字数: 4000\n' };
  },
  getNumTokens: async (text: string) => {
    return Math.round((text || '').length / 4);
  },
};

describe('Beats Generate E2E', () => {
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

  it('should load beats-generation template without error', () => {
    const fs = require('fs');
    const path = require('path');
    const templatePath = path.join(process.cwd(), 'prompts', 'creation', 'beats-generation.md');
    expect(fs.existsSync(templatePath)).toBe(true);
    const content = fs.readFileSync(templatePath, 'utf-8');
    expect(content).toContain('{{outline}}');
    expect(content).toContain('冲突点');
  });

  it('should generate beats and return BeatData array', async () => {
    // Create project and advance to BEATS
    const createRes = await request(app.getHttpServer())
      .post('/projects')
      .send({ title: 'BEATS E2E 测试' })
      .expect(201);

    const projectId = createRes.body.id;

    // Set status to OUTLINE first, then generate and confirm outline to reach BEATS
    await request(app.getHttpServer())
      .patch(`/projects/${projectId}`)
      .send({ status: 'OUTLINE' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/steps/outline/generate`)
      .send({ setting: '修真世界', structure: 'three-act' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/steps/outline/confirm`)
      .expect(200);

    // Now project should be in BEATS status — generate beats
    const res = await request(app.getHttpServer())
      .post(`/projects/${projectId}/steps/beats/generate`)
      .send({ outline: '大纲内容' })
      .expect(201);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('chapterNumber');
    expect(res.body[0]).toHaveProperty('plan');
    expect(res.body[0]).toHaveProperty('hookCount');
    expect(res.body[0]).toHaveProperty('targetWordCount');
  });

  it('should return 400 when project status is not BEATS', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/projects')
      .send({ title: '非BEATS项目' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/projects/${createRes.body.id}/steps/beats/generate`)
      .send({ outline: '大纲' })
      .expect(400);
  });

  it('should return 404 for nonexistent project', async () => {
    await request(app.getHttpServer())
      .post('/projects/000000000000000000000000/steps/beats/generate')
      .send({ outline: '大纲' })
      .expect(404);
  });

  it('should GET beats return empty array when no beats exist', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/projects')
      .send({ title: 'GET Beats测试' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/projects/${createRes.body.id}/steps/beats`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});
