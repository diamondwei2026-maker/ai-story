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
import { StepDataAccessAdapter } from './step-data-access.adapter';
import { ProjectModule } from '../project/project.module';
import { AIGatewayModule } from '../ai-gateway/ai-gateway.module';
import { STEP_DATA_ACCESS } from '../ai-gateway/context-budget.service';

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
  providers: [
    StepService,
    ChangeAnalysisService,
    FactsheetCompensationService,
    StepDataAccessAdapter,
    { provide: STEP_DATA_ACCESS, useExisting: StepDataAccessAdapter },
  ],
  exports: [StepService, ChangeAnalysisService, FactsheetCompensationService],
})
export class StepModule {}
