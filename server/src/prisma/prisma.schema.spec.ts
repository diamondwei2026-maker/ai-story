import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

describe('Prisma Schema', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should expose Project model', () => {
    expect(prisma.project).toBeDefined();
  });

  it('should expose StepData model', () => {
    expect(prisma.stepData).toBeDefined();
  });

  it('should expose Beat model', () => {
    expect(prisma.beat).toBeDefined();
  });

  it('should expose Chapter model', () => {
    expect(prisma.chapter).toBeDefined();
  });

  it('should expose FactSheet model', () => {
    expect(prisma.factSheet).toBeDefined();
  });
});
