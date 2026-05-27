import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PendingFactUpdate } from '../project/project.entity';
import { ProjectService } from '../project/project.service';

export interface ConflictRecord {
  field: string;
  existingValue: unknown;
  incomingValue: unknown;
  resolution: 'LATEST_WINS';
}

export interface ConsumeResult {
  mergedEntries: Record<string, unknown>;
  consumedCount: number;
  conflicts: ConflictRecord[];
}

export type AlertLevel = 'NORMAL' | 'PRIORITY' | 'WARNING' | 'CRITICAL';

export interface QueueAlert {
  level: AlertLevel;
  depth: number;
}

export class FactsheetQueueFullError extends Error {
  constructor(
    public readonly projectId: string,
    public readonly depth: number,
  ) {
    super(`FactSheet compensation queue is full (depth=${depth}). Force sync required.`);
    this.name = 'FactsheetQueueFullError';
  }
}

@Injectable()
export class FactsheetCompensationService {
  private static readonly PRIORITY_THRESHOLD = 5;
  private static readonly WARNING_THRESHOLD = 10;
  private static readonly CRITICAL_THRESHOLD = 50;

  constructor(private readonly projectService: ProjectService) {}

  private getProjectOrThrow(projectId: string) {
    const project = this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return project;
  }

  private ensureQueue(projectId: string): PendingFactUpdate[] {
    const project = this.getProjectOrThrow(projectId);
    if (!project.pendingFactUpdates) {
      project.pendingFactUpdates = [];
    }
    return project.pendingFactUpdates;
  }

  enqueue(
    projectId: string,
    chapterId: string,
    chapterNumber: number,
    entries: Record<string, unknown>,
  ): PendingFactUpdate {
    const queue = this.ensureQueue(projectId);

    // Dedup by chapterId: if same chapter re-enqueues (e.g. concurrent CAS failures),
    // merge entries into its existing queue entry (latest-wins for same keys).
    const existing = queue.find((e) => e.chapterId === chapterId);
    if (existing) {
      Object.assign(existing.entries, entries);
      return existing;
    }

    if (queue.length >= FactsheetCompensationService.CRITICAL_THRESHOLD) {
      throw new FactsheetQueueFullError(projectId, queue.length);
    }

    const entry: PendingFactUpdate = {
      id: randomUUID(),
      chapterId,
      chapterNumber,
      entries: { ...entries },
      queuedAt: new Date().toISOString(),
    };

    queue.push(entry);
    return entry;
  }

  getQueueDepth(projectId: string): number {
    const project = this.getProjectOrThrow(projectId);
    return project.pendingFactUpdates?.length ?? 0;
  }

  getAlertLevel(projectId: string): QueueAlert {
    const depth = this.getQueueDepth(projectId);

    let level: AlertLevel;
    if (depth >= FactsheetCompensationService.CRITICAL_THRESHOLD) {
      level = 'CRITICAL';
    } else if (depth >= FactsheetCompensationService.WARNING_THRESHOLD) {
      level = 'WARNING';
    } else if (depth >= FactsheetCompensationService.PRIORITY_THRESHOLD) {
      level = 'PRIORITY';
    } else {
      level = 'NORMAL';
    }

    return { level, depth };
  }

  consumeQueue(
    projectId: string,
    _currentFactSheet: Record<string, unknown>,
  ): ConsumeResult {
    return this.drainQueue(projectId);
  }

  forceSync(
    projectId: string,
    _currentFactSheet: Record<string, unknown>,
  ): ConsumeResult {
    return this.drainQueue(projectId);
  }

  private drainQueue(projectId: string): ConsumeResult {
    const queue = this.ensureQueue(projectId);

    if (queue.length === 0) {
      return { mergedEntries: {}, consumedCount: 0, conflicts: [] };
    }

    const sorted = [...queue].sort(
      (a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime(),
    );

    const merged: Record<string, unknown> = {};
    const keySources = new Map<string, string[]>(); // key → ids that set it
    const entryById = new Map(sorted.map((e) => [e.id, e]));

    for (const entry of sorted) {
      for (const key of Object.keys(entry.entries)) {
        if (!keySources.has(key)) {
          keySources.set(key, []);
        }
        keySources.get(key)!.push(entry.id);
        merged[key] = entry.entries[key];
      }
    }

    const conflicts: ConflictRecord[] = [];
    for (const [key, ids] of keySources) {
      if (ids.length > 1) {
        const firstEntry = entryById.get(ids[0])!;
        const lastEntry = entryById.get(ids[ids.length - 1])!;
        conflicts.push({
          field: key,
          existingValue: firstEntry.entries[key],
          incomingValue: lastEntry.entries[key],
          resolution: 'LATEST_WINS',
        });
      }
    }

    const consumedCount = queue.length;
    queue.length = 0;

    return { mergedEntries: merged, consumedCount, conflicts };
  }
}
