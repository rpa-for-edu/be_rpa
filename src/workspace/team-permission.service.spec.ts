import { Test, TestingModule } from '@nestjs/testing';
import { TeamPermissionService } from './team-permission.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { TeamMember } from './entity/team-member.entity';
import { Team } from './entity/team.entity';
import { Process } from 'src/processes/entity/process.entity';
import { ActivityPackageAccess } from 'src/activity-packages/entity/activity-package-access.entity';
import { ProcessDetail } from 'src/processes/schema/process.schema';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TeamPermissionService', () => {
  let service: TeamPermissionService;
  let mockTeamMemberRepository: any;
  let mockTeamRepository: any;
  let mockProcessRepository: any;
  let mockPackageAccessRepository: any;
  let mockProcessDetailModel: any;

  beforeEach(async () => {
    mockTeamMemberRepository = { findOne: jest.fn() };
    mockTeamRepository = { findOne: jest.fn() };
    mockProcessRepository = { findOne: jest.fn() };
    mockPackageAccessRepository = { findOne: jest.fn() };
    mockProcessDetailModel = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamPermissionService,
        { provide: getRepositoryToken(TeamMember), useValue: mockTeamMemberRepository },
        { provide: getRepositoryToken(Team), useValue: mockTeamRepository },
        { provide: getRepositoryToken(Process), useValue: mockProcessRepository },
        { provide: getRepositoryToken(ActivityPackageAccess), useValue: mockPackageAccessRepository },
        { provide: getModelToken(ProcessDetail.name), useValue: mockProcessDetailModel },
      ],
    }).compile();

    service = module.get<TeamPermissionService>(TeamPermissionService);
  });

  describe('checkTeamMember', () => {
    it('should throw if not a member', async () => {
      mockTeamMemberRepository.findOne.mockResolvedValue(null);
      await expect(service.checkTeamMember('t1', 1)).rejects.toThrow(ForbiddenException);
    });

    it('should return member', async () => {
      const mockMember = { id: 'm1' };
      mockTeamMemberRepository.findOne.mockResolvedValue(mockMember);
      const result = await service.checkTeamMember('t1', 1);
      expect(result).toEqual(mockMember);
    });
  });

  describe('checkPermission', () => {
    it('should return true if Owner', () => {
      const member = { role: { name: 'Owner' } } as TeamMember;
      expect(service.checkPermission(member, 'any')).toBe(true);
    });

    it('should return false if no role/permissions', () => {
      const member = { role: null } as TeamMember;
      expect(service.checkPermission(member, 'any')).toBe(false);
    });

    it('should return true if permission exists', () => {
      const member = { role: { permissions: [{ name: 'read' }] } } as any;
      expect(service.checkPermission(member, 'read')).toBe(true);
      expect(service.checkPermission(member, 'write')).toBe(false);
    });
  });

  describe('requirePermission', () => {
    it('should throw if no permission', () => {
      const member = { role: { permissions: [] } } as any;
      expect(() => service.requirePermission(member, 'read')).toThrow(ForbiddenException);
    });
  });

  describe('checkPackageAccess & requirePackageAccess', () => {
    it('checkPackageAccess should return true if found', async () => {
      mockPackageAccessRepository.findOne.mockResolvedValue({ id: 'a1' });
      expect(await service.checkPackageAccess('t1', 'p1')).toBe(true);
    });

    it('requirePackageAccess should throw if not found', async () => {
      mockPackageAccessRepository.findOne.mockResolvedValue(null);
      await expect(service.requirePackageAccess('t1', 'p1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkTemplateAccess & requireTemplateAccess', () => {
    it('checkTemplateAccess should return true if Owner', () => {
      const member = { role: { name: 'Owner' } } as TeamMember;
      expect(service.checkTemplateAccess(member, 't1')).toBe(true);
    });

    it('checkTemplateAccess should check array', () => {
      const member = { role: { activityTemplates: [{ id: 't1' }] } } as any;
      expect(service.checkTemplateAccess(member, 't1')).toBe(true);
      expect(service.checkTemplateAccess(member, 't2')).toBe(false);
    });

    it('requireTemplateAccess should throw if false', () => {
      const member = { role: null } as any;
      expect(() => service.requireTemplateAccess(member, 't1')).toThrow(ForbiddenException);
    });
  });

  describe('getTeamWithWorkspace', () => {
    it('should return team', async () => {
      mockTeamRepository.findOne.mockResolvedValue({ id: 't1' });
      expect(await service.getTeamWithWorkspace('t1')).toEqual({ id: 't1' });
    });

    it('should throw if not found', async () => {
      mockTeamRepository.findOne.mockResolvedValue(null);
      await expect(service.getTeamWithWorkspace('t1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateProcessTemplates', () => {
    it('should allow Owner', async () => {
      const member = { role: { name: 'Owner' } } as TeamMember;
      const errors = await service.validateProcessTemplates('t1', member, ['t1']);
      expect(errors).toEqual([]);
    });

    it('should return errors for missing templates', async () => {
      const member = { role: { activityTemplates: [] } } as any;
      const errors = await service.validateProcessTemplates('t1', member, ['t1']);
      expect(errors.length).toBe(1);
    });
  });

  describe('validateRobotProcess', () => {
    it('should throw if process not found', async () => {
      mockProcessRepository.findOne.mockResolvedValue(null);
      await expect(service.validateRobotProcess('t1', 'p1', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should return empty if no details', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ version: 1 });
      mockProcessDetailModel.findOne.mockResolvedValue(null);
      const errors = await service.validateRobotProcess('t1', 'p1', {} as any);
      expect(errors).toEqual([]);
    });
  });
});
