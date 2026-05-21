import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  BadRequestException,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
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

  @Get()
  findAll(): Project[] {
    return this.projectService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string): Project {
    const project = this.projectService.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { title?: string; config?: Project['config'] },
  ): Project {
    const project = this.projectService.update(id, body);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  @Delete(':id')
  @HttpCode(200)
  delete(@Param('id') id: string): void {
    const deleted = this.projectService.delete(id);
    if (!deleted) {
      throw new NotFoundException('Project not found');
    }
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(@Param('id') id: string): Project {
    const project = this.projectService.archive(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@Param('id') id: string): Project {
    const project = this.projectService.restore(id);
    if (!project) {
      const existing = this.projectService.findById(id);
      if (!existing) {
        throw new NotFoundException('Project not found');
      }
      throw new BadRequestException('Only archived projects can be restored');
    }
    return project;
  }
}
