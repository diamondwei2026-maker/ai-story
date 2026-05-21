import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './project/project.module';
import { AIGatewayModule } from './ai-gateway/ai-gateway.module';

@Module({
  imports: [PrismaModule, ProjectModule, AIGatewayModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
