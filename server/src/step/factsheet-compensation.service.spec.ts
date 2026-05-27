import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  FactsheetCompensationService,
  FactsheetQueueFullError,
} from './factsheet-compensation.service';
import { ProjectService } from '../project/project.service';

// ─── Test Suite ───────────────────────────────────────────────────

describe('FactsheetCompensationService', () => {
  let service: FactsheetCompensationService;
  let projectService: ProjectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FactsheetCompensationService, ProjectService],
    }).compile();

    service = module.get<FactsheetCompensationService>(FactsheetCompensationService);
    projectService = module.get<ProjectService>(ProjectService);
  });

  // Helper: create a test project
  function createProject() {
    return projectService.create({ title: '补偿队列测试小说' });
  }

  // Helper: sample entries
  function sampleEntries(): Record<string, unknown> {
    return {
      characters: { 李凡: { age: 25, role: '主角' } },
      locations: { 金陵城: { status: '活跃' } },
    };
  }

  function altEntries(): Record<string, unknown> {
    return {
      characters: { 李凡: { age: 26, skill: '剑术' } },
      timeline: [{ event: '大战爆发', chapter: 5 }],
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // enqueue
  // ══════════════════════════════════════════════════════════════════

  describe('enqueue', () => {
    it('should add entry to project pendingFactUpdates queue', () => {
      const project = createProject();
      const result = service.enqueue(project.id, 'chapter-1', 1, sampleEntries());

      expect(result).toBeDefined();
      expect(result.id).toBeTruthy();
      expect(result.chapterId).toBe('chapter-1');
      expect(result.chapterNumber).toBe(1);
      expect(result.entries).toEqual(sampleEntries());
      expect(result.queuedAt).toBeTruthy();

      const stored = projectService.findById(project.id);
      expect(stored!.pendingFactUpdates).toBeDefined();
      expect(stored!.pendingFactUpdates!.length).toBe(1);
      expect(stored!.pendingFactUpdates![0].id).toBe(result.id);
    });

    it('should assign unique id and ISO timestamp to each entry', () => {
      const project = createProject();
      const result = service.enqueue(project.id, 'ch-1', 1, { key: 'value' });

      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(() => new Date(result.queuedAt)).not.toThrow();
      expect(new Date(result.queuedAt).toISOString()).toBe(result.queuedAt);
    });

    it('should assign unique ids for multiple enqueues', () => {
      const project = createProject();
      const r1 = service.enqueue(project.id, 'ch-1', 1, { a: 1 });
      const r2 = service.enqueue(project.id, 'ch-2', 2, { b: 2 });
      const r3 = service.enqueue(project.id, 'ch-3', 3, { c: 3 });

      expect(r1.id).not.toBe(r2.id);
      expect(r2.id).not.toBe(r3.id);
      expect(r1.id).not.toBe(r3.id);
    });

    it('should increment queue depth for multiple enqueues', () => {
      const project = createProject();
      service.enqueue(project.id, 'ch-1', 1, { a: 1 });
      service.enqueue(project.id, 'ch-2', 2, { b: 2 });
      service.enqueue(project.id, 'ch-3', 3, { c: 3 });

      const stored = projectService.findById(project.id);
      expect(stored!.pendingFactUpdates!.length).toBe(3);
    });

    it('should throw NotFoundException when project does not exist', () => {
      expect(() =>
        service.enqueue('nonexistent-id', 'ch-1', 1, sampleEntries()),
      ).toThrow(NotFoundException);
    });

    it('should set queuedAt to current ISO timestamp', () => {
      const project = createProject();
      const before = new Date().toISOString();
      const result = service.enqueue(project.id, 'ch-1', 1, { x: 1 });
      const after = new Date().toISOString();

      expect(result.queuedAt >= before).toBe(true);
      expect(result.queuedAt <= after).toBe(true);
    });

    it('should merge into existing entry when same chapterId re-enqueues', () => {
      const project = createProject();
      const first = service.enqueue(project.id, 'ch-1', 1, { a: '1', b: '2' });

      // Same chapterId re-enqueuing (concurrent CAS failures)
      const second = service.enqueue(project.id, 'ch-1', 1, { a: 'updated', c: '3' });

      // Should return same entry (not a new one)
      expect(second.id).toBe(first.id);

      // Entries should be merged (latest wins for overlapping keys)
      expect(second.entries).toEqual({ a: 'updated', b: '2', c: '3' });

      // Queue depth should still be 1 (not 2)
      expect(service.getQueueDepth(project.id)).toBe(1);
    });

    it('should not dedup across different chapterIds', () => {
      const project = createProject();
      service.enqueue(project.id, 'ch-1', 1, { a: '1' });
      service.enqueue(project.id, 'ch-2', 2, { b: '2' });

      expect(service.getQueueDepth(project.id)).toBe(2);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // enqueue — queue full threshold (>= 50)
  // ══════════════════════════════════════════════════════════════════

  describe('enqueue — queue full threshold', () => {
    it('should throw FactsheetQueueFullError when queue depth reaches 50 before enqueue', () => {
      const project = createProject();

      // Pre-fill queue to 50
      for (let i = 0; i < 50; i++) {
        service.enqueue(project.id, `ch-${i}`, i, { index: i });
      }

      expect(() =>
        service.enqueue(project.id, 'ch-51', 51, { overflow: true }),
      ).toThrow(FactsheetQueueFullError);
    });

    it('should include projectId and depth in FactsheetQueueFullError', () => {
      const project = createProject();
      for (let i = 0; i < 50; i++) {
        service.enqueue(project.id, `ch-${i}`, i, { index: i });
      }

      try {
        service.enqueue(project.id, 'ch-overflow', 99, { overflow: true });
        fail('Expected FactsheetQueueFullError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FactsheetQueueFullError);
        expect((error as FactsheetQueueFullError).projectId).toBe(project.id);
        expect((error as FactsheetQueueFullError).depth).toBe(50);
      }
    });

    it('should allow enqueue when queue depth is exactly 49 (not yet full)', () => {
      const project = createProject();
      for (let i = 0; i < 49; i++) {
        service.enqueue(project.id, `ch-${i}`, i, { index: i });
      }

      // 50th enqueue should succeed (depth becomes 50)
      const result = service.enqueue(project.id, 'ch-50', 50, { last: true });
      expect(result).toBeDefined();

      // But now depth is 50, next enqueue should fail
      expect(() =>
        service.enqueue(project.id, 'ch-51', 51, { overflow: true }),
      ).toThrow(FactsheetQueueFullError);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // getQueueDepth
  // ══════════════════════════════════════════════════════════════════

  describe('getQueueDepth', () => {
    it('should return 0 for project with no pending updates', () => {
      const project = createProject();
      expect(service.getQueueDepth(project.id)).toBe(0);
    });

    it('should return 0 for project with empty pendingFactUpdates array', () => {
      const project = createProject();
      project.pendingFactUpdates = [];
      expect(service.getQueueDepth(project.id)).toBe(0);
    });

    it('should return correct count after enqueues', () => {
      const project = createProject();
      service.enqueue(project.id, 'ch-1', 1, { a: 1 });
      expect(service.getQueueDepth(project.id)).toBe(1);

      service.enqueue(project.id, 'ch-2', 2, { b: 2 });
      service.enqueue(project.id, 'ch-3', 3, { c: 3 });
      expect(service.getQueueDepth(project.id)).toBe(3);
    });

    it('should throw NotFoundException when project does not exist', () => {
      expect(() => service.getQueueDepth('nonexistent-id')).toThrow(
        NotFoundException,
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // getAlertLevel
  // ══════════════════════════════════════════════════════════════════

  describe('getAlertLevel', () => {
    it('should return NORMAL when depth is 0', () => {
      const project = createProject();
      const alert = service.getAlertLevel(project.id);
      expect(alert.level).toBe('NORMAL');
      expect(alert.depth).toBe(0);
    });

    it('should return NORMAL when depth is 4', () => {
      const project = createProject();
      for (let i = 0; i < 4; i++) {
        service.enqueue(project.id, `ch-${i}`, i, { index: i });
      }
      expect(service.getAlertLevel(project.id).level).toBe('NORMAL');
    });

    it('should return PRIORITY when depth is 5', () => {
      const project = createProject();
      for (let i = 0; i < 5; i++) {
        service.enqueue(project.id, `ch-${i}`, i, { index: i });
      }
      const alert = service.getAlertLevel(project.id);
      expect(alert.level).toBe('PRIORITY');
      expect(alert.depth).toBe(5);
    });

    it('should return PRIORITY when depth is 9', () => {
      const project = createProject();
      for (let i = 0; i < 9; i++) {
        service.enqueue(project.id, `ch-${i}`, i, { index: i });
      }
      expect(service.getAlertLevel(project.id).level).toBe('PRIORITY');
    });

    it('should return WARNING when depth is 10', () => {
      const project = createProject();
      for (let i = 0; i < 10; i++) {
        service.enqueue(project.id, `ch-${i}`, i, { index: i });
      }
      const alert = service.getAlertLevel(project.id);
      expect(alert.level).toBe('WARNING');
      expect(alert.depth).toBe(10);
    });

    it('should return WARNING when depth is 49', () => {
      const project = createProject();
      for (let i = 0; i < 49; i++) {
        service.enqueue(project.id, `ch-${i}`, i, { index: i });
      }
      expect(service.getAlertLevel(project.id).level).toBe('WARNING');
    });

    it('should return CRITICAL when depth is 50', () => {
      const project = createProject();
      for (let i = 0; i < 50; i++) {
        service.enqueue(project.id, `ch-${i}`, i, { index: i });
      }
      const alert = service.getAlertLevel(project.id);
      expect(alert.level).toBe('CRITICAL');
      expect(alert.depth).toBe(50);
    });

    it('should throw NotFoundException when project does not exist', () => {
      expect(() => service.getAlertLevel('nonexistent-id')).toThrow(
        NotFoundException,
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // consumeQueue
  // ══════════════════════════════════════════════════════════════════

  describe('consumeQueue', () => {
    it('should return empty result when queue is empty', () => {
      const project = createProject();
      const factSheet = { characters: { existing: true } };

      const result = service.consumeQueue(project.id, factSheet);

      expect(result.consumedCount).toBe(0);
      expect(result.conflicts).toEqual([]);
      expect(result.mergedEntries).toEqual({});
    });

    it('should merge entries from a single pending item', () => {
      const project = createProject();
      service.enqueue(project.id, 'ch-1', 1, sampleEntries());

      const factSheet = { locations: { 长安: { status: '旧' } } };
      const result = service.consumeQueue(project.id, factSheet);

      expect(result.consumedCount).toBe(1);
      expect(result.mergedEntries).toHaveProperty('characters');
      expect(result.mergedEntries).toHaveProperty('locations');
    });

    it('should merge entries from multiple pending items', () => {
      const project = createProject();
      service.enqueue(project.id, 'ch-1', 1, { characters: { 李凡: { age: 25 } } });
      service.enqueue(project.id, 'ch-2', 2, { locations: { 金陵: {} } });
      service.enqueue(project.id, 'ch-3', 3, { timeline: [{ event: 'A' }] });

      const factSheet = {};
      const result = service.consumeQueue(project.id, factSheet);

      expect(result.consumedCount).toBe(3);
      expect(result.mergedEntries).toHaveProperty('characters');
      expect(result.mergedEntries).toHaveProperty('locations');
      expect(result.mergedEntries).toHaveProperty('timeline');
    });

    it('should clear queue after consumption', () => {
      const project = createProject();
      service.enqueue(project.id, 'ch-1', 1, sampleEntries());
      service.enqueue(project.id, 'ch-2', 2, altEntries());

      service.consumeQueue(project.id, {});

      expect(service.getQueueDepth(project.id)).toBe(0);
      const stored = projectService.findById(project.id);
      expect(stored!.pendingFactUpdates!.length).toBe(0);
    });

    it('should deduplicate by top-level key — latest queuedAt wins', () => {
      const project = createProject();

      // Enqueue first entry (older)
      service.enqueue(project.id, 'ch-1', 1, {
        characters: { 李凡: { age: 25 } },
        locations: { 金陵: { population: 1000 } },
      });

      // Enqueue second entry (newer — different characters value)
      service.enqueue(project.id, 'ch-2', 2, {
        characters: { 李凡: { age: 30 } },
        timeline: [{ event: '大战' }],
      });

      const result = service.consumeQueue(project.id, {});

      // characters should come from the later entry (ch-2, age 30)
      expect((result.mergedEntries as any).characters.李凡.age).toBe(30);
      // locations should come from the earlier entry (ch-1, only source)
      expect((result.mergedEntries as any).locations.金陵.population).toBe(1000);
      // timeline should come from the later entry
      expect((result.mergedEntries as any).timeline).toBeDefined();
    });

    it('should report conflicts when multiple entries write the same key', () => {
      const project = createProject();
      service.enqueue(project.id, 'ch-1', 1, {
        characters: { 李凡: { age: 25 } },
      });
      service.enqueue(project.id, 'ch-2', 2, {
        characters: { 李凡: { age: 30 } },
      });

      const result = service.consumeQueue(project.id, {});

      expect(result.conflicts.length).toBeGreaterThan(0);
      const charConflict = result.conflicts.find((c) => c.field === 'characters');
      expect(charConflict).toBeDefined();
      expect(charConflict!.resolution).toBe('LATEST_WINS');
    });

    it('should process entries in queuedAt order (oldest first)', () => {
      const project = createProject();

      // Manually set different timestamps
      const p1 = service.enqueue(project.id, 'ch-1', 1, {
        value: 'first',
      });
      const p2 = service.enqueue(project.id, 'ch-2', 2, {
        value: 'second',
      });
      const p3 = service.enqueue(project.id, 'ch-3', 3, {
        value: 'third',
      });

      // Verify order in queue matches insertion order (timestamp order)
      const stored = projectService.findById(project.id);
      expect(stored!.pendingFactUpdates![0].id).toBe(p1.id);
      expect(stored!.pendingFactUpdates![1].id).toBe(p2.id);
      expect(stored!.pendingFactUpdates![2].id).toBe(p3.id);

      const result = service.consumeQueue(project.id, {});
      // Last in wins for 'value' key → should be 'third'
      expect((result.mergedEntries as any).value).toBe('third');
    });

    it('should throw NotFoundException when project does not exist', () => {
      expect(() => service.consumeQueue('nonexistent-id', {})).toThrow(
        NotFoundException,
      );
    });

    it('should handle queue with single entry correctly', () => {
      const project = createProject();
      const entries = { foo: 'bar', baz: 42 };
      service.enqueue(project.id, 'ch-1', 1, entries);

      const result = service.consumeQueue(project.id, {});

      expect(result.consumedCount).toBe(1);
      expect(result.conflicts.length).toBe(0);
      expect(result.mergedEntries).toEqual(entries);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // forceSync
  // ══════════════════════════════════════════════════════════════════

  describe('forceSync', () => {
    it('should process all queue entries regardless of depth', () => {
      const project = createProject();
      for (let i = 0; i < 5; i++) {
        service.enqueue(project.id, `ch-${i}`, i, { [`key_${i}`]: i });
      }

      const result = service.forceSync(project.id, {});

      expect(result.consumedCount).toBe(5);
    });

    it('should clear queue after force sync', () => {
      const project = createProject();
      service.enqueue(project.id, 'ch-1', 1, { a: 1 });
      service.enqueue(project.id, 'ch-2', 2, { b: 2 });

      service.forceSync(project.id, {});

      expect(service.getQueueDepth(project.id)).toBe(0);
    });

    it('should handle queue with depth 50 (CRITICAL threshold)', () => {
      const project = createProject();
      for (let i = 0; i < 50; i++) {
        service.enqueue(project.id, `ch-${i}`, i, { index: i });
      }

      const result = service.forceSync(project.id, {});
      expect(result.consumedCount).toBe(50);
      expect(service.getQueueDepth(project.id)).toBe(0);
    });

    it('should return empty result when queue is empty', () => {
      const project = createProject();
      const result = service.forceSync(project.id, { existing: 'data' });

      expect(result.consumedCount).toBe(0);
      expect(result.conflicts).toEqual([]);
      expect(result.mergedEntries).toEqual({});
    });

    it('should throw NotFoundException when project does not exist', () => {
      expect(() => service.forceSync('nonexistent-id', {})).toThrow(
        NotFoundException,
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // Edge cases
  // ══════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('enqueue should support empty entries object', () => {
      const project = createProject();
      const result = service.enqueue(project.id, 'ch-1', 1, {});
      expect(result.entries).toEqual({});
    });

    it('consumeQueue should handle entries with nested objects', () => {
      const project = createProject();
      const nested = {
        world: {
          continents: {
            东胜神洲: {
              countries: ['大唐', '傲来国'],
            },
          },
        },
      };
      service.enqueue(project.id, 'ch-1', 1, nested);

      const result = service.consumeQueue(project.id, {});
      expect((result.mergedEntries as any).world.continents.东胜神洲.countries).toEqual([
        '大唐',
        '傲来国',
      ]);
    });

    it('consumeQueue should detect no conflicts for non-overlapping keys', () => {
      const project = createProject();
      service.enqueue(project.id, 'ch-1', 1, { characters: {} });
      service.enqueue(project.id, 'ch-2', 2, { locations: {} });
      service.enqueue(project.id, 'ch-3', 3, { timeline: [] });

      const result = service.consumeQueue(project.id, {});
      expect(result.conflicts.length).toBe(0);
    });

    it('should correctly differentiate chapterId and chapterNumber for multiple entries', () => {
      const project = createProject();
      const e1 = service.enqueue(project.id, 'uuid-ch-3', 3, { ch3: true });
      const e2 = service.enqueue(project.id, 'uuid-ch-5', 5, { ch5: true });

      expect(e1.chapterNumber).toBe(3);
      expect(e2.chapterNumber).toBe(5);
      expect(e1.chapterId).not.toBe(e2.chapterId);
    });
  });
});
