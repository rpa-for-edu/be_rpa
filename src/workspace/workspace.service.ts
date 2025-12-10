import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { plainToInstance } from 'class-transformer';
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
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  CreateTeamDto,
  UpdateTeamDto,
  CreateRoleDto,
  UpdateRoleDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  RespondInvitationDto,
  UpdateWorkspaceMemberRoleDto,
  InviteWorkspaceMemberDto,
  CreatePermissionDto,
  UpdatePermissionDto,
} from './dto/workspace.dto';
import { WorkspaceMemberRole } from './entity/workspace-member.entity';
import { InvitationStatus } from './enums/InvitationStatus.enum';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/entity/notification.entity';
import { ActivityTemplate } from 'src/activity-packages/entity/activity-template.entity';
import {
  WorkspaceResponseDto,
  SimpleWorkspaceResponseDto,
  TeamResponseDto,
  RoleResponseDto,
  PermissionResponseDto,
  WorkspaceMemberResponseDto,
  TeamMemberResponseDto,
  TeamInvitationResponseDto,
  WorkspaceInvitationResponseDto,
} from './dto/response/response.dto';
import { User } from 'src/users/entity/user.entity';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(TeamInvitation)
    private teamInvitationRepository: Repository<TeamInvitation>,
    @InjectRepository(WorkspaceInvitation)
    private workspaceInvitationRepository: Repository<WorkspaceInvitation>,
    @InjectRepository(ActivityTemplate)
    private activityTemplateRepository: Repository<ActivityTemplate>,
    @InjectRepository(ActivityPackageAccess)
    private activityPackageAccessRepository: Repository<ActivityPackageAccess>,
    private notificationService: NotificationService,
  ) {}

  // ==================== Helper Methods ====================
  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: any) {
    if (!user) return user;
    const { hashedPassword, providerId, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Sanitize user data in WorkspaceMember
   */
  private sanitizeWorkspaceMember(member: WorkspaceMember) {
    if (member?.user) {
      member.user = this.sanitizeUser(member.user);
    }
    return member;
  }

  /**
   * Sanitize user data in TeamMember
   */
  private sanitizeTeamMember(member: TeamMember) {
    if (member?.user) {
      member.user = this.sanitizeUser(member.user);
    }
    return member;
  }

  /**
   * Sanitize user data in array of WorkspaceMembers
   */
  private sanitizeWorkspaceMembers(members: WorkspaceMember[]) {
    return members.map((m) => this.sanitizeWorkspaceMember(m));
  }

  /**
   * Sanitize user data in array of TeamMembers
   */
  private sanitizeTeamMembers(members: TeamMember[]) {
    return members.map((m) => this.sanitizeTeamMember(m));
  }

  /**
   * Sanitize user data in Team object
   */
  private sanitizeTeam(team: Team) {
    if (team?.members) {
      team.members = this.sanitizeTeamMembers(team.members);
    }
    return team;
  }

  /**
   * Sanitize user data in Workspace object
   */
  private sanitizeWorkspace(workspace: Workspace) {
    if (workspace?.owner) {
      workspace.owner = this.sanitizeUser(workspace.owner);
    }
    if (workspace?.members) {
      workspace.members = this.sanitizeWorkspaceMembers(workspace.members);
    }
    if (workspace?.teams) {
      workspace.teams = workspace.teams.map((t) => this.sanitizeTeam(t));
    }
    return workspace;
  }

  /**
   * Sanitize user data in TeamInvitation object
   */
  private sanitizeTeamInvitation(invitation: TeamInvitation) {
    if (invitation?.invitedBy) {
      invitation.invitedBy = this.sanitizeUser(invitation.invitedBy);
    }
    if (invitation?.team) {
      invitation.team = this.sanitizeTeam(invitation.team);
    }
    return invitation;
  }

  private sanitizeInvitation(invitation: TeamInvitation | WorkspaceInvitation) {
    if ('team' in invitation && invitation?.team) {
      invitation.team = this.sanitizeTeam(invitation.team);
    }
    if ('workspace' in invitation && invitation?.workspace) {
      invitation.workspace = this.sanitizeWorkspace(invitation.workspace);
    }
    if (invitation?.invitedBy) {
      invitation.invitedBy = this.sanitizeUser(invitation.invitedBy);
    }
    return invitation;
  }

  private async checkWorkspaceMembership(
    workspaceId: string,
    userId: number,
  ): Promise<WorkspaceMember> {
    const member = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
      relations: ['user'],
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return member;
  }

  private async checkWorkspacePermission(
    workspaceId: string,
    userId: number,
    allowedRoles: WorkspaceMemberRole[],
  ): Promise<WorkspaceMember> {
    const member = await this.checkWorkspaceMembership(workspaceId, userId);

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return member;
  }

  private async checkTeamMembership(teamId: string, userId: number): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    await this.checkWorkspaceMembership(team.workspaceId, userId);
    return team;
  }

  // ==================== Workspace Methods ====================
  async getAllWorkspaces(userId: number): Promise<SimpleWorkspaceResponseDto[]> {
    const members = await this.workspaceMemberRepository.find({
      where: { userId },
      relations: ['workspace', 'workspace.owner', 'workspace.members'],
    });

    const workspaces = members.map((member) => this.sanitizeWorkspace(member.workspace));
    return plainToInstance(SimpleWorkspaceResponseDto, workspaces, {
      excludeExtraneousValues: false,
    });
  }

  async getWorkspaceById(workspaceId: string, userId: number): Promise<WorkspaceResponseDto> {
    await this.checkWorkspaceMembership(workspaceId, userId);

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      relations: ['owner', 'teams', 'members', 'members.user'],
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const sanitized = this.sanitizeWorkspace(workspace);
    return plainToInstance(WorkspaceResponseDto, sanitized, { excludeExtraneousValues: false });
  }

  async createWorkspace(userId: number, dto: CreateWorkspaceDto): Promise<WorkspaceResponseDto> {
    const workspace = this.workspaceRepository.create({
      ...dto,
      ownerId: userId,
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);

    // Add creator as owner
    await this.workspaceMemberRepository.save({
      workspaceId: savedWorkspace.id,
      userId,
      role: WorkspaceMemberRole.OWNER,
    });

    return this.getWorkspaceById(savedWorkspace.id, userId);
  }

  async updateWorkspace(
    workspaceId: string,
    userId: number,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    await this.checkWorkspacePermission(workspaceId, userId, [WorkspaceMemberRole.OWNER]);

    await this.workspaceRepository.update(workspaceId, dto);
    return this.getWorkspaceById(workspaceId, userId);
  }

  async deleteWorkspace(workspaceId: string, userId: number): Promise<void> {
    await this.checkWorkspacePermission(workspaceId, userId, [WorkspaceMemberRole.OWNER]);

    // Use query runner for transactional deletion
    const queryRunner = this.workspaceRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get all teams in workspace
      const teams = await queryRunner.manager.find('team', { where: { workspaceId } });

      // For each team, delete all related records
      for (const team of teams) {
        const teamId = (team as any).id;

        // Delete team-related records in correct order
        await queryRunner.manager.delete('activity_package_access', { teamId });
        await queryRunner.manager.delete('team_invitation', { teamId });
        await queryRunner.manager.delete('team_member', { teamId });
        await queryRunner.manager.delete('role', { teamId });
        await queryRunner.manager.delete('team', { id: teamId });
      }

      // Delete workspace-related records
      await queryRunner.manager.delete('workspace_invitation', { workspaceId });
      await queryRunner.manager.delete('workspace_member', { workspaceId });

      // Finally delete workspace
      const result = await queryRunner.manager.delete('workspace', { id: workspaceId });

      if (result.affected === 0) {
        throw new NotFoundException('Workspace not found');
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async leaveWorkspace(workspaceId: string, userId: number): Promise<void> {
    const member = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this workspace');
    }

    if (member.role === WorkspaceMemberRole.OWNER) {
      const ownerCount = await this.workspaceMemberRepository.count({
        where: { workspaceId, role: WorkspaceMemberRole.OWNER },
      });

      if (ownerCount === 1) {
        throw new BadRequestException(
          'Cannot leave workspace as the only owner. Transfer ownership or delete the workspace.',
        );
      }
    }

    await this.workspaceMemberRepository.remove(member);
  }

  // ==================== Team Methods ====================
  async getTeamsByWorkspace(workspaceId: string, userId: number): Promise<TeamResponseDto[]> {
    await this.checkWorkspaceMembership(workspaceId, userId);

    const teams = await this.teamRepository.find({
      where: { workspaceId },
      relations: ['roles', 'members', 'members.user', 'members.role'],
    });

    const sanitized = teams.map((t) => this.sanitizeTeam(t));
    return plainToInstance(TeamResponseDto, sanitized, { excludeExtraneousValues: false });
  }

  async getTeamById(teamId: string, userId: number): Promise<TeamResponseDto> {
    const team = await this.checkTeamMembership(teamId, userId);

    const fullTeam = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: [
        'workspace',
        'roles',
        'roles.permissions',
        'members',
        'members.user',
        'members.role',
      ],
    });

    if (!fullTeam) {
      throw new NotFoundException('Team not found');
    }

    const sanitized = this.sanitizeTeam(fullTeam);
    return plainToInstance(TeamResponseDto, sanitized, { excludeExtraneousValues: false });
  }

  async createTeam(
    workspaceId: string,
    userId: number,
    dto: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    await this.checkWorkspacePermission(workspaceId, userId, [WorkspaceMemberRole.OWNER]);

    const { activityPackageIds, ...teamData } = dto;

    const team = this.teamRepository.create({
      ...teamData,
      workspaceId,
    });

    const savedTeam = await this.teamRepository.save(team);

    // Grant access to activity packages
    if (activityPackageIds && activityPackageIds.length > 0) {
      const packageAccess = activityPackageIds.map((packageId) => ({
        packageId,
        teamId: savedTeam.id,
        hasAccess: true,
      }));
      await this.activityPackageAccessRepository.save(packageAccess);
    }

    // Create Owner role (for team creator)
    const ownerRole = await this.roleRepository.save({
      name: 'Owner',
      description: 'Team owner with full permissions',
      teamId: savedTeam.id,
      isDefault: true,
      permissions: [],
    });

    // Create default Member role (for invited members)
    await this.roleRepository.save({
      name: 'Member',
      description: 'Default team member role',
      teamId: savedTeam.id,
      isDefault: true,
      permissions: [],
    });

    // Add creator as team owner
    await this.teamMemberRepository.save({
      teamId: savedTeam.id,
      userId,
      roleId: ownerRole.id,
    });

    return this.getTeamById(savedTeam.id, userId);
  }

  async updateTeam(teamId: string, userId: number, dto: UpdateTeamDto): Promise<TeamResponseDto> {
    const team = await this.checkTeamMembership(teamId, userId);
    await this.checkWorkspacePermission(team.workspaceId, userId, [WorkspaceMemberRole.OWNER]);

    const { activityPackageIds, ...teamData } = dto;

    // Update team basic info
    if (Object.keys(teamData).length > 0) {
      await this.teamRepository.update({ id: teamId }, teamData);
    }

    // Update activity package access if provided
    if (activityPackageIds !== undefined) {
      // Remove all existing access
      await this.activityPackageAccessRepository.delete({ teamId });

      // Add new access
      if (activityPackageIds.length > 0) {
        const packageAccess = activityPackageIds.map((packageId) => ({
          packageId,
          teamId,
          hasAccess: true,
        }));
        await this.activityPackageAccessRepository.save(packageAccess);
      }
    }

    return this.getTeamById(teamId, userId);
  }

  async deleteTeam(teamId: string, userId: number): Promise<void> {
    const team = await this.checkTeamMembership(teamId, userId);
    await this.checkWorkspacePermission(team.workspaceId, userId, [WorkspaceMemberRole.OWNER]);

    // Use query runner for transactional deletion to ensure proper order
    const queryRunner = this.teamRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Cascade delete: Delete all related records in correct order
      // Must delete child records before parent records to avoid FK constraint errors

      // 1. Delete activity package access (no FK dependencies)
      await queryRunner.manager.delete('activity_package_access', { teamId });

      // 2. Delete team invitations FIRST (has FK to role, so delete before roles)
      await queryRunner.manager.delete('team_invitation', { teamId });

      // 3. Delete team members (has FK to role, so delete before roles)
      await queryRunner.manager.delete('team_member', { teamId });

      // 4. Delete roles (this will also remove role_permission and role_activity_template via join tables)
      await queryRunner.manager.delete('role', { teamId });

      // 5. Finally delete the team
      const result = await queryRunner.manager.delete('team', { id: teamId });

      if (result.affected === 0) {
        throw new NotFoundException('Team not found');
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== Role Methods ====================
  async getRolesByTeam(teamId: string, userId: number): Promise<RoleResponseDto[]> {
    await this.checkTeamMembership(teamId, userId);

    const roles = await this.roleRepository.find({
      where: { teamId },
      relations: ['permissions', 'activityTemplates'],
    });

    return plainToInstance(RoleResponseDto, roles, { excludeExtraneousValues: false });
  }

  async createRole(teamId: string, userId: number, dto: CreateRoleDto): Promise<RoleResponseDto> {
    const team = await this.checkTeamMembership(teamId, userId);
    await this.checkWorkspacePermission(team.workspaceId, userId, [WorkspaceMemberRole.OWNER]);

    const permissions = await this.permissionRepository.findBy({
      id: In(dto.permissionIds),
    });

    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('Some permissions not found');
    }

    // Handle activity templates
    let activityTemplates = [];
    if (dto.templateIds && dto.templateIds.length > 0) {
      activityTemplates = await this.activityTemplateRepository.findBy({
        id: In(dto.templateIds),
      });

      if (activityTemplates.length !== dto.templateIds.length) {
        throw new BadRequestException('Some activity templates not found');
      }
    }

    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description,
      teamId,
      permissions,
      activityTemplates,
    });

    const saved = await this.roleRepository.save(role);
    const result = await this.roleRepository.findOne({
      where: { id: saved.id },
      relations: ['permissions', 'activityTemplates'],
    });

    return plainToInstance(RoleResponseDto, result, { excludeExtraneousValues: false });
  }

  async updateRole(
    teamId: string,
    roleId: string,
    userId: number,
    dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const team = await this.checkTeamMembership(teamId, userId);
    await this.checkWorkspacePermission(team.workspaceId, userId, [WorkspaceMemberRole.OWNER]);

    const role = await this.roleRepository.findOne({
      where: { id: roleId, teamId },
      relations: ['permissions', 'activityTemplates'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (dto.name) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;

    if (dto.permissionIds) {
      const permissions = await this.permissionRepository.findBy({
        id: In(dto.permissionIds),
      });

      if (permissions.length !== dto.permissionIds.length) {
        throw new BadRequestException('Some permissions not found');
      }

      role.permissions = permissions;
    }

    if (dto.templateIds) {
      const activityTemplates = await this.activityTemplateRepository.findBy({
        id: In(dto.templateIds),
      });

      if (activityTemplates.length !== dto.templateIds.length) {
        throw new BadRequestException('Some activity templates not found');
      }

      role.activityTemplates = activityTemplates;
    }

    const saved = await this.roleRepository.save(role);
    return plainToInstance(RoleResponseDto, saved, { excludeExtraneousValues: false });
  }

  async deleteRole(teamId: string, roleId: string, userId: number): Promise<void> {
    const team = await this.checkTeamMembership(teamId, userId);
    await this.checkWorkspacePermission(team.workspaceId, userId, [WorkspaceMemberRole.OWNER]);

    const role = await this.roleRepository.findOne({
      where: { id: roleId, teamId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isDefault) {
      throw new BadRequestException('Cannot delete default role');
    }

    const membersCount = await this.teamMemberRepository.count({
      where: { roleId },
    });

    if (membersCount > 0) {
      throw new BadRequestException('Cannot delete role with assigned members');
    }

    await this.roleRepository.remove(role);
  }

  // ==================== Permission Methods ====================
  async getAllPermissions(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.find();
    return plainToInstance(PermissionResponseDto, permissions, { excludeExtraneousValues: false });
  }

  // ==================== Member Methods ====================
  async getWorkspaceMembers(
    workspaceId: string,
    userId: number,
  ): Promise<WorkspaceMemberResponseDto[]> {
    await this.checkWorkspaceMembership(workspaceId, userId);

    const members = await this.workspaceMemberRepository.find({
      where: { workspaceId },
      relations: ['user'],
    });

    const sanitized = this.sanitizeWorkspaceMembers(members);
    return plainToInstance(WorkspaceMemberResponseDto, sanitized, {
      excludeExtraneousValues: false,
    });
  }

  async inviteWorkspaceMember(
    workspaceId: string,
    userId: number,
    dto: InviteWorkspaceMemberDto,
  ): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    await this.checkWorkspacePermission(workspaceId, userId, [WorkspaceMemberRole.OWNER]);
    const invitor: User = await this.workspaceMemberRepository.manager
      .getRepository(User)
      .findOne({ where: { id: userId } });
    const invitee: User = await this.workspaceMemberRepository.manager
      .getRepository(User)
      .findOne({ where: { email: dto.email } });

    if (invitee) {
      const existingMember: WorkspaceMember = await this.workspaceMemberRepository.findOne({
        where: { workspaceId, userId: invitee.id },
      });

      if (existingMember) {
        throw new ConflictException('User is already a member of this workspace');
      }

      if (invitee.id === invitor.id) {
        throw new BadRequestException('You cannot invite yourself to the workspace');
      }
      const invitationExists = await this.workspaceInvitationRepository.findOne({
        where: { workspaceId, invitedEmail: dto.email },
      });
      if (invitationExists && invitationExists.status === InvitationStatus.PENDING) {
        throw new ConflictException(
          'An invitation has already been sent to this email for this workspace',
        );
      }
      const notificationContent: string = `You have been invited to join workspace ${
        workspace.name
      } by ${invitor.name || invitor.email}.`;
      const invitation: WorkspaceInvitation = this.workspaceInvitationRepository.create({
        workspaceId,
        invitedEmail: dto.email,
        invitedUserId: invitee.id,
        invitedById: userId,
        role: dto.role || WorkspaceMemberRole.MEMBER,
        status: InvitationStatus.PENDING,
      });
      await this.workspaceInvitationRepository.save(invitation);
      await this.notificationService.createNotification({
        userId: invitee.id,
        title: 'Workspace Invitation',
        content: notificationContent,
        type: NotificationType.WORKSPACE_INVITATION,
      });
    } else {
      throw new NotFoundException('User with this email does not exist');
    }
  }

  async updateWorkspaceMemberRole(
    workspaceId: string,
    memberId: number,
    userId: number,
    dto: UpdateWorkspaceMemberRoleDto,
  ): Promise<void> {
    await this.checkWorkspacePermission(workspaceId, userId, [WorkspaceMemberRole.OWNER]);
    if (memberId === userId) {
      throw new BadRequestException('User cannot change their own role');
    }
    const member = await this.workspaceMemberRepository.findOne({
      where: { userId: memberId, workspaceId },
    });

    if (!member) {
      throw new NotFoundException('Workspace member not found');
    }

    // Prevent owner from demoting themselves if they are the only owner
    if (member.userId === userId && member.role === WorkspaceMemberRole.OWNER) {
      const ownerCount = await this.workspaceMemberRepository.count({
        where: { workspaceId, role: WorkspaceMemberRole.OWNER },
      });

      if (ownerCount === 1 && dto.role !== WorkspaceMemberRole.OWNER) {
        throw new BadRequestException(
          'Cannot change role. You are the only owner of this workspace.',
        );
      }
    }

    member.role = dto.role;
    await this.workspaceMemberRepository.save(member);
  }

  async removeWorkspaceMember(
    workspaceId: string,
    memberId: number,
    userId: number,
  ): Promise<void> {
    await this.checkWorkspacePermission(workspaceId, userId, [WorkspaceMemberRole.OWNER]);

    const member = await this.workspaceMemberRepository.findOne({
      where: { userId: memberId, workspaceId },
    });

    if (!member) {
      throw new NotFoundException('Workspace member not found');
    }

    // Prevent removing the only owner
    if (member.role === WorkspaceMemberRole.OWNER) {
      const ownerCount = await this.workspaceMemberRepository.count({
        where: { workspaceId, role: WorkspaceMemberRole.OWNER },
      });

      if (ownerCount === 1) {
        throw new BadRequestException('Cannot remove the only owner. Transfer ownership first.');
      }
    }

    // Remove from all teams in this workspace
    const teams = await this.teamRepository.find({ where: { workspaceId } });
    const teamIds = teams.map((t) => t.id);

    await this.teamMemberRepository.delete({
      userId: member.userId,
      teamId: In(teamIds),
    });

    // Remove from workspace
    await this.workspaceMemberRepository.remove(member);
  }

  async getTeamMembers(teamId: string, userId: number): Promise<TeamMemberResponseDto[]> {
    await this.checkTeamMembership(teamId, userId);

    const members = await this.teamMemberRepository.find({
      where: { teamId },
      relations: ['user', 'role', 'role.permissions', 'role.activityTemplates'],
    });

    const sanitized = this.sanitizeTeamMembers(members);
    return plainToInstance(TeamMemberResponseDto, sanitized, { excludeExtraneousValues: false });
  }

  async inviteTeamMember(teamId: string, userId: number, dto: InviteMemberDto): Promise<void> {
    // Get team first
    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Check if user is team owner
    const teamMember = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
      relations: ['role'],
    });

    if (!teamMember || teamMember.role.name !== 'Owner') {
      throw new ForbiddenException('Only team owner can invite members');
    }

    // Check if role exists
    const role = await this.roleRepository.findOne({
      where: { id: dto.roleId, teamId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Find user by email in workspace members
    const workspaceMembers = await this.workspaceMemberRepository.find({
      where: { workspaceId: team.workspaceId },
      relations: ['user'],
    });

    const workspaceMember = workspaceMembers.find((m) => m.user.email === dto.email);

    let invitedUserId: number | null = null;

    if (workspaceMember) {
      invitedUserId = workspaceMember.userId;

      // Check if already a team member
      const existingTeamMember = await this.teamMemberRepository.findOne({
        where: { teamId, userId: invitedUserId },
      });

      if (existingTeamMember) {
        throw new BadRequestException('User is already a member of this team');
      }
    } else {
      throw new NotFoundException(
        'User not found in workspace. Please add them to workspace first.',
      );
    }

    // Check for existing pending invitation
    const existingInvitation = await this.teamInvitationRepository.findOne({
      where: {
        teamId,
        invitedEmail: dto.email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new BadRequestException('An invitation already exists for this email');
    }

    // Create invitation
    await this.teamInvitationRepository.save({
      teamId,
      invitedEmail: dto.email,
      invitedUserId,
      roleId: dto.roleId,
      invitedById: userId,
      status: InvitationStatus.PENDING,
    });

    // Send notification
    try {
      const team = await this.teamRepository.findOne({
        where: { id: teamId },
        relations: ['workspace'],
      });

      await this.notificationService.createNotification({
        userId: invitedUserId,
        title: 'Team Invitation',
        content: `You have been invited to join ${team?.name || 'a team'} in workspace ${
          team?.workspace?.name || ''
        }`,
        type: NotificationType.TEAM_INVITATION,
      });
    } catch (error) {
      console.error('Failed to send invitation notification:', error);
    }
  }

  async updateTeamMemberRole(
    teamId: string,
    memberId: string,
    userId: number,
    dto: UpdateMemberRoleDto,
  ): Promise<void> {
    // Check if user is team owner
    const teamOwner = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
      relations: ['role'],
    });

    if (!teamOwner || teamOwner.role.name !== 'Owner') {
      throw new ForbiddenException('Only team owner can update member roles');
    }

    // return;
    console.log('Updating role for memberId:', memberId, 'in teamId:', teamId);

    const member = await this.teamMemberRepository.findOne({
      where: { id: memberId, teamId },
      relations: ['role'],
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    const role = await this.roleRepository.findOne({
      where: { id: dto.roleId, teamId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Prevent changing the role of the last owner
    if (member.role.name === 'Owner') {
      const ownerCount = await this.teamMemberRepository.count({
        where: { teamId },
        relations: ['role'],
      });

      const owners = await this.teamMemberRepository.find({
        where: { teamId },
        relations: ['role'],
      });

      const ownerMembers = owners.filter((m) => m.role.name === 'Owner');

      if (ownerMembers.length === 1 && role.name !== 'Owner') {
        throw new BadRequestException('Cannot change role of the last team owner');
      }
    }
    member.roleId = dto.roleId;
    await this.teamMemberRepository.save(member);
  }

  async removeTeamMember(teamId: string, memberId: string, userId: number): Promise<void> {
    // Check if user is team owner
    const teamOwner = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
      relations: ['role'],
    });

    if (!teamOwner || teamOwner.role.name !== 'Owner') {
      throw new ForbiddenException('Only team owner can remove members');
    }

    const member = await this.teamMemberRepository.findOne({
      where: { id: memberId, teamId },
      relations: ['role'],
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    // Prevent removing the last owner
    if (member.role.name === 'Owner') {
      const owners = await this.teamMemberRepository.find({
        where: { teamId },
        relations: ['role'],
      });

      const ownerMembers = owners.filter((m) => m.role.name === 'Owner');

      if (ownerMembers.length === 1) {
        throw new BadRequestException('Cannot remove the last team owner');
      }
    }

    await this.teamMemberRepository.remove(member);
  }

  // ==================== Invitation Methods ====================
  async getMyInvitations(userId: number): Promise<{
    teamInvitations: TeamInvitationResponseDto[];
    workspaceInvitations: WorkspaceInvitationResponseDto[];
  }> {
    const teamInvitations = await this.teamInvitationRepository.find({
      where: { invitedUserId: userId, status: InvitationStatus.PENDING },
      relations: [
        'team',
        'team.workspace',
        'role',
        'role.permissions',
        'role.activityTemplates',
        'invitedBy',
      ],
    });

    const workspaceInvitations = await this.workspaceInvitationRepository.find({
      where: { invitedUserId: userId, status: InvitationStatus.PENDING },
      relations: ['workspace', 'workspace.owner', 'invitedBy'],
    });

    // Sanitize team invitations
    const sanitizedTeamInvitations = teamInvitations.map((inv) => this.sanitizeTeamInvitation(inv));

    // Sanitize workspace invitations
    const sanitizedWorkspaceInvitations = workspaceInvitations.map((inv) => {
      if (inv?.invitedBy) {
        inv.invitedBy = this.sanitizeUser(inv.invitedBy);
      }
      if (inv?.workspace) {
        inv.workspace = this.sanitizeWorkspace(inv.workspace);
      }
      return inv;
    });

    const teamDtos = plainToInstance(TeamInvitationResponseDto, sanitizedTeamInvitations, {
      excludeExtraneousValues: false,
    });

    const workspaceDtos = plainToInstance(
      WorkspaceInvitationResponseDto,
      sanitizedWorkspaceInvitations,
      {
        excludeExtraneousValues: false,
      },
    );

    return {
      teamInvitations: teamDtos,
      workspaceInvitations: workspaceDtos,
    };
  }

  async respondToInvitation(userId: number, dto: RespondInvitationDto): Promise<void> {
    // Try to find team invitation first
    let invitation = await this.teamInvitationRepository.findOne({
      where: { id: dto.invitationId },
      relations: ['team', 'team.workspace', 'role'],
    });

    let isTeamInvitation = true;

    // If not found, try workspace invitation
    if (!invitation) {
      const workspaceInvitation = await this.workspaceInvitationRepository.findOne({
        where: { id: dto.invitationId },
        relations: ['workspace'],
      });

      if (!workspaceInvitation) {
        throw new NotFoundException('Invitation not found');
      }

      if (workspaceInvitation.invitedUserId !== userId) {
        throw new ForbiddenException('This invitation is not for you');
      }

      if (workspaceInvitation.status !== InvitationStatus.PENDING) {
        throw new BadRequestException('This invitation has already been responded to');
      }

      workspaceInvitation.status = dto.status;
      await this.workspaceInvitationRepository.save(workspaceInvitation);

      if (dto.status === InvitationStatus.ACCEPTED) {
        // Add user as workspace member
        await this.workspaceMemberRepository.save({
          workspaceId: workspaceInvitation.workspaceId,
          userId,
          role: workspaceInvitation.role,
        });
      }

      return;
    }

    // Handle team invitation
    if (invitation.invitedUserId !== userId) {
      throw new ForbiddenException('This invitation is not for you');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('This invitation has already been responded to');
    }

    invitation.status = dto.status;
    await this.teamInvitationRepository.save(invitation);

    if (dto.status === InvitationStatus.ACCEPTED) {
      // Verify user is workspace member
      const workspaceMember = await this.workspaceMemberRepository.findOne({
        where: { workspaceId: invitation.team.workspaceId, userId },
      });

      if (!workspaceMember) {
        throw new ForbiddenException('You must be a workspace member before joining a team');
      }

      // Add user to team
      await this.teamMemberRepository.save({
        teamId: invitation.teamId,
        userId,
        roleId: invitation.roleId,
      });
    }
  }

  // ==================== Permission & Template Access Methods ====================

  /**
   * Get team member with relations
   */
  async getTeamMember(userId: number, teamId: string): Promise<TeamMember | null> {
    return this.teamMemberRepository.findOne({
      where: { userId, teamId },
      relations: ['role', 'role.permissions', 'role.activityTemplates', 'team'],
    });
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    userId: number,
    teamId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const member = await this.teamMemberRepository.findOne({
      where: { userId, teamId },
      relations: ['role', 'role.permissions'],
    });

    if (!member) {
      return false;
    }

    return member.role.permissions.some((p) => p.resource === resource && p.action === action);
  }

  /**
   * Check if user has access to specific activity template
   */
  async hasTemplateAccess(userId: number, teamId: string, templateId: string): Promise<boolean> {
    const member = await this.teamMemberRepository.findOne({
      where: { userId, teamId },
      relations: ['role', 'role.activityTemplates'],
    });

    if (!member) {
      return false;
    }

    return member.role.activityTemplates.some((t) => t.id === templateId);
  }

  /**
   * Get accessible activity templates for user in team
   */
  async getAccessibleTemplates(userId: number, teamId: string) {
    const member = await this.teamMemberRepository.findOne({
      where: { userId, teamId },
      relations: ['role', 'role.activityTemplates', 'role.activityTemplates.activityPackage'],
    });

    return member?.role?.activityTemplates || [];
  }

  /**
   * Check both permission and template access
   */
  async canUserPerformActionWithTemplate(
    userId: number,
    teamId: string,
    resource: string,
    action: string,
    templateId: string,
  ): Promise<boolean> {
    const hasPermission = await this.hasPermission(userId, teamId, resource, action);
    if (!hasPermission) {
      return false;
    }

    const hasTemplateAccess = await this.hasTemplateAccess(userId, teamId, templateId);
    return hasTemplateAccess;
  }

  /**
   * Assert permission and template access - throws exception if not allowed
   */
  async assertPermissionAndTemplateAccess(
    userId: number,
    teamId: string,
    resource: string,
    action: string,
    templateId: string,
  ): Promise<void> {
    const canPerform = await this.canUserPerformActionWithTemplate(
      userId,
      teamId,
      resource,
      action,
      templateId,
    );

    if (!canPerform) {
      throw new ForbiddenException(
        `You don't have permission to ${action} ${resource} with this template`,
      );
    }
  }

  // ==================== Team Package Management ====================
  /**
   * Check if user is team owner
   */
  private async checkTeamOwnership(teamId: string, userId: number): Promise<void> {
    const teamMember = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
      relations: ['role'],
    });

    if (!teamMember || teamMember.role.name !== 'Owner') {
      throw new ForbiddenException('Only team owner can manage activity packages');
    }
  }

  /**
   * Add activity package access to team
   */
  async addPackageToTeam(teamId: string, userId: number, packageId: string): Promise<void> {
    // Check team membership
    await this.checkTeamMembership(teamId, userId);

    // Check team ownership
    await this.checkTeamOwnership(teamId, userId);

    // Check if package access already exists
    const existingAccess = await this.activityPackageAccessRepository.findOne({
      where: { teamId, packageId },
    });

    if (existingAccess) {
      throw new ConflictException('Package already added to this team');
    }

    // Add package access
    await this.activityPackageAccessRepository.save({
      packageId,
      teamId,
      hasAccess: true,
    });
  }

  /**
   * Remove activity package access from team
   */
  async removePackageFromTeam(teamId: string, userId: number, packageId: string): Promise<void> {
    // Check team membership
    await this.checkTeamMembership(teamId, userId);

    // Check team ownership
    await this.checkTeamOwnership(teamId, userId);

    // Remove package access
    const result = await this.activityPackageAccessRepository.delete({
      teamId,
      packageId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Package access not found for this team');
    }
  }
}
