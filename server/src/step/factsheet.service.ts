import { Injectable } from '@nestjs/common';
import { FactsheetCompensationService } from './factsheet-compensation.service';

@Injectable()
export class FactsheetService {
  private factSheetByProject: Map<
    string,
    { data: Record<string, unknown>; version: number }
  > = new Map();

  constructor(
    private readonly factsheetCompensation: FactsheetCompensationService,
  ) {}

  getFactsheet(projectId: string): { data: Record<string, unknown>; version: number } | null {
    const sheet = this.factSheetByProject.get(projectId);
    if (!sheet) return null;
    return { data: { ...sheet.data }, version: sheet.version };
  }

  readFactsheet(
    projectId: string,
  ): { data: Record<string, unknown>; version: number } {
    let sheet = this.factSheetByProject.get(projectId);
    if (!sheet) {
      sheet = { data: {}, version: 0 };
      this.factSheetByProject.set(projectId, sheet);
    }
    return { data: { ...sheet.data }, version: sheet.version };
  }

  casWriteFactsheet(
    projectId: string,
    data: Record<string, unknown>,
    expectedVersion: number,
  ): boolean {
    const sheet = this.factSheetByProject.get(projectId);
    if (!sheet || sheet.version !== expectedVersion) return false;
    sheet.data = data;
    sheet.version++;
    return true;
  }

  applyCompensationQueue(projectId: string): void {
    const sheet = this.factSheetByProject.get(projectId)!;
    const result = this.factsheetCompensation.consumeQueue(
      projectId,
      sheet.data,
    );
    if (result.consumedCount > 0) {
      Object.assign(sheet.data, result.mergedEntries);
    }
  }

  forceSyncFactsheet(
    projectId: string,
  ): { mergedEntries: Record<string, unknown>; consumedCount: number } {
    const current = this.readFactsheet(projectId);
    const result = this.factsheetCompensation.forceSync(projectId, current.data);
    if (result.consumedCount > 0) {
      const merged = { ...current.data };
      Object.assign(merged, result.mergedEntries);
      this.factSheetByProject.set(projectId, {
        data: merged,
        version: current.version + 1,
      });
    }
    return { mergedEntries: result.mergedEntries, consumedCount: result.consumedCount };
  }

  /** Direct access for compensation service (used by forceSync in FactsheetCompensationService) */
  getSheetRaw(projectId: string): { data: Record<string, unknown>; version: number } | undefined {
    return this.factSheetByProject.get(projectId);
  }
}
