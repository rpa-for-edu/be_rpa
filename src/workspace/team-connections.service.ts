import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceConnection } from './entity/workspace-connection.entity';
import { TeamPermissionService } from './team-permission.service';
import { AuthorizationProvider } from 'src/connection/entity/connection.entity';

@Injectable()
export class TeamConnectionsService {
  constructor(
    @InjectRepository(WorkspaceConnection)
    private workspaceConnectionRepository: Repository<WorkspaceConnection>,
    private teamPermissionService: TeamPermissionService,
  ) {}

  /**
   * Get all workspace connections (team members can view workspace connections)
   */
  async getConnections(
    teamId: string,
    userId: number,
    provider?: AuthorizationProvider,
  ): Promise<WorkspaceConnection[]> {
    // Check team member (no specific permission needed to view connections)
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);

    // Get team's workspace
    const team = await this.teamPermissionService.getTeamWithWorkspace(teamId);

    // Get workspace connections
    const queryBuilder = this.workspaceConnectionRepository
      .createQueryBuilder('connection')
      .where('connection.workspaceId = :workspaceId', {
        workspaceId: team.workspaceId,
      })
      .orderBy('connection.createdAt', 'DESC');

    if (provider) {
      queryBuilder.andWhere('connection.provider = :provider', { provider });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Get specific workspace connection
   */
  async getConnection(
    teamId: string,
    userId: number,
    provider: AuthorizationProvider,
    name: string,
  ): Promise<WorkspaceConnection> {
    // Check team member
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);

    // Get team's workspace
    const team = await this.teamPermissionService.getTeamWithWorkspace(teamId);

    // Get connection
    const connection = await this.workspaceConnectionRepository.findOne({
      where: {
        workspaceId: team.workspaceId,
        provider,
        name,
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    return connection;
  }
}
