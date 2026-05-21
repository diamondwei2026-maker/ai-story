import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectService],
    }).compile();
    service = module.get<ProjectService>(ProjectService);
  });

  describe('create', () => {
    it('should create a project with default IDEA status', () => {
      const project = service.create({ title: '重生之医圣' });
      expect(project.id).toBeTruthy();
      expect(project.title).toBe('重生之医圣');
      expect(project.status).toBe('IDEA');
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findAll', () => {
    it('should return all non-archived projects', () => {
      service.create({ title: 'Project A' });
      service.create({ title: 'Project B' });
      const created = service.create({ title: 'Archived One' });
      service.archive(created.id);

      const projects = service.findAll();
      expect(projects).toHaveLength(2);
      expect(projects.every((p) => p.status !== 'ARCHIVED')).toBe(true);
    });

    it('should return empty array when no projects exist', () => {
      expect(service.findAll()).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a project by id', () => {
      const created = service.create({ title: 'Find Me' });
      const found = service.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.title).toBe('Find Me');
    });

    it('should return null for non-existent id', () => {
      expect(service.findById('nonexistent-id')).toBeNull();
    });
  });

  describe('update', () => {
    it('should update project title', () => {
      const created = service.create({ title: 'Old Title' });
      const updated = service.update(created.id, { title: 'New Title' });
      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('New Title');
      expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(
        created.updatedAt.getTime(),
      );
    });

    it('should update project config', () => {
      const created = service.create({ title: 'Test' });
      const updated = service.update(created.id, {
        config: { style: '文艺', genre: '玄幻' },
      });
      expect(updated).not.toBeNull();
      expect(updated!.config).toMatchObject({ style: '文艺', genre: '玄幻' });
    });

    it('should return null for non-existent id', () => {
      expect(service.update('nonexistent', { title: 'Nope' })).toBeNull();
    });
  });

  describe('delete', () => {
    it('should permanently delete a project', () => {
      const created = service.create({ title: 'To Delete' });
      const result = service.delete(created.id);
      expect(result).toBe(true);
      expect(service.findById(created.id)).toBeNull();
    });

    it('should return false for non-existent id', () => {
      expect(service.delete('nonexistent')).toBe(false);
    });
  });

  describe('archive', () => {
    it('should set project status to ARCHIVED', () => {
      const created = service.create({ title: 'To Archive' });
      const archived = service.archive(created.id);
      expect(archived).not.toBeNull();
      expect(archived!.status).toBe('ARCHIVED');
    });

    it('should preserve all project data after archiving', () => {
      const created = service.create({
        title: 'Preserve Me',
        config: { style: '快节奏' },
      });
      const archived = service.archive(created.id);
      expect(archived).not.toBeNull();
      expect(archived!.id).toBe(created.id);
      expect(archived!.title).toBe(created.title);
      expect(archived!.config).toEqual(created.config);
    });

    it('should return null for non-existent id', () => {
      expect(service.archive('nonexistent')).toBeNull();
    });
  });

  describe('restore', () => {
    it('should restore archived project to DRAFTING status', () => {
      const created = service.create({ title: 'Restore Me' });
      service.archive(created.id);
      const restored = service.restore(created.id);
      expect(restored).not.toBeNull();
      expect(restored!.status).toBe('DRAFTING');
    });

    it('should return null when restoring non-archived project', () => {
      const created = service.create({ title: 'Active Project' });
      expect(service.restore(created.id)).toBeNull();
    });

    it('should return null for non-existent id', () => {
      expect(service.restore('nonexistent')).toBeNull();
    });
  });
});
