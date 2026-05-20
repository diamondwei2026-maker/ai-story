import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ProjectModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /projects', () => {
    it('should create a new project and return 201', async () => {
      const payload = {
        title: '重生之医圣',
        config: {
          style: '快节奏爽文',
          platform: '起点',
          genre: '都市',
        },
      };

      const res = await request(app.getHttpServer())
        .post('/projects')
        .send(payload)
        .expect(201);

      // 返回的 Project 包含完整字段
      expect(res.body).toMatchObject({
        title: '重生之医圣',
        status: 'IDEA',
        config: {
          style: '快节奏爽文',
          platform: '起点',
          genre: '都市',
        },
      });

      // 必须有 id 且为 truthy
      expect(res.body.id).toBeTruthy();

      // 必须有时间戳
      expect(res.body.createdAt).toBeTruthy();
      expect(res.body.updatedAt).toBeTruthy();
    });

    it('should reject when title is missing with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/projects')
        .send({ config: { style: '细腻文艺' } })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should reject when title is empty string with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: '   ', config: {} })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });
});
