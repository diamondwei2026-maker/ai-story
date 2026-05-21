import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'prompts');
const VALID_CATEGORIES = ['creation', 'drafting', 'review', 'extraction', 'system'];

@Injectable()
export class PromptTemplateLoaderService {
  loadTemplate(category: string, name: string): string {
    this.validateCategory(category);
    const filePath = path.join(PROMPTS_DIR, category, `${name}.md`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Template not found: ${category}/${name}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  renderTemplate(
    category: string,
    name: string,
    variables: Record<string, string>,
  ): string {
    const template = this.loadTemplate(category, name);
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return key in variables ? variables[key] : match;
    });
  }

  listTemplates(category?: string): string[] {
    if (category) {
      this.validateCategory(category);
      const dirPath = path.join(PROMPTS_DIR, category);
      return fs
        .readdirSync(dirPath)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''));
    }

    const results: string[] = [];
    for (const cat of VALID_CATEGORIES) {
      const dirPath = path.join(PROMPTS_DIR, cat);
      if (fs.existsSync(dirPath)) {
        for (const f of fs.readdirSync(dirPath)) {
          if (f.endsWith('.md')) {
            results.push(`${cat}/${f.replace(/\.md$/, '')}`);
          }
        }
      }
    }
    return results;
  }

  private validateCategory(category: string): void {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(
        `Invalid category: ${category}. Valid: ${VALID_CATEGORIES.join(', ')}`,
      );
    }
  }
}
