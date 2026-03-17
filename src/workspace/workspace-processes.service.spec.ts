import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceProcessesService } from './workspace-processes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { Process } from 'src/processes/entity/process.entity';
import { ProcessVersion } from 'src/processes/entity/processVersions.entity';
import { Workspace } from './entity/workspace.entity';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { ProcessDetail } from 'src/processes/schema/process.schema';
import { UsersService } from 'src/users/users.service';
import { NotificationService } from 'src/notification/notification.service';
import {
  ProcessNotFoundException,
  UnableToCreateProcessException,
} from 'src/common/exceptions';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('WorkspaceProcessesService', () => {
  let service: WorkspaceProcessesService;
  let mockProcessRepository: any;
  let mockProcessVersionRepository: any;
  let mockWorkspaceRepository: any;
  let mockWorkspaceMemberRepository: any;
  let mockProcessDetailModel: any;
  let mockUsersService: any;
  let mockNotificationService: any;

  beforeEach(async () => {
    mockProcessRepository = {
      createQueryBuilder: jest.fn().mockImplementation(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'p1' }]),
      })),
      count: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockProcessVersionRepository = { save: jest.fn(), update: jest.fn(), delete: jest.fn() };
    mockWorkspaceRepository = { findOne: jest.fn() };
    mockWorkspaceMemberRepository = { findOne: jest.fn() };

    mockProcessDetailModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue(true),
    }));
    mockProcessDetailModel.findById = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({ exec: jest.fn() }),
    });
    mockProcessDetailModel.updateOne = jest.fn();
    mockProcessDetailModel.deleteMany = jest.fn();

    mockUsersService = { findOneByEmail: jest.fn() };
    mockNotificationService = { createNotification: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceProcessesService,
        { provide: getRepositoryToken(Process), useValue: mockProcessRepository },
        { provide: getRepositoryToken(ProcessVersion), useValue: mockProcessVersionRepository },
        { provide: getRepositoryToken(Workspace), useValue: mockWorkspaceRepository },
        { provide: getRepositoryToken(WorkspaceMember), useValue: mockWorkspaceMemberRepository },
        { provide: getModelToken(ProcessDetail.name), useValue: mockProcessDetailModel },
        { provide: UsersService, useValue: mockUsersService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<WorkspaceProcessesService>(WorkspaceProcessesService);
  });

  describe('verifyWorkspaceAccess', () => {
    it('should throw NotFoundException if workspace not found', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue(null);
      await expect(service.getProcesses('w1', 1, 10, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user lacks access', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 2 });
      mockWorkspaceMemberRepository.findOne.mockResolvedValue(null);
      await expect(service.getProcesses('w1', 1, 10, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getProcesses', () => {
    it('should return processes', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      const result = await service.getProcesses('w1', 1, 10, 1);
      expect(result.length).toBe(1);
    });
  });

  describe('getProcessCount', () => {
    it('should return process count', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.count.mockResolvedValue(5);
      const result = await service.getProcessCount('w1', 1);
      expect(result).toBe(5);
    });
  });

  describe('getProcess', () => {
    it('should throw ProcessNotFoundException if not found', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.findOne.mockResolvedValue(null);
      await expect(service.getProcess('w1', 'p1', 1)).rejects.toThrow(ProcessNotFoundException);
    });

    it('should return process details', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1, version: 1 });
      mockProcessDetailModel.findById().lean().exec.mockResolvedValue({ xml: '<xml>' });
      
      const result = await service.getProcess('w1', 'p1', 1);
      expect(result.id).toBe('p1');
      expect(result.xml).toBe('<xml>');
    });
  });

  describe('createProcess', () => {
    it('should create process', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.save.mockResolvedValue({ id: 'p1' });
      mockProcessVersionRepository.save.mockResolvedValue({ id: 'v1' });

      const result = await service.createProcess('w1', 1, { name: 'Test' } as any);
      expect(mockProcessRepository.save).toHaveBeenCalled();
      expect(mockProcessDetailModel).toHaveBeenCalled();
      expect(result.id).toBe('p1');
    });

    it('should throw UnableToCreateProcessException on error', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.save.mockResolvedValue({ id: 'p1' });
      mockProcessVersionRepository.save.mockRejectedValue(new Error());

      await expect(service.createProcess('w1', 1, {} as any)).rejects.toThrow(UnableToCreateProcessException);
      expect(mockProcessRepository.delete).toHaveBeenCalled();
    });
  });

  describe('updateProcess', () => {
    it('should throw ForbiddenException if not owner', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 2 });
      await expect(service.updateProcess('w1', 'p1', 1, {} as any)).rejects.toThrow(ForbiddenException);
    });

    it('should update process', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1 });
      
      await service.updateProcess('w1', 'p1', 1, { name: 'New' } as any);
      expect(mockProcessRepository.update).toHaveBeenCalled();
    });
  });

  describe('deleteProcess', () => {
    it('should delete process records', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1 });
      
      await service.deleteProcess('w1', 'p1', 1);
      expect(mockProcessDetailModel.deleteMany).toHaveBeenCalled();
      expect(mockProcessVersionRepository.delete).toHaveBeenCalled();
      expect(mockProcessRepository.delete).toHaveBeenCalled();
    });
  });

  describe('saveProcess', () => {
    it('should update XML and details in MongoDB', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1, version: 1 });
      
      const result = await service.saveProcess('w1', 'p1', 1, { xml: '<new>' } as any);
      expect(mockProcessDetailModel.updateOne).toHaveBeenCalled();
      expect(mockProcessVersionRepository.update).toHaveBeenCalled();
      expect(result.xml).toBe('<new>');
    });
  });

  describe('shareProcess', () => {
    it('should share process and send notification', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1, version: 1, user: { email: 'a@a' } });
      mockUsersService.findOneByEmail.mockResolvedValue({ id: 2, email: 'b@b.com' });
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ userId: 2 });
      mockProcessDetailModel.findById.mockResolvedValue({ versionId: 'v1', activities: [] });
      
      const result = await service.shareProcess('w1', 'p1', 1, ['b@b.com']);
      expect(mockProcessRepository.save).toHaveBeenCalled();
      expect(mockNotificationService.createNotification).toHaveBeenCalled();
      expect(result.sharedWith[0].status).toBe('sent');
    });

    it('should throw if sharing a shared process', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1, sharedByUserId: 2 });
      await expect(service.shareProcess('w1', 'p1', 1, ['b@b.com'])).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSharedUsers', () => {
    it('should return shared users', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', userId: 1 });
      mockProcessRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { user: { id: 2, name: 'U2', email: 'u2' }, createdAt: new Date() }
        ])
      });
      const result = await service.getSharedUsers('w1', 'p1', 1);
      expect(result.sharedWith.length).toBe(1);
    });
  });
});
