import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

describe('PrismaModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
  });

  it('should provide PrismaService', () => {
    const service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
    expect(typeof service.$connect).toBe('function');
  });

  it('should export PrismaService for other modules', () => {
    const exported = module.get<PrismaService>(PrismaService);
    expect(exported.$connect).toBeDefined();
    expect(exported.$disconnect).toBeDefined();
  });
});
