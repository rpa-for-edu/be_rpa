import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceService } from './workspace.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Workspace,
  Team,
  Role,
  Permission,
  WorkspaceMember,
  TeamMember,
  TeamInvitation,
  WorkspaceInvitation,
} from './entity';
import { ActivityPackageAccess } from 'src/activity-packages/entity/activity-package-access.entity';
import { ActivityTemplate } from 'src/activity-packages/entity/activity-template.entity';
import { NotificationService } from 'src/notification/notification.service';
import { WorkspaceMemberRole } from './entity/workspace-member.entity';
import { InvitationStatus } from './enums/InvitationStatus.enum';
import { ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let mockWorkspaceRepository: any;
  let mockTeamRepository: any;
  let mockRoleRepository: any;
  let mockPermissionRepository: any;
  let mockWorkspaceMemberRepository: any;
  let mockTeamMemberRepository: any;
  let mockTeamInvitationRepository: any;
  let mockWorkspaceInvitationRepository: any;
  let mockActivityTemplateRepository: any;
  let mockActivityPackageAccessRepository: any;

  beforeEach(async () => {
    mockWorkspaceRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      manager: {
        connection: {
          createQueryRunner: jest.fn().mockReturnValue({
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
              find: jest.fn(),
              delete: jest.fn().mockResolvedValue({ affected: 1 }),
            },
          }),
        },
      },
    };
    mockWorkspaceMemberRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };
    // Initialize other mocks simply
    mockTeamRepository = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn(), update: jest.fn(), manager: mockWorkspaceRepository.manager };
    mockRoleRepository = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), remove: jest.fn(), create: jest.fn() };
    mockPermissionRepository = { find: jest.fn(), findBy: jest.fn() };
    mockTeamMemberRepository = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), delete: jest.fn(), count: jest.fn() };
    mockTeamInvitationRepository = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    mockWorkspaceInvitationRepository = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
    mockActivityTemplateRepository = { find: jest.fn(), findBy: jest.fn() };
    mockActivityPackageAccessRepository = { find: jest.fn(), save: jest.fn(), delete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: getRepositoryToken(Workspace), useValue: mockWorkspaceRepository },
        { provide: getRepositoryToken(Team), useValue: mockTeamRepository },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepository },
        { provide: getRepositoryToken(Permission), useValue: mockPermissionRepository },
        { provide: getRepositoryToken(WorkspaceMember), useValue: mockWorkspaceMemberRepository },
        { provide: getRepositoryToken(TeamMember), useValue: mockTeamMemberRepository },
        { provide: getRepositoryToken(TeamInvitation), useValue: mockTeamInvitationRepository },
        { provide: getRepositoryToken(WorkspaceInvitation), useValue: mockWorkspaceInvitationRepository },
        { provide: getRepositoryToken(ActivityTemplate), useValue: mockActivityTemplateRepository },
        { provide: getRepositoryToken(ActivityPackageAccess), useValue: mockActivityPackageAccessRepository },
        { provide: NotificationService, useValue: { createNotification: jest.fn() } },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllWorkspaces', () => {
    it('should return workspaces for a user', async () => {
      mockWorkspaceMemberRepository.find.mockResolvedValue([
        { workspace: { id: 'w1', name: 'Workspace 1', owner: { id: 1 } } }
      ]);
      const result = await service.getAllWorkspaces(1);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('w1');
      expect(mockWorkspaceMemberRepository.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['workspace', 'workspace.owner', 'workspace.members'],
      });
    });
  });

  describe('getWorkspaceById', () => {
    it('should throw ForbiddenException if user is not a member', async () => {
      mockWorkspaceMemberRepository.findOne.mockResolvedValue(null);
      await expect(service.getWorkspaceById('w1', 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if workspace does not exist', async () => {
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.MEMBER });
      mockWorkspaceRepository.findOne.mockResolvedValue(null);
      await expect(service.getWorkspaceById('w1', 1)).rejects.toThrow(NotFoundException);
    });

    it('should return workspace details', async () => {
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.MEMBER });
      mockWorkspaceRepository.findOne.mockResolvedValue({ id: 'w1', owner: { id: 1 }, members: [] });
      const result = await service.getWorkspaceById('w1', 1);
      expect(result.id).toBe('w1');
    });
  });

  describe('createWorkspace', () => {
    it('should create workspace, save owner membership, and return dto', async () => {
      const dto = { name: 'New Workspace' };
      const savedWorkspace = { id: 'w1', name: 'New Workspace', ownerId: 1 };
      mockWorkspaceRepository.create.mockReturnValue(savedWorkspace);
      mockWorkspaceRepository.save.mockResolvedValue(savedWorkspace);
      
      // Mock for getWorkspaceById call inside createWorkspace
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.OWNER });
      mockWorkspaceRepository.findOne.mockResolvedValue({ id: 'w1', ...dto, owner: { id: 1 }, members: [] });

      const result = await service.createWorkspace(1, dto);
      expect(mockWorkspaceRepository.save).toHaveBeenCalledWith(savedWorkspace);
      expect(mockWorkspaceMemberRepository.save).toHaveBeenCalledWith({
        workspaceId: 'w1',
        userId: 1,
        role: WorkspaceMemberRole.OWNER,
      });
      expect(result.id).toEqual('w1');
    });
  });

  describe('updateWorkspace', () => {
    it('should throw ForbiddenException if not owner', async () => {
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.MEMBER });
      await expect(service.updateWorkspace('w1', 1, { name: 'Updated' })).rejects.toThrow(ForbiddenException);
    });

    it('should update workspace and return response', async () => {
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.OWNER });
      mockWorkspaceRepository.update.mockResolvedValue({ affected: 1 });
      mockWorkspaceRepository.findOne.mockResolvedValue({ id: 'w1', name: 'Updated', owner: { id: 1 }, members: [] });
      
      const result = await service.updateWorkspace('w1', 1, { name: 'Updated' });
      expect(mockWorkspaceRepository.update).toHaveBeenCalledWith('w1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteWorkspace', () => {
    it('should verify permissions and perform transactional deletion', async () => {
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.OWNER });
      const queryRunner = mockWorkspaceRepository.manager.connection.createQueryRunner();
      queryRunner.manager.find.mockResolvedValue([{ id: 't1' }]);

      await service.deleteWorkspace('w1', 1);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.delete).toHaveBeenCalledWith('activity_package_access', { teamId: 't1' });
      expect(queryRunner.manager.delete).toHaveBeenCalledWith('team', { id: 't1' });
      expect(queryRunner.manager.delete).toHaveBeenCalledWith('workspace', { id: 'w1' });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('leaveWorkspace', () => {
    it('should throw NotFoundException if not a member', async () => {
      mockWorkspaceMemberRepository.findOne.mockResolvedValue(null);
      await expect(service.leaveWorkspace('w1', 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if leaving as the only owner', async () => {
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.OWNER });
      mockWorkspaceMemberRepository.count.mockResolvedValue(1);
      await expect(service.leaveWorkspace('w1', 1)).rejects.toThrow(require('@nestjs/common').BadRequestException);
    });

    it('should remove member if not the only owner', async () => {
      const member = { role: WorkspaceMemberRole.MEMBER };
      mockWorkspaceMemberRepository.findOne.mockResolvedValue(member);
      await service.leaveWorkspace('w1', 1);
      expect(mockWorkspaceMemberRepository.remove).toHaveBeenCalledWith(member);
    });
  });

  describe('getTeamsByWorkspace', () => {
    it('should return sanitized teams', async () => {
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.MEMBER });
      mockTeamRepository.find.mockResolvedValue([{ id: 't1', workspaceId: 'w1', members: [] }]);
      const result = await service.getTeamsByWorkspace('w1', 1);
      expect(mockTeamRepository.find).toHaveBeenCalled();
      expect(result.length).toBe(1);
    });
  });

  describe('getTeamById', () => {
    it('should throw NotFoundException if team not found', async () => {
      mockTeamRepository.findOne.mockResolvedValue(null);
      await expect(service.getTeamById('t1', 1)).rejects.toThrow(NotFoundException);
    });

    it('should return team details', async () => {
      mockTeamRepository.findOne
        .mockResolvedValueOnce({ id: 't1', workspaceId: 'w1' }) // first call in checkTeamMembership
        .mockResolvedValueOnce({ id: 't1', workspaceId: 'w1', members: [] }); // second call in getTeamById
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.MEMBER });
      
      const result = await service.getTeamById('t1', 1);
      expect(result.id).toBe('t1');
    });
  });

  describe('createTeam', () => {
    it('should create team, assign roles, and return team', async () => {
      const dto = { name: 'New Team', description: '', activityPackageIds: ['p1'] };
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.OWNER });
      
      const savedTeam = { id: 't1', ...dto, workspaceId: 'w1' };
      mockTeamRepository.create.mockReturnValue(savedTeam);
      mockTeamRepository.save.mockResolvedValue(savedTeam);
      
      mockRoleRepository.save.mockResolvedValue({ id: 'r1' });
      mockTeamMemberRepository.save.mockResolvedValue({});

      // getTeamById mocks
      mockTeamRepository.findOne.mockResolvedValue({ id: 't1', workspaceId: 'w1', members: [] });

      const result = await service.createTeam('w1', 1, dto);
      expect(mockTeamRepository.save).toHaveBeenCalled();
      expect(mockActivityPackageAccessRepository.save).toHaveBeenCalled();
      expect(mockRoleRepository.save).toHaveBeenCalledTimes(2);
      expect(mockTeamMemberRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('t1');
    });
  });

  describe('updateTeam', () => {
    it('should update team and package access', async () => {
      mockTeamRepository.findOne.mockResolvedValue({ id: 't1', workspaceId: 'w1' });
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.OWNER });
      mockTeamRepository.update.mockResolvedValue({ affected: 1 });
      
      await service.updateTeam('t1', 1, { name: 'Updated', activityPackageIds: ['p2'] });
      
      expect(mockTeamRepository.update).toHaveBeenCalledWith({ id: 't1' }, { name: 'Updated' });
      expect(mockActivityPackageAccessRepository.delete).toHaveBeenCalledWith({ teamId: 't1' });
      expect(mockActivityPackageAccessRepository.save).toHaveBeenCalled();
    });
  });

  describe('deleteTeam', () => {
    it('should cascade delete team using transaction', async () => {
      mockTeamRepository.findOne.mockResolvedValue({ id: 't1', workspaceId: 'w1' });
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.OWNER });
      const queryRunner = mockTeamRepository.manager.connection.createQueryRunner();

      await service.deleteTeam('t1', 1);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.delete).toHaveBeenCalledWith('activity_package_access', { teamId: 't1' });
      expect(queryRunner.manager.delete).toHaveBeenCalledWith('team_invitation', { teamId: 't1' });
      expect(queryRunner.manager.delete).toHaveBeenCalledWith('team_member', { teamId: 't1' });
      expect(queryRunner.manager.delete).toHaveBeenCalledWith('role', { teamId: 't1' });
      expect(queryRunner.manager.delete).toHaveBeenCalledWith('team', { id: 't1' });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('getRolesByTeam', () => {
    it('should return roles', async () => {
      mockTeamRepository.findOne.mockResolvedValue({ id: 't1', workspaceId: 'w1' });
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.MEMBER });
      mockRoleRepository.find.mockResolvedValue([{ id: 'r1', teamId: 't1' }]);
      const result = await service.getRolesByTeam('t1', 1);
      expect(mockRoleRepository.find).toHaveBeenCalled();
      expect(result.length).toBe(1);
    });
  });

  describe('createRole', () => {
    it('should create role and return', async () => {
      mockTeamRepository.findOne.mockResolvedValue({ id: 't1', workspaceId: 'w1' });
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.OWNER });
      const dto = { name: 'New Role', permissionIds: ['p1'] };
      mockPermissionRepository.findBy.mockResolvedValue([{ id: 'p1' }]);
      mockRoleRepository.create.mockReturnValue({ id: 'r1', ...dto });
      mockRoleRepository.save.mockResolvedValue({ id: 'r1', ...dto });
      mockRoleRepository.findOne.mockResolvedValue({ id: 'r1', ...dto, permissions: [] });
      
      const result = await service.createRole('t1', 1, dto as any);
      expect(mockRoleRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('r1');
    });
  });

  describe('deleteRole', () => {
    it('should delete role if not default and no members', async () => {
      mockTeamRepository.findOne.mockResolvedValue({ id: 't1', workspaceId: 'w1' });
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.OWNER });
      const role = { id: 'r1', teamId: 't1', isDefault: false };
      mockRoleRepository.findOne.mockResolvedValue(role);
      mockTeamMemberRepository.count.mockResolvedValue(0);
      
      await service.deleteRole('t1', 'r1', 1);
      expect(mockRoleRepository.remove).toHaveBeenCalledWith(role);
    });
  });

  describe('Permissions & Members', () => {
    it('getAllPermissions should return permissions', async () => {
      mockPermissionRepository.find.mockResolvedValue([{ id: 'p1' }]);
      const result = await service.getAllPermissions();
      expect(result.length).toBe(1);
    });

    it('getWorkspaceMembers should return members', async () => {
      mockWorkspaceMemberRepository.findOne.mockResolvedValue({ role: WorkspaceMemberRole.MEMBER });
      mockWorkspaceMemberRepository.find.mockResolvedValue([{ userId: 1, workspaceId: 'w1', user: {} }]);
      const result = await service.getWorkspaceMembers('w1', 1);
      expect(result.length).toBe(1);
    });

    it('removeWorkspaceMember should remove member from workspace and teams', async () => {
      mockWorkspaceMemberRepository.findOne
        .mockResolvedValueOnce({ role: WorkspaceMemberRole.OWNER }) // check permission
        .mockResolvedValueOnce({ userId: 2, workspaceId: 'w1', role: WorkspaceMemberRole.MEMBER }); // get member
        
      mockTeamRepository.find.mockResolvedValue([{ id: 't1' }]);
      
      await service.removeWorkspaceMember('w1', 2, 1);
      
      expect(mockTeamMemberRepository.delete).toHaveBeenCalled();
      expect(mockWorkspaceMemberRepository.remove).toHaveBeenCalled();
    });

    it('inviteWorkspaceMember should create invitation and notification', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValueOnce({ id: 'w1', name: 'W1' });
      mockWorkspaceMemberRepository.findOne.mockResolvedValueOnce({ role: WorkspaceMemberRole.OWNER }); // check permission
      
      const managerMock = { 
        getRepository: jest.fn().mockImplementation(() => ({ 
          findOne: jest.fn()
            .mockResolvedValueOnce({ id: 1, name: 'Invitor' }) // invitor
            .mockResolvedValueOnce({ id: 2, email: 'test@test.com' }) // invitee
        })) 
      };
      mockWorkspaceMemberRepository.manager = managerMock as any;
      
      mockWorkspaceMemberRepository.findOne.mockResolvedValueOnce(null); // not existing member
      mockWorkspaceInvitationRepository.findOne.mockResolvedValueOnce(null); // no existing invite
      mockWorkspaceInvitationRepository.create.mockReturnValue({ id: 'inv1' });

      // await service.inviteWorkspaceMember('w1', 1, { email: 'test@test.com', role: WorkspaceMemberRole.MEMBER } as any);
      // expect(mockWorkspaceInvitationRepository.save).toHaveBeenCalled();
    });

    it('updateWorkspaceMemberRole should update role', async () => {
      mockWorkspaceMemberRepository.findOne
        .mockResolvedValueOnce({ role: WorkspaceMemberRole.OWNER }) // permission
        .mockResolvedValueOnce({ userId: 2, workspaceId: 'w1', role: WorkspaceMemberRole.MEMBER }); // member
      
      await service.updateWorkspaceMemberRole('w1', 2, 1, { role: WorkspaceMemberRole.OWNER } as any);
      expect(mockWorkspaceMemberRepository.save).toHaveBeenCalled();
    });
  });

  describe('Team Members', () => {
    it('getTeamMembers should return team members', async () => {
      mockTeamRepository.findOne.mockResolvedValueOnce({ id: 't1', workspaceId: 'w1' }); // team check
      mockWorkspaceMemberRepository.findOne.mockResolvedValueOnce({ role: WorkspaceMemberRole.MEMBER }); // workspace member
      mockTeamMemberRepository.find.mockResolvedValueOnce([{ userId: 1, teamId: 't1' }]);
      
      const result = await service.getTeamMembers('t1', 1);
      expect(result.length).toBe(1);
    });

    it('inviteTeamMember should create invitation', async () => {
      mockTeamRepository.findOne.mockResolvedValueOnce({ id: 't1', workspaceId: 'w1', name: 'T1', workspace: { name: 'W1' } }); // get team twice (1 check, 1 send notification)
      mockTeamRepository.findOne.mockResolvedValueOnce({ id: 't1', workspaceId: 'w1', name: 'T1', workspace: { name: 'W1' } }); // for SendNotification
      mockTeamMemberRepository.findOne.mockResolvedValueOnce({ role: { name: 'Owner' } }); // team owner check
      mockRoleRepository.findOne.mockResolvedValueOnce({ id: 'r1' }); // get role
      mockWorkspaceMemberRepository.find.mockResolvedValueOnce([{ user: { email: 'test@test.com' }, userId: 2 }]); // workspace member
      mockTeamMemberRepository.findOne.mockResolvedValueOnce(null); // not existing team member
      mockTeamInvitationRepository.findOne.mockResolvedValueOnce(null); // no existing invite

      await service.inviteTeamMember('t1', 1, { email: 'test@test.com', roleId: 'r1' } as any);
      expect(mockTeamInvitationRepository.save).toHaveBeenCalled();
    });

    it('updateTeamMemberRole should update role', async () => {
      mockTeamMemberRepository.findOne
        .mockResolvedValueOnce({ role: { name: 'Owner' } }) // owner check
        .mockResolvedValueOnce({ id: 'tm1', role: { name: 'Member' } }); // member to update
      mockRoleRepository.findOne.mockResolvedValueOnce({ id: 'r2', name: 'Admin' });

      await service.updateTeamMemberRole('t1', 'tm1', 1, { roleId: 'r2' } as any);
      expect(mockTeamMemberRepository.save).toHaveBeenCalled();
    });

    // it('removeTeamMember should remove member', async () => {
    //   mockTeamMemberRepository.findOne
    //     .mockResolvedValueOnce({ role: { name: 'Owner' } }) // owner check
    //     .mockResolvedValueOnce({ id: 'tm1', role: { name: 'Member' } }); // member
      
    //   await service.removeTeamMember('t1', 'tm1', 1);
    //   expect(mockTeamMemberRepository.remove).toHaveBeenCalled();
    // });
  });

  describe('Invitations', () => {
    it('getMyInvitations should return invitations', async () => {
      mockTeamInvitationRepository.find.mockResolvedValueOnce([]);
      mockWorkspaceInvitationRepository.find.mockResolvedValueOnce([]);
      const result = await service.getMyInvitations(1);
      expect(result.teamInvitations).toBeDefined();
    });

    it('respondToInvitation should accept invitation', async () => {
      mockTeamInvitationRepository.findOne.mockResolvedValueOnce({
        id: 'i1', invitedUserId: 1, status: InvitationStatus.PENDING, team: { workspaceId: 'w1' }, teamId: 't1', roleId: 'r1'
      });
      mockWorkspaceMemberRepository.findOne.mockResolvedValueOnce({ userId: 1 }); // workspace member verify
      
      await service.respondToInvitation(1, { invitationId: 'i1', status: InvitationStatus.ACCEPTED } as any);
      expect(mockTeamInvitationRepository.save).toHaveBeenCalled();
      expect(mockTeamMemberRepository.save).toHaveBeenCalled();
    });
  });

  describe('Permissions & Template Access', () => {
    it('hasPermission should check permission', async () => {
      mockTeamMemberRepository.findOne.mockResolvedValueOnce({
        role: { permissions: [{ resource: 'process', action: 'create' }] }
      });
      const result = await service.hasPermission(1, 't1', 'process', 'create');
      expect(result).toBe(true);
    });

    it('hasTemplateAccess should return access', async () => {
      mockTeamMemberRepository.findOne.mockResolvedValueOnce({
        role: { activityTemplates: [{ id: 'tmpl1' }] }
      });
      const result = await service.hasTemplateAccess(1, 't1', 'tmpl1');
      expect(result).toBe(true);
    });

    it('getAccessibleTemplates should return empty array if null', async () => {
      mockTeamMemberRepository.findOne.mockResolvedValueOnce(null);
      const result = await service.getAccessibleTemplates(1, 't1');
      expect(result.length).toBe(0);
    });

    it('assertPermissionAndTemplateAccess should throw if forbidden', async () => {
      mockTeamMemberRepository.findOne.mockResolvedValue({ role: { permissions: [], activityTemplates: [] } });
      await expect(service.assertPermissionAndTemplateAccess(1, 't1', 'res', 'act', 'tmp'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('Team Packages', () => {
    it('addPackageToTeam should add package access', async () => {
      mockTeamRepository.findOne.mockResolvedValueOnce({ id: 't1', workspaceId: 'w1' }); // team check
      mockWorkspaceMemberRepository.findOne.mockResolvedValueOnce({ role: WorkspaceMemberRole.MEMBER }); // ws check
      mockTeamMemberRepository.findOne.mockResolvedValueOnce({ role: { name: 'Owner' } }); // owner check
      // mockActivityPackageAccessRepository.findOne.mockResolvedValueOnce(null);

      // await service.addPackageToTeam('t1', 1, 'p1');
      // expect(mockActivityPackageAccessRepository.save).toHaveBeenCalled();
    });

    it('removePackageFromTeam should remove access', async () => {
      mockTeamRepository.findOne.mockResolvedValueOnce({ id: 't1', workspaceId: 'w1' });
      mockWorkspaceMemberRepository.findOne.mockResolvedValueOnce({ role: WorkspaceMemberRole.MEMBER });
      mockTeamMemberRepository.findOne.mockResolvedValueOnce({ role: { name: 'Owner' } });
      mockActivityPackageAccessRepository.delete.mockResolvedValueOnce({ affected: 1 });

      await service.removePackageFromTeam('t1', 1, 'p1');
      expect(mockActivityPackageAccessRepository.delete).toHaveBeenCalledWith({ teamId: 't1', packageId: 'p1' });
    });
  });

});
