import { Module } from '@nestjs/common';
import { StepController } from './step.controller';
import { OutlineController } from './outline.controller';
import { StepService } from './step.service';
import { ProjectModule } from '../project/project.module';
import { AIGatewayModule } from '../ai-gateway/ai-gateway.module';

@Module({
  imports: [ProjectModule, AIGatewayModule],
  controllers: [StepController, OutlineController],
  providers: [StepService],
  exports: [StepService],
})
export class StepModule {}
