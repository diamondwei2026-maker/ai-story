import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './project/project.module';

@Module({
  imports: [PrismaModule, ProjectModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
