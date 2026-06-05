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

  // ─── Issue #26 Phase 0: Beat V2 columns ──────────────────

  it('should have narrativeSummary column on Beat (V2)', () => {
    const fields = (prisma as any).beat?.fields ?? {};
    expect(fields).toHaveProperty('narrativeSummary');
    expect(fields.narrativeSummary.typeName).toBe('String');
  });

  it('should have pacingLabel column on Beat (V2)', () => {
    const fields = (prisma as any).beat?.fields ?? {};
    expect(fields).toHaveProperty('pacingLabel');
  });

  it('should have hookCausalChain column on Beat (V2)', () => {
    const fields = (prisma as any).beat?.fields ?? {};
    expect(fields).toHaveProperty('hookCausalChain');
  });

  it('should have conflictIntensity column on Beat (V2)', () => {
    const fields = (prisma as any).beat?.fields ?? {};
    expect(fields).toHaveProperty('conflictIntensity');
  });

  it('should have readerExpectation column on Beat (V2)', () => {
    const fields = (prisma as any).beat?.fields ?? {};
    expect(fields).toHaveProperty('readerExpectation');
  });

  it('should have conflictDescription column on Beat (V2)', () => {
    const fields = (prisma as any).beat?.fields ?? {};
    expect(fields).toHaveProperty('conflictDescription');
  });
});
