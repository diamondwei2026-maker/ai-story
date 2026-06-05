import { Module, forwardRef } from '@nestjs/common';
import { SettingController } from './step.controller';
import { IdeaController } from './idea.controller';
import { OutlineController } from './outline.controller';
import { BeatsController, BeatModificationController } from './beats.controller';
import { ChapterController } from './chapter.controller';
import { FactsheetController } from './factsheet.controller';
import { StepService } from './step.service';
import { StepCoreService } from './services/step-core.service';
import { ChangeAnalysisService } from './change-analysis.service';
import { FactsheetCompensationService } from './factsheet-compensation.service';
import { FactsheetService } from './factsheet.service';
import { ReviewService } from './review.service';
import { StepDataAccessAdapter } from './step-data-access.adapter';
import { ProjectModule } from '../project/project.module';
import { AIGatewayModule } from '../ai-gateway/ai-gateway.module';
import { STEP_DATA_ACCESS } from '../ai-gateway/context-budget.service';

@Module({
  imports: [forwardRef(() => ProjectModule), AIGatewayModule],
  controllers: [
    IdeaController,
    SettingController,
    OutlineController,
    BeatsController,
    BeatModificationController,
    ChapterController,
    FactsheetController,
  ],
  providers: [
    StepService,
    StepCoreService,
    ChangeAnalysisService,
    FactsheetCompensationService,
    FactsheetService,
    ReviewService,
    StepDataAccessAdapter,
    { provide: STEP_DATA_ACCESS, useExisting: StepDataAccessAdapter },
  ],
  exports: [StepService, StepCoreService, ChangeAnalysisService, FactsheetCompensationService],
})
export class StepModule {}
