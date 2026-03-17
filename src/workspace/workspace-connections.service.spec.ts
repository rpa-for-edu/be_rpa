import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceConnectionsService } from './workspace-connections.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkspaceConnection } from './entity/workspace-connection.entity';
import { Workspace } from './entity/workspace.entity';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { AuthorizationProvider } from 'src/connection/entity/connection.entity';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';

describe('WorkspaceConnectionsService', () => {
  let service: WorkspaceConnectionsService;
  let mockWorkspaceConnectionRepository: any;
  let mockWorkspaceRepository: any;
  let mockWorkspaceMemberRepository: any;

  beforeEach(async () => {
    mockWorkspaceConnectionRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    mockWorkspaceRepository = { findOne: jest.fn() };
    mockWorkspaceMemberRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceConnectionsService,
        { provide: getRepositoryToken(WorkspaceConnection), useValue: mockWorkspaceConnectionRepository },
        { provide: getRepositoryToken(Workspace), useValue: mockWorkspaceRepository },
        { provide: getRepositoryToken(WorkspaceMember), useValue: mockWorkspaceMemberRepository },
      ],
    }).compile();

    service = module.get<WorkspaceConnectionsService>(WorkspaceConnectionsService);
  });

  describe('createConnection', () => {
    it('should throw if not workspace owner', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 2 });
      await expect(service.createConnection('w1', 1, {} as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if connection exists', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockWorkspaceConnectionRepository.findOne.mockResolvedValue({});
      await expect(service.createConnection('w1', 1, {} as any)).rejects.toThrow(ConflictException);
    });

    it('should create and save connection', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockWorkspaceConnectionRepository.findOne.mockResolvedValue(null);
      mockWorkspaceConnectionRepository.create.mockReturnValue({ connectionKey: 'key' });
      mockWorkspaceConnectionRepository.save.mockResolvedValue({ connectionKey: 'key' });

      const dto = { provider: 'test', name: 'conn1', accessToken: 'a', refreshToken: 'r' } as any;
      const result = await service.createConnection('w1', 1, dto);
      expect(mockWorkspaceConnectionRepository.save).toHaveBeenCalled();
      expect(result.connectionKey).toBe('key');
    });
  });

  describe('getConnections', () => {
    it('should throw if no access', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 2 });
      mockWorkspaceMemberRepository.findOne.mockResolvedValue(null);
      await expect(service.getConnections('w1', 1)).rejects.toThrow(ForbiddenException);
    });

    it('should return connections', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockWorkspaceConnectionRepository.find.mockResolvedValue([{ id: 'c1' }]);
      const result = await service.getConnections('w1', 1);
      expect(result.length).toBe(1);
    });
  });

  describe('getConnection', () => {
    it('should throw if not found', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockWorkspaceConnectionRepository.findOne.mockResolvedValue(null);
      await expect(service.getConnection('w1', 1, AuthorizationProvider.G_DRIVE, 'name')).rejects.toThrow(NotFoundException);
    });

    it('should return connection', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockWorkspaceConnectionRepository.findOne.mockResolvedValue({ connectionKey: 'c1' });
      const result = await service.getConnection('w1', 1, AuthorizationProvider.G_DRIVE, 'name');
      expect(result.connectionKey).toBe('c1');
    });
  });

  describe('updateConnection', () => {
    it('should update and save', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      const mockConn = { accessToken: 'old' };
      mockWorkspaceConnectionRepository.findOne.mockResolvedValue(mockConn);
      mockWorkspaceConnectionRepository.save.mockResolvedValue({ accessToken: 'new' });

      const result = await service.updateConnection('w1', 1, AuthorizationProvider.G_DRIVE, 'name', { accessToken: 'new' });
      expect(mockConn.accessToken).toBe('new');
      expect(result.accessToken).toBe('new');
    });
  });

  describe('deleteConnection', () => {
    it('should delete', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      const mockConn = { id: 'c1' };
      mockWorkspaceConnectionRepository.findOne.mockResolvedValue(mockConn);

      await service.deleteConnection('w1', 1, AuthorizationProvider.G_DRIVE, 'name');
      expect(mockWorkspaceConnectionRepository.remove).toHaveBeenCalledWith(mockConn);
    });
  });

  describe('getConnectionByKey', () => {
    it('should return connection by key', async () => {
      mockWorkspaceConnectionRepository.findOne.mockResolvedValue({ connectionKey: 'c1' });
      const result = await service.getConnectionByKey('key');
      expect(result.connectionKey).toBe('c1');
    });

    it('should throw if not found', async () => {
      mockWorkspaceConnectionRepository.findOne.mockResolvedValue(null);
      await expect(service.getConnectionByKey('key')).rejects.toThrow(NotFoundException);
    });
  });
});
