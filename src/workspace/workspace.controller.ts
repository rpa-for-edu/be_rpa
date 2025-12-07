import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { UserDecor } from 'src/common/decorators/user.decorator';
import { UserPayload } from 'src/auth/strategy/jwt.strategy';
import { ResponseUtil } from 'src/common/utils/response.util';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { WorkspaceMessages } from './constants/workspace-messages.constant';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  CreateTeamDto,
  UpdateTeamDto,
  CreateRoleDto,
  UpdateRoleDto,
  InviteMemberDto,
  InviteWorkspaceMemberDto,
  UpdateMemberRoleDto,
  UpdateWorkspaceMemberRoleDto,
  RespondInvitationDto,
  CreatePermissionDto,
  UpdatePermissionDto,
} from './dto/workspace.dto';
import {
  WorkspaceResponseDto,
  SimpleWorkspaceResponseDto,
  TeamResponseDto,
  RoleResponseDto,
  PermissionResponseDto,
  WorkspaceMemberResponseDto,
  TeamMemberResponseDto,
  TeamInvitationResponseDto,
  InvitationResponseDto,
} from './dto/response/response.dto';

@Controller('workspace')
@ApiTags('workspace')
@ApiBearerAuth()
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  // ==================== Permission Endpoints ====================
  @Get('permissions')
  @Public()
  @ApiOperation({ summary: 'Get all available permissions' })
  @ApiOkResponse({ type: ApiResponseDto<PermissionResponseDto[]> })
  async getAllPermissions(): Promise<ApiResponseDto<PermissionResponseDto[]>> {
    const data = await this.workspaceService.getAllPermissions();
    return ResponseUtil.success(data, WorkspaceMessages.PERMISSIONS_FOUND);
  }

  // ==================== Workspace Endpoints ====================
  @Get()
  @ApiOperation({ summary: 'Get all workspaces for current user' })
  @ApiOkResponse({ type: ApiResponseDto<SimpleWorkspaceResponseDto[]> })
  async getAllWorkspaces(
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<SimpleWorkspaceResponseDto[]>> {
    const data = await this.workspaceService.getAllWorkspaces(user.id);
    return ResponseUtil.success(data, WorkspaceMessages.WORKSPACES_FOUND);
  }

  @Get(':workspaceId')
  @ApiOperation({ summary: 'Get workspace by ID' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<WorkspaceResponseDto> })
  async getWorkspaceById(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<WorkspaceResponseDto>> {
    const data = await this.workspaceService.getWorkspaceById(workspaceId, user.id);
    return ResponseUtil.success(data, WorkspaceMessages.WORKSPACE_FOUND);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiOkResponse({ type: ApiResponseDto<WorkspaceResponseDto> })
  async createWorkspace(
    @UserDecor() user: UserPayload,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<ApiResponseDto<WorkspaceResponseDto>> {
    const data = await this.workspaceService.createWorkspace(user.id, dto);
    return ResponseUtil.created(data, WorkspaceMessages.WORKSPACE_CREATED);
  }

  @Patch(':workspaceId')
  @ApiOperation({ summary: 'Update workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<WorkspaceResponseDto> })
  async updateWorkspace(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<ApiResponseDto<WorkspaceResponseDto>> {
    const data = await this.workspaceService.updateWorkspace(workspaceId, user.id, dto);
    return ResponseUtil.updated(data, WorkspaceMessages.WORKSPACE_UPDATED);
  }

  @Delete(':workspaceId')
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<null> })
  async deleteWorkspace(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceService.deleteWorkspace(workspaceId, user.id);
    return ResponseUtil.deleted(WorkspaceMessages.WORKSPACE_DELETED);
  }

  @Post(':workspaceId/leave')
  @ApiOperation({ summary: 'Leave workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<null> })
  async leaveWorkspace(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceService.leaveWorkspace(workspaceId, user.id);
    return ResponseUtil.success(null, WorkspaceMessages.WORKSPACE_LEFT);
  }

  // ==================== Team Endpoints ====================
  @Get(':workspaceId/team')
  @ApiOperation({ summary: 'Get all teams in workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<TeamResponseDto[]> })
  async getTeamsByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<TeamResponseDto[]>> {
    const data = await this.workspaceService.getTeamsByWorkspace(workspaceId, user.id);
    return ResponseUtil.success(data, WorkspaceMessages.TEAMS_FOUND);
  }

  @Get('team/:teamId')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<TeamResponseDto> })
  async getTeamById(
    @Param('teamId') teamId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<TeamResponseDto>> {
    const data = await this.workspaceService.getTeamById(teamId, user.id);
    return ResponseUtil.success(data, WorkspaceMessages.TEAM_FOUND);
  }

  @Post(':workspaceId/team')
  @ApiOperation({ summary: 'Create a new team' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<TeamResponseDto> })
  async createTeam(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
    @Body() dto: CreateTeamDto,
  ): Promise<ApiResponseDto<TeamResponseDto>> {
    const data = await this.workspaceService.createTeam(workspaceId, user.id, dto);
    return ResponseUtil.created(data, WorkspaceMessages.TEAM_CREATED);
  }

  @Patch('team/:teamId')
  @ApiOperation({ summary: 'Update team' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<TeamResponseDto> })
  async updateTeam(
    @Param('teamId') teamId: string,
    @UserDecor() user: UserPayload,
    @Body() dto: UpdateTeamDto,
  ): Promise<ApiResponseDto<TeamResponseDto>> {
    const data = await this.workspaceService.updateTeam(teamId, user.id, dto);
    return ResponseUtil.updated(data, WorkspaceMessages.TEAM_UPDATED);
  }

  @Delete('team/:teamId')
  @ApiOperation({ summary: 'Delete team' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<null> })
  async deleteTeam(
    @Param('teamId') teamId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceService.deleteTeam(teamId, user.id);
    return ResponseUtil.deleted(WorkspaceMessages.TEAM_DELETED);
  }

  // ==================== Role Endpoints ====================
  @Get('team/:teamId/role')
  @ApiOperation({ summary: 'Get all roles in team' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<RoleResponseDto[]> })
  async getRolesByTeam(
    @Param('teamId') teamId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<RoleResponseDto[]>> {
    const data = await this.workspaceService.getRolesByTeam(teamId, user.id);
    return ResponseUtil.success(data, WorkspaceMessages.ROLES_FOUND);
  }

  @Post('team/:teamId/role')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<RoleResponseDto> })
  async createRole(
    @Param('teamId') teamId: string,
    @UserDecor() user: UserPayload,
    @Body() dto: CreateRoleDto,
  ): Promise<ApiResponseDto<RoleResponseDto>> {
    const data = await this.workspaceService.createRole(teamId, user.id, dto);
    return ResponseUtil.created(data, WorkspaceMessages.ROLE_CREATED);
  }

  @Patch('team/:teamId/role/:roleId')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiParam({ name: 'roleId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<RoleResponseDto> })
  async updateRole(
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
    @UserDecor() user: UserPayload,
    @Body() dto: UpdateRoleDto,
  ): Promise<ApiResponseDto<RoleResponseDto>> {
    const data = await this.workspaceService.updateRole(teamId, roleId, user.id, dto);
    return ResponseUtil.updated(data, WorkspaceMessages.ROLE_UPDATED);
  }

  @Delete('team/:teamId/role/:roleId')
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiParam({ name: 'roleId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<null> })
  async deleteRole(
    @Param('teamId') teamId: string,
    @Param('roleId') roleId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceService.deleteRole(teamId, roleId, user.id);
    return ResponseUtil.deleted(WorkspaceMessages.ROLE_DELETED);
  }

  // ==================== Workspace Member Endpoints ====================
  @Get(':workspaceId/member')
  @ApiOperation({ summary: 'Get all members in workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<WorkspaceMemberResponseDto[]> })
  async getWorkspaceMembers(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<WorkspaceMemberResponseDto[]>> {
    const data = await this.workspaceService.getWorkspaceMembers(workspaceId, user.id);
    return ResponseUtil.success(data, WorkspaceMessages.WORKSPACE_MEMBERS_FOUND);
  }

  @Post(':workspaceId/member/invitation')
  @ApiOperation({ summary: 'Invite a member to workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<null> })
  async inviteWorkspaceMember(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
    @Body() dto: InviteWorkspaceMemberDto,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceService.inviteWorkspaceMember(workspaceId, user.id, dto);
    return ResponseUtil.created(null, WorkspaceMessages.WORKSPACE_MEMBER_INVITED);
  }

  @Patch(':workspaceId/member/:memberId/role')
  @ApiOperation({ summary: 'Update workspace member role' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'memberId', type: 'number' })
  @ApiOkResponse({ type: ApiResponseDto<null> })
  async updateWorkspaceMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: number,
    @UserDecor() user: UserPayload,
    @Body() dto: UpdateWorkspaceMemberRoleDto,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceService.updateWorkspaceMemberRole(workspaceId, memberId, user.id, dto);
    return ResponseUtil.updated(null, WorkspaceMessages.WORKSPACE_MEMBER_UPDATED);
  }

  @Delete(':workspaceId/member/:memberId')
  @ApiOperation({ summary: 'Remove member from workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'memberId', type: 'number' })
  @ApiOkResponse({ type: ApiResponseDto<null> })
  async removeWorkspaceMember(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: number,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceService.removeWorkspaceMember(workspaceId, memberId, user.id);
    return ResponseUtil.deleted(WorkspaceMessages.WORKSPACE_MEMBER_REMOVED);
  }

  // ==================== Team Member Endpoints ====================

  @Get('team/:teamId/member')
  @ApiOperation({ summary: 'Get all members in team' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<TeamMemberResponseDto[]> })
  async getTeamMembers(
    @Param('teamId') teamId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<TeamMemberResponseDto[]>> {
    const data = await this.workspaceService.getTeamMembers(teamId, user.id);
    return ResponseUtil.success(data, WorkspaceMessages.TEAM_MEMBERS_FOUND);
  }

  @Post('team/:teamId/member/invitation')
  @ApiOperation({ summary: 'Invite a member to team' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<null> })
  async inviteTeamMember(
    @Param('teamId') teamId: string,
    @UserDecor() user: UserPayload,
    @Body() dto: InviteMemberDto,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceService.inviteTeamMember(teamId, user.id, dto);
    return ResponseUtil.created(null, WorkspaceMessages.TEAM_MEMBER_INVITED);
  }

  @Patch('team/:teamId/member/:memberId/role')
  @ApiOperation({ summary: 'Update team member role' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiParam({ name: 'memberId', type: 'number' })
  @ApiOkResponse({ type: ApiResponseDto<null> })
  async updateTeamMemberRole(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: number,
    @UserDecor() user: UserPayload,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceService.updateTeamMemberRole(teamId, memberId, user.id, dto);
    return ResponseUtil.updated(null, WorkspaceMessages.TEAM_MEMBER_UPDATED);
  }

  @Delete('team/:teamId/member/:memberId')
  @ApiOperation({ summary: 'Remove member from team' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiParam({ name: 'memberId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<null> })
  async removeTeamMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceService.removeTeamMember(teamId, memberId, user.id);
    return ResponseUtil.deleted(WorkspaceMessages.TEAM_MEMBER_REMOVED);
  }

  // ==================== Invitation Endpoints ====================
  @Get('invitation/me')
  @ApiOperation({ summary: 'Get my invitations' })
  @ApiOkResponse({ type: ApiResponseDto<InvitationResponseDto> })
  async getMyInvitations(
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<InvitationResponseDto>> {
    const data = await this.workspaceService.getMyInvitations(user.id);
    return ResponseUtil.success(data, WorkspaceMessages.INVITATIONS_FOUND);
  }

  @Post('invitation/response')
  @ApiOperation({ summary: 'Respond to invitation' })
  @ApiOkResponse({ type: ApiResponseDto<null> })
  async respondToInvitation(
    @UserDecor() user: UserPayload,
    @Body() dto: RespondInvitationDto,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceService.respondToInvitation(user.id, dto);
    const message =
      dto.status === 'accepted'
        ? WorkspaceMessages.INVITATION_ACCEPTED
        : WorkspaceMessages.INVITATION_REJECTED;
    return ResponseUtil.success(null, message);
  }
}
