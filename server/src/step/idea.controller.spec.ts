import { Test, TestingModule } from '@nestjs/testing';
import { IdeaController } from './idea.controller';
import { StepService } from './step.service';

describe('IdeaController', () => {
  let controller: IdeaController;
  let stepService: StepService;

  const mockStepService = {
    generateIdea: jest.fn(),
    generateIdeaSummary: jest.fn(),
    confirmIdea: jest.fn(),
    rejectIdea: jest.fn(),
    getIdeaByProjectId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdeaController],
      providers: [{ provide: StepService, useValue: mockStepService }],
    }).compile();

    controller = module.get<IdeaController>(IdeaController);
    stepService = module.get<StepService>(StepService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST generate', () => {
    it('should delegate to stepService.generateIdea', async () => {
      const mockStep = { id: 'step-1', phaseType: 'IDEA', status: 'AWAITING_REVIEW' };
      mockStepService.generateIdea.mockResolvedValue(mockStep);

      const result = await controller.generate('proj-1', {
        idea: '一个星际医生的故事',
      });

      expect(stepService.generateIdea).toHaveBeenCalledWith('proj-1', {
        idea: '一个星际医生的故事',
      });
      expect(result).toEqual(mockStep);
    });

    it('should pass feedback parameter for regeneration', async () => {
      const mockStep = { id: 'step-1', phaseType: 'IDEA', status: 'AWAITING_REVIEW' };
      mockStepService.generateIdea.mockResolvedValue(mockStep);

      await controller.generate('proj-1', {
        idea: '星际医生',
        feedback: '请更偏向轻松搞笑风格',
      });

      expect(stepService.generateIdea).toHaveBeenCalledWith('proj-1', {
        idea: '星际医生',
        feedback: '请更偏向轻松搞笑风格',
      });
    });
  });

  describe('POST summary', () => {
    it('should delegate to stepService.generateIdeaSummary', async () => {
      const mockStep = { id: 'step-1', phaseType: 'IDEA', output: '一句话简介\n...' };
      mockStepService.generateIdeaSummary.mockResolvedValue(mockStep);

      const result = await controller.summary('proj-1', {
        selectedSellPoint: 0,
      });

      expect(stepService.generateIdeaSummary).toHaveBeenCalledWith('proj-1', {
        selectedSellPoint: 0,
      });
      expect(result).toEqual(mockStep);
    });

    it('should accept optional customBrief', async () => {
      const mockStep = { id: 'step-1', phaseType: 'IDEA' };
      mockStepService.generateIdeaSummary.mockResolvedValue(mockStep);

      await controller.summary('proj-1', {
        selectedSellPoint: 2,
        customBrief: '修改版一句话简介',
      });

      expect(stepService.generateIdeaSummary).toHaveBeenCalledWith('proj-1', {
        selectedSellPoint: 2,
        customBrief: '修改版一句话简介',
      });
    });
  });

  describe('POST confirm', () => {
    it('should delegate to stepService.confirmIdea and return 200', async () => {
      const mockStep = {
        id: 'step-1', phaseType: 'IDEA', status: 'CONFIRMED',
        confirmedAt: new Date(),
      };
      mockStepService.confirmIdea.mockResolvedValue(mockStep);

      const result = await controller.confirm('proj-1', {
        selectedSellPoint: 0,
      });

      expect(stepService.confirmIdea).toHaveBeenCalledWith('proj-1', {
        selectedSellPoint: 0,
      });
      expect(result).toEqual(mockStep);
    });

    it('should accept optional customBrief in confirm', async () => {
      const mockStep = { id: 'step-1', phaseType: 'IDEA', status: 'CONFIRMED' };
      mockStepService.confirmIdea.mockResolvedValue(mockStep);

      await controller.confirm('proj-1', {
        selectedSellPoint: 1,
        customBrief: '星际医妃以手术刀撬动星际权力格局',
      });

      expect(stepService.confirmIdea).toHaveBeenCalledWith('proj-1', {
        selectedSellPoint: 1,
        customBrief: '星际医妃以手术刀撬动星际权力格局',
      });
    });
  });

  describe('POST reject', () => {
    it('should delegate to stepService.rejectIdea and return 200', async () => {
      const mockStep = { id: 'step-1', phaseType: 'IDEA', status: 'REJECTED' };
      mockStepService.rejectIdea.mockResolvedValue(mockStep);

      const result = await controller.reject('proj-1');

      expect(stepService.rejectIdea).toHaveBeenCalledWith('proj-1');
      expect(result).toEqual(mockStep);
    });
  });

  describe('GET getIdea', () => {
    it('should delegate to stepService.getIdeaByProjectId', () => {
      const mockStep = { id: 'step-1', phaseType: 'IDEA', output: '卖点方案...' };
      mockStepService.getIdeaByProjectId.mockReturnValue(mockStep);

      const result = controller.getPhaseData('proj-1');

      expect(stepService.getIdeaByProjectId).toHaveBeenCalledWith('proj-1');
      expect(result).toEqual(mockStep);
    });

    it('should throw NotFoundException when no IDEA step exists', () => {
      mockStepService.getIdeaByProjectId.mockReturnValue(null);

      expect(() => controller.getPhaseData('proj-1')).toThrow();
    });
  });
});
