import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
} from '@nestjs/common';
import { StepService } from './step.service';
import { ChapterData } from './step.entity';

@Controller('projects/:projectId/chapters')
export class ChapterController {
  constructor(private readonly stepService: StepService) {}

  @Get()
  getChapters(@Param('projectId') projectId: string): ChapterData[] {
    return this.stepService.getChaptersByProjectId(projectId);
  }

  @Post(':chapterId/generate')
  generate(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
    @Body()
    body: {
      mode: 'new-continue' | 'paragraph-rewrite' | 'style-upgrade';
      feedback?: string;
    },
  ): Promise<ChapterData> {
    return this.stepService.generateChapter(projectId, chapterId, body);
  }

  @Post(':chapterId/confirm')
  @HttpCode(200)
  confirm(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
  ): Promise<ChapterData> {
    return this.stepService.confirmChapter(projectId, chapterId);
  }

  @Post(':chapterId/dispute')
  @HttpCode(200)
  dispute(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
  ): Promise<ChapterData> {
    return this.stepService.disputeChapter(projectId, chapterId);
  }

  @Post(':chapterId/pause')
  @HttpCode(200)
  pause(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
  ): Promise<ChapterData> {
    return this.stepService.pauseChapterGeneration(projectId, chapterId);
  }

  @Post(':chapterId/continue')
  continue(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
    @Body() body: { currentContent: string },
  ): Promise<ChapterData> {
    return this.stepService.continueChapterGeneration(projectId, chapterId, body);
  }

  @Post(':chapterId/retry')
  retry(
    @Param('projectId') projectId: string,
    @Param('chapterId') chapterId: string,
    @Body()
    body: {
      mode: 'new-continue' | 'paragraph-rewrite' | 'style-upgrade';
      feedback?: string;
    },
  ): Promise<ChapterData> {
    return this.stepService.retryChapterGeneration(projectId, chapterId, body);
  }
}
