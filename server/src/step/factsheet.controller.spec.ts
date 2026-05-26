import { Test, TestingModule } from '@nestjs/testing';
import { FactsheetCompensationService } from './factsheet-compensation.service';
import { FactsheetController } from './factsheet.controller';
import { ProjectService } from '../project/project.service';

describe('FactsheetController', () => {
  let controller: FactsheetController;
  let compensationService: FactsheetCompensationService;
  let projectService: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FactsheetController],
      providers: [FactsheetCompensationService, ProjectService],
    }).compile();

    controller = module.get<FactsheetController>(FactsheetController);
    compensationService = module.get<FactsheetCompensationService>(FactsheetCompensationService);
    projectService = module.get<ProjectService>(ProjectService);
  });

  function createProject(): string {
    return projectService.create({ title: '告警测试' }).id;
  }

  // ══════════════════════════════════════════════════════════════════
  // GET /projects/:projectId/factsheet-alert
  // ══════════════════════════════════════════════════════════════════

  describe('GET :projectId/factsheet-alert', () => {
    it('should return NORMAL alert for empty queue', () => {
      const projectId = createProject();

      const result = controller.getFactsheetAlert(projectId);

      expect(result).toEqual({ level: 'NORMAL', depth: 0 });
    });

    it('should return WARNING alert when depth >= 10', () => {
      const projectId = createProject();
      for (let i = 0; i < 10; i++) {
        compensationService.enqueue(projectId, `ch${i}`, i + 1, { key: `val${i}` });
      }

      const result = controller.getFactsheetAlert(projectId);

      expect(result.level).toBe('WARNING');
      expect(result.depth).toBe(10);
    });

    it('should return CRITICAL alert when depth >= 50', () => {
      const projectId = createProject();
      for (let i = 0; i < 50; i++) {
        compensationService.enqueue(projectId, `ch${i}`, i + 1, { key: `val${i}` });
      }

      const result = controller.getFactsheetAlert(projectId);

      expect(result.level).toBe('CRITICAL');
      expect(result.depth).toBe(50);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // POST /projects/:projectId/factsheet-force-sync
  // ══════════════════════════════════════════════════════════════════

  describe('POST :projectId/factsheet-force-sync', () => {
    it('should drain the queue and return consumed entries', () => {
      const projectId = createProject();
      compensationService.enqueue(projectId, 'ch1', 1, { a: '1', b: '2' });
      compensationService.enqueue(projectId, 'ch2', 2, { a: 'overridden', c: '3' });

      const result = controller.forceFactsheetSync(projectId);

      expect(result.consumedCount).toBe(2);
      expect(result.mergedEntries).toEqual({ a: 'overridden', b: '2', c: '3' });
      expect(compensationService.getQueueDepth(projectId)).toBe(0);
    });

    it('should return empty result when queue is empty', () => {
      const projectId = createProject();

      const result = controller.forceFactsheetSync(projectId);

      expect(result).toEqual({ mergedEntries: {}, consumedCount: 0, conflicts: [] });
    });

    it('should not include conflicts when no key is written by multiple entries', () => {
      const projectId = createProject();
      compensationService.enqueue(projectId, 'ch1', 1, { x: '1' });
      compensationService.enqueue(projectId, 'ch2', 2, { y: '2' });

      const result = controller.forceFactsheetSync(projectId);

      expect(result.conflicts).toEqual([]);
      expect(result.consumedCount).toBe(2);
    });
  });
});
