// 过渡接口——ProjectService 当前使用内存 Map 存储。
// 权威数据模型见 server/prisma/schema.prisma 的 model Project。
// ProjectService 迁移到 PrismaService 时本文件将被替换为 Prisma 生成的类型。

export interface PendingFactUpdate {
  id: string;
  chapterId: string;
  chapterNumber: number;
  entries: Record<string, unknown>;
  queuedAt: string;
}

export type ProjectStatus = 'IDEA' | 'SETTING' | 'OUTLINE' | 'BEATS' | 'DRAFTING' | 'COMPLETED' | 'ARCHIVED';

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  config: {
    style?: string;
    platform?: string;
    genre?: string;
  };
  pendingFactUpdates?: PendingFactUpdate[];
  createdAt: Date;
  updatedAt: Date;
}
