import { Test, TestingModule } from '@nestjs/testing';
import { TeamConnectionsService } from './team-connections.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkspaceConnection } from './entity/workspace-connection.entity';
import { TeamPermissionService } from './team-permission.service';
import { AuthorizationProvider } from 'src/connection/entity/connection.entity';
import { NotFoundException } from '@nestjs/common';

describe('TeamConnectionsService', () => {
  let service: TeamConnectionsService;
  let mockWorkspaceConnectionRepository: any;
  let mockTeamPermissionService: any;

  beforeEach(async () => {
    const queryBuilderMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'c1' }]),
    };

    mockWorkspaceConnectionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
      findOne: jest.fn(),
    };

    mockTeamPermissionService = {
      checkTeamMember: jest.fn(),
      getTeamWithWorkspace: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamConnectionsService,
        {
          provide: getRepositoryToken(WorkspaceConnection),
          useValue: mockWorkspaceConnectionRepository,
        },
        {
          provide: TeamPermissionService,
          useValue: mockTeamPermissionService,
        },
      ],
    }).compile();

    service = module.get<TeamConnectionsService>(TeamConnectionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConnections', () => {
    it('should return connections for a team', async () => {
      mockTeamPermissionService.getTeamWithWorkspace.mockResolvedValue({ workspaceId: 'w1' });
      const result = await service.getConnections('t1', 1);
      
      expect(mockTeamPermissionService.checkTeamMember).toHaveBeenCalledWith('t1', 1);
      expect(mockTeamPermissionService.getTeamWithWorkspace).toHaveBeenCalledWith('t1');
      expect(mockWorkspaceConnectionRepository.createQueryBuilder).toHaveBeenCalledWith('connection');
      expect(result.length).toBe(1);
    });

    it('should filter connections by provider if provided', async () => {
      mockTeamPermissionService.getTeamWithWorkspace.mockResolvedValue({ workspaceId: 'w1' });
      const queryBuilderMock = mockWorkspaceConnectionRepository.createQueryBuilder();
      
      const result = await service.getConnections('t1', 1, AuthorizationProvider.G_DRIVE);
      
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('connection.provider = :provider', {
        provider: AuthorizationProvider.G_DRIVE,
      });
      expect(result.length).toBe(1);
    });
  });

  describe('getConnection', () => {
    it('should return a specific connection', async () => {
      const mockConn = { connectionKey: 'c1', name: 'My Conn', provider: AuthorizationProvider.G_DRIVE };
      mockTeamPermissionService.getTeamWithWorkspace.mockResolvedValue({ workspaceId: 'w1' });
      mockWorkspaceConnectionRepository.findOne.mockResolvedValue(mockConn);

      const result = await service.getConnection('t1', 1, AuthorizationProvider.G_DRIVE, 'My Conn');
      
      expect(mockTeamPermissionService.checkTeamMember).toHaveBeenCalledWith('t1', 1);
      expect(mockWorkspaceConnectionRepository.findOne).toHaveBeenCalledWith({
        where: { workspaceId: 'w1', provider: AuthorizationProvider.G_DRIVE, name: 'My Conn' },
      });
      expect(result).toEqual(mockConn);
    });

    it('should throw NotFoundException if connection not found', async () => {
      mockTeamPermissionService.getTeamWithWorkspace.mockResolvedValue({ workspaceId: 'w1' });
      mockWorkspaceConnectionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getConnection('t1', 1, AuthorizationProvider.G_DRIVE, 'unknown')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
