import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { Project } from './project.entity';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  create(@Body() body: { title?: string; config?: Project['config'] }): Project {
    const { title, config } = body;

    if (title === undefined || title === null) {
      throw new BadRequestException('title is required');
    }

    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new BadRequestException('title must be a non-empty string');
    }

    return this.projectService.create({ title, config });
  }
}
