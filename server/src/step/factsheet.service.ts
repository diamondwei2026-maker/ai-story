import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FactsheetCompensationService } from './factsheet-compensation.service';

@Injectable()
export class FactsheetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly factsheetCompensation: FactsheetCompensationService,
  ) {}

  getFactsheet(projectId: string): { data: Record<string, unknown>; version: number } | null {
    return this.readFactsheetSync(projectId);
  }

  private readFactsheetSync(projectId: string): { data: Record<string, unknown>; version: number } | null {
    // Synchronous access for callers that can't await — uses a cached version
    return (this as any)._factsheetCache?.get(projectId) ?? null;
  }

  async readFactsheetAsync(projectId: string): Promise<{ data: Record<string, unknown>; version: number }> {
    const doc = await this.prisma.factSheet.findUnique({ where: { projectId } });
    if (!doc) return { data: {}, version: 0 };
    return {
      data: (doc.entries as Record<string, unknown>) ?? {},
      version: doc.version,
    };
  }

  readFactsheet(projectId: string): { data: Record<string, unknown>; version: number } {
    // Returns from cache; use ensureFactsheetLoaded first in async context
    const cached = this.readFactsheetSync(projectId);
    if (cached) return cached;
    // Fallback: return empty for sync callers
    return { data: {}, version: 0 };
  }

  async ensureFactsheetLoaded(projectId: string): Promise<void> {
    const sheet = await this.readFactsheetAsync(projectId);
    if (!(this as any)._factsheetCache) {
      (this as any)._factsheetCache = new Map();
    }
    (this as any)._factsheetCache.set(projectId, sheet);
  }

  async casWriteFactsheet(
    projectId: string,
    data: Record<string, unknown>,
    expectedVersion: number,
  ): Promise<boolean> {
    try {
      const doc = await this.prisma.factSheet.findUnique({ where: { projectId } });
      if (!doc) {
        // Create initial sheet
        await this.prisma.factSheet.create({
          data: { projectId, entries: data as any, version: 1 },
        });
        this.updateCache(projectId, { data, version: 1 });
        return expectedVersion === 0;
      }
      if (doc.version !== expectedVersion) return false;

      await this.prisma.factSheet.update({
        where: { projectId },
        data: { entries: data as any, version: { increment: 1 } },
      });
      this.updateCache(projectId, { data, version: doc.version + 1 });
      return true;
    } catch {
      return false;
    }
  }

  async applyCompensationQueue(projectId: string): Promise<void> {
    const result = this.factsheetCompensation.consumeQueue(projectId, {});
    if (result.consumedCount > 0) {
      const current = await this.readFactsheetAsync(projectId);
      const merged = { ...current.data };
      Object.assign(merged, result.mergedEntries);
      await this.casWriteFactsheet(projectId, merged, current.version);
    }
  }

  async forceSyncFactsheet(
    projectId: string,
  ): Promise<{ mergedEntries: Record<string, unknown>; consumedCount: number }> {
    const current = await this.readFactsheetAsync(projectId);
    const result = this.factsheetCompensation.forceSync(projectId, current.data);
    if (result.consumedCount > 0) {
      const merged = { ...current.data };
      Object.assign(merged, result.mergedEntries);
      await this.casWriteFactsheet(projectId, merged, current.version);
    }
    return { mergedEntries: result.mergedEntries, consumedCount: result.consumedCount };
  }

  private updateCache(projectId: string, sheet: { data: Record<string, unknown>; version: number }): void {
    if (!(this as any)._factsheetCache) {
      (this as any)._factsheetCache = new Map();
    }
    (this as any)._factsheetCache.set(projectId, sheet);
  }
}
