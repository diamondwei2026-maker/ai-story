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

      expect(res.body).toMatchObject({
        title: '重生之医圣',
        status: 'IDEA',
        config: {
          style: '快节奏爽文',
          platform: '起点',
          genre: '都市',
        },
      });

      expect(res.body.id).toBeTruthy();
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

  describe('GET /projects', () => {
    it('should return list of non-archived projects', async () => {
      // 创建几个测试项目
      await request(app.getHttpServer())
        .post('/projects')
        .send({ title: 'List Project A' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/projects')
        .send({ title: 'List Project B' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/projects')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body.every((p: any) => p.status !== 'ARCHIVED')).toBe(true);
    });

    it('should exclude archived projects from default list', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: 'To Be Archived' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${createRes.body.id}/archive`)
        .expect(200);

      const listRes = await request(app.getHttpServer())
        .get('/projects')
        .expect(200);

      const ids = listRes.body.map((p: any) => p.id);
      expect(ids).not.toContain(createRes.body.id);
    });
  });

  describe('PATCH /projects/:id', () => {
    it('should update project title', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: 'Old Title' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/projects/${createRes.body.id}`)
        .send({ title: 'New Title' })
        .expect(200);

      expect(res.body.title).toBe('New Title');
      expect(res.body.id).toBe(createRes.body.id);
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .patch('/projects/000000000000000000000000')
        .send({ title: 'Nope' })
        .expect(404);
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should permanently delete a project', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: 'Delete Me' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/projects/${createRes.body.id}`)
        .expect(200);

      // 删除后无法再找到
      await request(app.getHttpServer())
        .get(`/projects/${createRes.body.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .delete('/projects/000000000000000000000000')
        .expect(404);
    });
  });

  describe('POST /projects/:id/archive', () => {
    it('should archive a project', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: 'Archive Me' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/projects/${createRes.body.id}/archive`)
        .expect(200);

      expect(res.body.status).toBe('ARCHIVED');
      expect(res.body.title).toBe('Archive Me');
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .post('/projects/000000000000000000000000/archive')
        .expect(404);
    });
  });

  describe('POST /projects/:id/restore', () => {
    it('should restore archived project to DRAFTING', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: 'Restore Me' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${createRes.body.id}/archive`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/projects/${createRes.body.id}/restore`)
        .expect(200);

      expect(res.body.status).toBe('DRAFTING');
      expect(res.body.title).toBe('Restore Me');
    });

    it('should return 400 when restoring non-archived project', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .send({ title: 'Active Project' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${createRes.body.id}/restore`)
        .expect(400);
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .post('/projects/000000000000000000000000/restore')
        .expect(404);
    });
  });
});
