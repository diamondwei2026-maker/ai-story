import { Module } from '@nestjs/common';
import { StepController } from './step.controller';
import { IdeaController } from './idea.controller';
import { OutlineController } from './outline.controller';
import { BeatsController, BeatModificationController } from './beats.controller';
import { ChapterController } from './chapter.controller';
import { FactsheetController } from './factsheet.controller';
import { StepService } from './step.service';
import { ChangeAnalysisService } from './change-analysis.service';
import { FactsheetCompensationService } from './factsheet-compensation.service';
import { ProjectModule } from '../project/project.module';
import { AIGatewayModule } from '../ai-gateway/ai-gateway.module';

@Module({
  imports: [ProjectModule, AIGatewayModule],
  controllers: [
    IdeaController,
    StepController,
    OutlineController,
    BeatsController,
    BeatModificationController,
    ChapterController,
    FactsheetController,
  ],
  providers: [StepService, ChangeAnalysisService, FactsheetCompensationService],
  exports: [StepService, ChangeAnalysisService, FactsheetCompensationService],
})
export class StepModule {}
