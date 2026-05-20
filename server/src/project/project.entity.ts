// 过渡接口——ProjectService 当前使用内存 Map 存储。
// 权威数据模型见 server/prisma/schema.prisma 的 model Project。
// ProjectService 迁移到 PrismaService 时本文件将被替换为 Prisma 生成的类型。
export interface Project {
  id: string;
  title: string;
  status: 'IDEA';
  config: {
    style?: string;
    platform?: string;
    genre?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
