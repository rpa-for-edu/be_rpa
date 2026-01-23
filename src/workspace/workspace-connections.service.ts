import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceConnection } from './entity/workspace-connection.entity';
import { Workspace } from './entity/workspace.entity';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { CreateWorkspaceConnectionDto } from './dto/create-workspace-connection.dto';
import { UpdateWorkspaceConnectionDto } from './dto/update-workspace-connection.dto';
import { AuthorizationProvider } from 'src/connection/entity/connection.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class WorkspaceConnectionsService {
  constructor(
    @InjectRepository(WorkspaceConnection)
    private workspaceConnectionRepository: Repository<WorkspaceConnection>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  /**
   * Check if user is workspace owner
   */
  private async checkWorkspaceOwner(workspaceId: string, userId: number): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('Only workspace owner can manage connections');
    }
  }

  /**
   * Check if user has access to workspace (owner or member)
   */
  private async checkWorkspaceAccess(workspaceId: string, userId: number): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const isOwner = workspace.ownerId === userId;
    if (isOwner) return;

    const isMember = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
    });

    if (!isMember) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
  }

  /**
   * Create a new workspace connection (Owner only)
   */
  async createConnection(
    workspaceId: string,
    userId: number,
    createDto: CreateWorkspaceConnectionDto,
  ): Promise<WorkspaceConnection> {
    // Check if user is owner
    await this.checkWorkspaceOwner(workspaceId, userId);

    // Check if connection already exists
    const existingConnection = await this.workspaceConnectionRepository.findOne({
      where: {
        workspaceId,
        provider: createDto.provider,
        name: createDto.name,
      },
    });

    if (existingConnection) {
      throw new ConflictException('Connection with this name and provider already exists');
    }

    // Generate unique connection key
    const connectionKey = `${workspaceId}-${createDto.provider}-${randomUUID()}`;

    const connection = this.workspaceConnectionRepository.create({
      workspaceId,
      provider: createDto.provider,
      name: createDto.name,
      accessToken: createDto.accessToken,
      refreshToken: createDto.refreshToken,
      connectionKey,
    });

    return await this.workspaceConnectionRepository.save(connection);
  }

  /**
   * Get all connections in workspace (All members can view)
   */
  async getConnections(
    workspaceId: string,
    userId: number,
    provider?: AuthorizationProvider,
  ): Promise<WorkspaceConnection[]> {
    // Check if user has access to workspace
    await this.checkWorkspaceAccess(workspaceId, userId);

    const query: any = { workspaceId };
    if (provider) {
      query.provider = provider;
    }

    return await this.workspaceConnectionRepository.find({
      where: query,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a specific connection (All members can view)
   */
  async getConnection(
    workspaceId: string,
    userId: number,
    provider: AuthorizationProvider,
    name: string,
  ): Promise<WorkspaceConnection> {
    // Check if user has access to workspace
    await this.checkWorkspaceAccess(workspaceId, userId);

    const connection = await this.workspaceConnectionRepository.findOne({
      where: { workspaceId, provider, name },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    return connection;
  }

  /**
   * Update connection (Owner only)
   */
  async updateConnection(
    workspaceId: string,
    userId: number,
    provider: AuthorizationProvider,
    name: string,
    updateDto: UpdateWorkspaceConnectionDto,
  ): Promise<WorkspaceConnection> {
    // Check if user is owner
    await this.checkWorkspaceOwner(workspaceId, userId);

    const connection = await this.workspaceConnectionRepository.findOne({
      where: { workspaceId, provider, name },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // Update only provided fields
    if (updateDto.accessToken) {
      connection.accessToken = updateDto.accessToken;
    }
    if (updateDto.refreshToken) {
      connection.refreshToken = updateDto.refreshToken;
    }

    return await this.workspaceConnectionRepository.save(connection);
  }

  /**
   * Delete connection (Owner only)
   */
  async deleteConnection(
    workspaceId: string,
    userId: number,
    provider: AuthorizationProvider,
    name: string,
  ): Promise<void> {
    // Check if user is owner
    await this.checkWorkspaceOwner(workspaceId, userId);

    const connection = await this.workspaceConnectionRepository.findOne({
      where: { workspaceId, provider, name },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    await this.workspaceConnectionRepository.remove(connection);
  }

  /**
   * Get connection by connection key (for robot usage)
   */
  async getConnectionByKey(connectionKey: string): Promise<WorkspaceConnection> {
    const connection = await this.workspaceConnectionRepository.findOne({
      where: { connectionKey },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    return connection;
  }
}
