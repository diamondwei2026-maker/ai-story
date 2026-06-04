import { Module, forwardRef } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { StepModule } from '../step/step.module';

@Module({
  imports: [forwardRef(() => StepModule)],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
