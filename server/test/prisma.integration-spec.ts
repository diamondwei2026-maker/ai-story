import { PrismaService } from '../src/prisma/prisma.service';

describe('Prisma MongoDB Integration', () => {
  let prisma: PrismaService;
  const testProjectIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data
    for (const id of testProjectIds) {
      await prisma.project.deleteMany({ where: { id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('Project CRUD', () => {
    it('should create a Project', async () => {
      const project = await prisma.project.create({
        data: {
          title: '重生之医圣',
          config: { style: '快节奏爽文', platform: '起点', genre: '都市' },
        },
      });

      testProjectIds.push(project.id);

      expect(project.id).toBeTruthy();
      expect(project.title).toBe('重生之医圣');
      expect(project.status).toBe('IDEA');
      expect(project.createdAt).toBeInstanceOf(Date);
    });

    it('should read a Project by id', async () => {
      const created = await prisma.project.create({
        data: { title: '读取测试', config: {} },
      });
      testProjectIds.push(created.id);

      const found = await prisma.project.findUnique({ where: { id: created.id } });

      expect(found).not.toBeNull();
      expect(found!.title).toBe('读取测试');
    });

    it('should list all Projects', async () => {
      const projects = await prisma.project.findMany();
      expect(projects.length).toBeGreaterThanOrEqual(2);
    });

    it('should update a Project', async () => {
      const created = await prisma.project.create({
        data: { title: '更新前', config: {} },
      });
      testProjectIds.push(created.id);

      const updated = await prisma.project.update({
        where: { id: created.id },
        data: { title: '更新后', status: 'SETTING' },
      });

      expect(updated.title).toBe('更新后');
      expect(updated.status).toBe('SETTING');
    });

    it('should delete a Project', async () => {
      const created = await prisma.project.create({
        data: { title: '待删除', config: {} },
      });

      await prisma.project.delete({ where: { id: created.id } });

      const found = await prisma.project.findUnique({ where: { id: created.id } });
      expect(found).toBeNull();
    });
  });
});
