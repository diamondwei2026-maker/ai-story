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
  async create(@Body() body: { title?: string; config?: Project['config'] }): Promise<Project> {
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
  async findAll(): Promise<Project[]> {
    return this.projectService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<Project> {
    const project = await this.projectService.findById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; config?: Project['config']; status?: Project['status'] },
  ): Promise<Project> {
    const project = await this.projectService.update(id, body);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  @Delete(':id')
  @HttpCode(200)
  async delete(@Param('id') id: string): Promise<void> {
    const deleted = await this.projectService.delete(id);
    if (!deleted) {
      throw new NotFoundException('Project not found');
    }
  }

  @Post(':id/archive')
  @HttpCode(200)
  async archive(@Param('id') id: string): Promise<Project> {
    const project = await this.projectService.archive(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  @Post(':id/restore')
  @HttpCode(200)
  async restore(@Param('id') id: string): Promise<Project> {
    const project = await this.projectService.restore(id);
    if (!project) {
      const existing = await this.projectService.findById(id);
      if (!existing) {
        throw new NotFoundException('Project not found');
      }
      throw new BadRequestException('Only archived projects can be restored');
    }
    return project;
  }
}
