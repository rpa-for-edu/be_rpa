import { Test, TestingModule } from '@nestjs/testing';
import { TeamProcessesService } from './team-processes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { Process } from 'src/processes/entity/process.entity';
import { ProcessVersion } from 'src/processes/entity/processVersions.entity';
import { ProcessDetail } from 'src/processes/schema/process.schema';
import { TeamPermissionService } from './team-permission.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('TeamProcessesService', () => {
  let service: TeamProcessesService;
  let mockProcessRepository: any;
  let mockProcessVersionRepository: any;
  let mockProcessDetailModel: any;
  let mockTeamPermissionService: any;

  beforeEach(async () => {
    mockProcessRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockProcessVersionRepository = {
      save: jest.fn(),
      update: jest.fn(),
    };

    mockProcessDetailModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue(dto),
    }));
    mockProcessDetailModel.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
    });
    mockProcessDetailModel.deleteMany = jest.fn();

    mockTeamPermissionService = {
      checkTeamMember: jest.fn(),
      requirePermission: jest.fn(),
      validateProcessTemplates: jest.fn().mockResolvedValue([]),
      getTeamWithWorkspace: jest.fn().mockResolvedValue({ workspaceId: 'w1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamProcessesService,
        { provide: getRepositoryToken(Process), useValue: mockProcessRepository },
        { provide: getRepositoryToken(ProcessVersion), useValue: mockProcessVersionRepository },
        { provide: getModelToken(ProcessDetail.name), useValue: mockProcessDetailModel },
        { provide: TeamPermissionService, useValue: mockTeamPermissionService },
      ],
    }).compile();

    service = module.get<TeamProcessesService>(TeamProcessesService);
  });

  describe('getProcesses', () => {
    it('should return processes with pagination', async () => {
      mockTeamPermissionService.checkTeamMember.mockResolvedValue({});
      mockProcessRepository.findAndCount.mockResolvedValue([
        [{ id: 'p1', user: { name: 'User1' } }], 1
      ]);

      const result = await service.getProcesses('t1', 1, { page: 1, limit: 10 });
      expect(result.pagination.total).toBe(1);
      expect(result.processes.length).toBe(1);
      expect(mockTeamPermissionService.requirePermission).toHaveBeenCalledWith(expect.anything(), 'view_processes');
    });
  });

  describe('getProcess', () => {
    it('should return a single process', async () => {
      mockTeamPermissionService.checkTeamMember.mockResolvedValue({});
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', version: 1 });
      
      const mockDetail = { _id: '1.p1.1' };
      mockProcessDetailModel.findOne().lean().exec.mockResolvedValue(mockDetail);

      const result = await service.getProcess('t1', 'p1', 1);
      expect(result).toEqual(mockDetail);
    });

    it('should throw NotFoundException if process not found in DB', async () => {
      mockProcessRepository.findOne.mockResolvedValue(null);
      await expect(service.getProcess('t1', 'p1', 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createProcess', () => {
    it('should validate templates and create process', async () => {
      const createDto = { id: 'p1', name: 'Test', activities: [{ activityTemplateId: 'act1' }] };
      mockTeamPermissionService.checkTeamMember.mockResolvedValue({});
      mockProcessRepository.save.mockResolvedValue({ id: 'p1', version: 1 });
      mockProcessVersionRepository.save.mockResolvedValue({ id: 'v1' });

      const result = await service.createProcess('t1', 1, createDto);
      expect(mockTeamPermissionService.validateProcessTemplates).toHaveBeenCalled();
      expect(mockProcessRepository.save).toHaveBeenCalled();
      expect(result.processId).toBe('p1');
    });

    it('should throw BadRequestException on validation fail', async () => {
      mockTeamPermissionService.validateProcessTemplates.mockResolvedValue(['error']);
      await expect(service.createProcess('t1', 1, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateProcess', () => {
    it('should update process metadata without new version if no activities/xml', async () => {
      const process = { id: 'p1', version: 1 };
      mockProcessRepository.findOne.mockResolvedValue(process);
      mockProcessRepository.save.mockResolvedValue(process);

      await service.updateProcess('t1', 'p1', 1, { name: 'Updated name' });
      expect((process as any).name).toBe('Updated name');
      expect(mockProcessVersionRepository.save).not.toHaveBeenCalled();
    });

    it('should create new version if xml/activities updated', async () => {
      const process = { id: 'p1', version: 1 };
      mockProcessRepository.findOne.mockResolvedValue(process);
      mockProcessRepository.save.mockResolvedValue({ id: 'p1', version: 2 });
      mockProcessVersionRepository.save.mockResolvedValue({ id: 'v2' });

      await service.updateProcess('t1', 'p1', 1, { xml: '<xml>' });
      
      expect(process.version).toBe(2);
      expect(mockProcessVersionRepository.save).toHaveBeenCalled();
      expect(mockProcessDetailModel).toHaveBeenCalled();
    });
  });

  describe('deleteProcess', () => {
    it('should delete process records', async () => {
      mockTeamPermissionService.checkTeamMember.mockResolvedValue({});
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1' });
      
      await service.deleteProcess('t1', 'p1', 1);
      
      expect(mockTeamPermissionService.requirePermission).toHaveBeenCalledWith(expect.anything(), 'delete_process');
      expect(mockProcessRepository.remove).toHaveBeenCalled();
      expect(mockProcessDetailModel.deleteMany).toHaveBeenCalledWith({ processId: 'p1' });
    });

    it('should throw if process not found', async () => {
      mockProcessRepository.findOne.mockResolvedValue(null);
      await expect(service.deleteProcess('t1', 'p1', 1)).rejects.toThrow(NotFoundException);
    });
  });

});
