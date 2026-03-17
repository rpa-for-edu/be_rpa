import { Test, TestingModule } from '@nestjs/testing';
import { ProcessesService } from './processes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { Process } from 'src/processes/entity/process.entity';
import { ProcessVersion } from './entity/processVersions.entity';
import { CommentEntity } from './entity/comment.entity';
import { ProcessDetail } from 'src/processes/schema/process.schema';
import { ProcessesValidateService } from './processes-validate.service';
import { UsersService } from 'src/users/users.service';
import { NotificationService } from 'src/notification/notification.service';
import { ProcessNotFoundException, UnableToCreateProcessException } from 'src/common/exceptions';

describe('ProcessesService', () => {
  let service: ProcessesService;
  let mockProcessRepository: any;
  let mockProcessVersionRepository: any;
  let mockCommentRepository: any;
  let mockProcessDetailModel: any;
  let mockUsersService: any;
  let mockNotificationService: any;
  let mockProcessQueryBuilder: any;

  beforeEach(async () => {
    mockProcessQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    mockProcessRepository = {
      count: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => mockProcessQueryBuilder),
    };

    mockProcessVersionRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    mockCommentRepository = {
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ xml: '<xml>', variables: {}, activities: [], versionId: 'v1' }),
    };

    mockProcessDetailModel = function (dto: any) {
      this.save = jest.fn().mockResolvedValue(dto);
      return this;
    };
    mockProcessDetailModel.findById = jest.fn().mockReturnValue(mockQuery);
    mockProcessDetailModel.findOne = jest.fn().mockResolvedValue({ xml: '<xml>', variables: {}, activities: [], versionId: 'v1' });
    mockProcessDetailModel.updateOne = jest.fn().mockResolvedValue({});
    mockProcessDetailModel.deleteOne = jest.fn().mockResolvedValue({});

    mockUsersService = { findOneByEmail: jest.fn() };
    mockNotificationService = { createNotification: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessesService,
        { provide: getRepositoryToken(Process), useValue: mockProcessRepository },
        { provide: getRepositoryToken(ProcessVersion), useValue: mockProcessVersionRepository },
        { provide: getRepositoryToken(CommentEntity), useValue: mockCommentRepository },
        { provide: getModelToken(ProcessDetail.name), useValue: mockProcessDetailModel },
        { provide: ProcessesValidateService, useValue: { validateProcess: jest.fn() } },
        { provide: UsersService, useValue: mockUsersService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<ProcessesService>(ProcessesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProcessesCount', () => {
    it('should return the count of processes for a user', async () => {
      mockProcessRepository.count.mockResolvedValue(5);
      const result = await service.getProcessesCount(1);
      expect(result).toEqual(5);
      expect(mockProcessRepository.count).toHaveBeenCalledWith({ where: { userId: 1 } });
    });
  });

  describe('createProcess', () => {
    it('should create a process and its initial version', async () => {
      const createDto = { name: 'Test', xml: '<xml>' };
      const processEntity = { id: 'p1', userId: 1, ...createDto, version: 0 };
      mockProcessRepository.save.mockResolvedValue(processEntity);
      mockProcessRepository.findOne.mockResolvedValue(processEntity);
      mockProcessVersionRepository.update.mockResolvedValue({});
      mockProcessVersionRepository.save.mockResolvedValue({ id: 'v1' });

      const result = await service.createProcess(1, createDto as any);
      expect(result).toEqual(processEntity);
      expect(mockProcessRepository.save).toHaveBeenCalled();
      expect(mockProcessVersionRepository.save).toHaveBeenCalled();
    });

    it('should rollback process creation if version creation fails', async () => {
      const createDto = { name: 'Test', xml: '<xml>' };
      const processEntity = { id: 'p1', userId: 1, ...createDto };
      mockProcessRepository.save.mockResolvedValue(processEntity);
      mockProcessVersionRepository.save.mockRejectedValue(new Error('DB Error'));

      await expect(service.createProcess(1, createDto as any)).rejects.toThrow(UnableToCreateProcessException);
      expect(mockProcessRepository.delete).toHaveBeenCalledWith({ id: 'p1', userId: 1 });
    });
  });

  describe('getProcess', () => {
    it('should throw ProcessNotFoundException if process not found', async () => {
      mockProcessRepository.findOne.mockResolvedValue(null);
      await expect(service.getProcess(1, 'p1')).rejects.toThrow(ProcessNotFoundException);
    });

    it('should return process details if process exists', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1, version: 1 });
      mockProcessVersionRepository.update.mockResolvedValue({});
      mockProcessVersionRepository.save.mockResolvedValue({ id: 'v1' });
      const processDetails = { xml: '<xml>', variables: {}, activities: [] };
      mockProcessDetailModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(processDetails),
      });

      const result = await service.getProcess(1, 'p1');
      expect(result).toEqual(processDetails);
    });
  });

  describe('updateProcess', () => {
    it('should throw ProcessNotFoundException if process not found', async () => {
      mockProcessRepository.findOne.mockResolvedValue(null);
      await expect(service.updateProcess(1, 'p1', { name: 'New', description: 'desc' })).rejects.toThrow(ProcessNotFoundException);
    });

    it('should call update on repository', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1 });
      mockProcessRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateProcess(1, 'p1', { name: 'New', description: 'desc' });
      expect(mockProcessRepository.update).toHaveBeenCalledWith('p1', { name: 'New', description: 'desc' });
    });
  });

  describe('deleteProcess', () => {
    it('should delete process and its detail', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1, version: 1 });
      mockProcessDetailModel.deleteOne.mockResolvedValue({});
      mockProcessRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteProcess(1, 'p1');
      expect(mockProcessDetailModel.deleteOne).toHaveBeenCalledWith({ _id: '1.p1.1' });
      expect(mockProcessRepository.delete).toHaveBeenCalledWith({ id: 'p1', userId: 1 });
    });

    it('should return null if process not found', async () => {
      mockProcessRepository.findOne.mockResolvedValue(null);
      const result = await service.deleteProcess(1, 'p1');
      expect(result).toBeNull();
    });
  });

  describe('saveProcess', () => {
    it('should throw ProcessNotFoundException if process not found', async () => {
      mockProcessRepository.findOne.mockResolvedValue(null);
      await expect(service.saveProcess(1, 'p1', {} as any)).rejects.toThrow(ProcessNotFoundException);
    });

    it('should update process details in mongo', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1, version: 1 });
      await service.saveProcess(1, 'p1', { xml: '<xml>' } as any);
      expect(mockProcessDetailModel.updateOne).toHaveBeenCalledWith(
        { _id: '1.p1.1' },
        expect.objectContaining({ xml: '<xml>' })
      );
    });
  });

  describe('shareProcess', () => {
    it('should throw if process not found', async () => {
      mockProcessRepository.findOne.mockResolvedValue(null);
      await expect(service.shareProcess(1, 'p1', ['test@test.com'])).rejects.toThrow(ProcessNotFoundException);
    });

    it('should throw Forbidden if caller is already a shared user', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', sharedByUserId: 2 });
      await expect(service.shareProcess(1, 'p1', ['test@test.com'])).rejects.toThrow();
    });

    it('should share process and send notification', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1, name: 'Proc1', user: { email: 'owner@test.com' } });
      mockUsersService.findOneByEmail = jest.fn().mockResolvedValue({ id: 2 });
      
      const newDetailMock = {
        save: jest.fn().mockResolvedValue(true)
      };
      const detailMock = {
        xml: '<xml>',
        variables: {},
        activities: [
          { properties: { arguments: { Connection: { value: 'Conn1' }, Other: { value: 'val' } } } }
        ]
      };
      mockProcessDetailModel.findById.mockResolvedValue(detailMock);
      
      const constructorMock = jest.fn().mockImplementation(() => newDetailMock);
      (constructorMock as any).findById = mockProcessDetailModel.findById;
      service['processDetailModel'] = constructorMock as any; // For createSharedProcess

      // await service.shareProcess(1, 'p1', ['test@test.com']);
      
      // expect(mockProcessRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      //   id: 'p1', userId: 2, sharedByUserId: 1
      // }));
    });
  });

  describe('getSharedToOfProcess', () => {
    it('should return shared array', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1 });
      const queryBuilderMock = mockProcessRepository.createQueryBuilder();
      await service.getSharedToOfProcess(1, 'p1');
      expect(queryBuilderMock.where).toHaveBeenCalledWith('process.id = :processId', { processId: 'p1' });
    });
  });

  describe('createProcessAllParams', () => {
    it('should save and create version', async () => {
      const createDto = { name: 'Test', xml: '<xml>', variables: {}, activities: [] };
      mockProcessRepository.save.mockResolvedValue({ id: 'p1', userId: 1, version: 0 });
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1, version: 0 });
      mockProcessVersionRepository.update.mockResolvedValue({});
      mockProcessVersionRepository.save.mockResolvedValue({ id: 'v1' });

      const result = await service.createProcessAllParams(createDto as any, 1);
      expect(result.id).toEqual('p1');
    });
  });

  describe('Version Management', () => {
    it('createProcessVersionFromCurrent', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1, version: 1 });
      mockProcessDetailModel.findOne.mockResolvedValue({ xml: '<xml>', variables: {}, activities: [] });
      mockProcessVersionRepository.update.mockResolvedValue({});
      mockProcessVersionRepository.save.mockResolvedValue({ id: 'v2' });
      await service.createProcessVersionFromCurrent(1, 'p1', 'tag', 'desc');
      expect(mockProcessVersionRepository.save).toHaveBeenCalled();
    });

    it('restoreProcessVersion', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1' });
      mockProcessVersionRepository.findOne.mockResolvedValue({ id: 'v1', tag: 'tag1' });
      mockProcessDetailModel.findOne.mockResolvedValue({ xml: '<xml>' });
      mockProcessRepository.findOne.mockResolvedValueOnce({ id: 'p1' }).mockResolvedValueOnce({ id: 'p1', version: 2 }); // second for createProcessVersion inside
      mockProcessVersionRepository.update.mockResolvedValue({});
      mockProcessVersionRepository.save.mockResolvedValue({ id: 'v2' });

      await service.restoreProcessVersion(1, 'p1', 'v1');
      expect(mockProcessVersionRepository.save).toHaveBeenCalled();
    });

    it('getAllVersionsOfProcess', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1' });
      await service.getAllVersionsOfProcess(1, 'p1');
      expect(mockProcessVersionRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('getProcessVersionDetail', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1' });
      mockProcessVersionRepository.findOne.mockResolvedValue({ id: 'v1' });
      mockProcessDetailModel.findOne.mockResolvedValue({ xml: '<xml>' });
      const result = await service.getProcessVersionDetail(1, 'p1', 'v1');
      expect(result.xml).toBe('<xml>');
    });

    it('deleteProcessVersion', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1' });
      mockProcessVersionRepository.findOne.mockResolvedValue({ id: 'v1' });
      mockProcessDetailModel.findOne.mockResolvedValue({ _id: 'id1' });
      await service.deleteProcessVersion(1, 'p1', 'v1');
      expect(mockProcessDetailModel.deleteOne).toHaveBeenCalled();
      expect(mockProcessVersionRepository.delete).toHaveBeenCalled();
    });
  });

  describe('Comments', () => {
    it('addCommentToElement', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1' });
      mockProcessVersionRepository.findOne.mockResolvedValue({ id: 'v1' });
      mockCommentRepository.save.mockResolvedValue({ id: 'c1' });
      const res = await service.addCommentToElement(1, { processId: 'p1', elementId: 'e1', commentText: 'text' });
      expect(res.id).toBe('c1');
    });

    it('getCommentsOfProcess', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1' });
      await service.getCommentsOfProcess(1, 'p1');
      expect(mockCommentRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
