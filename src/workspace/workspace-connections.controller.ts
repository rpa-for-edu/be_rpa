import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceConnectionsService } from './workspace-connections.service';
import { UserDecor } from 'src/common/decorators/user.decorator';
import { UserPayload } from 'src/auth/strategy/jwt.strategy';
import { CreateWorkspaceConnectionDto } from './dto/create-workspace-connection.dto';
import { UpdateWorkspaceConnectionDto } from './dto/update-workspace-connection.dto';
import { AuthorizationProvider } from 'src/connection/entity/connection.entity';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { ResponseUtil } from 'src/common/utils/response.util';

@Controller('workspace/:workspaceId/connections')
@ApiTags('workspace-connections')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class WorkspaceConnectionsController {
  constructor(private readonly workspaceConnectionsService: WorkspaceConnectionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create workspace connection (Owner only)' })
  @ApiParam({ name: 'workspaceId', type: 'string', description: 'Workspace ID' })
  @ApiBody({ type: CreateWorkspaceConnectionDto })
  @ApiResponse({
    status: 201,
    description: 'Connection created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only workspace owner can create connections',
  })
  @ApiResponse({
    status: 409,
    description: 'Connection already exists',
  })
  async createConnection(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
    @Body() createDto: CreateWorkspaceConnectionDto,
  ): Promise<ApiResponseDto<any>> {
    const connection = await this.workspaceConnectionsService.createConnection(
      workspaceId,
      user.id,
      createDto,
    );

    return ResponseUtil.success(
      {
        provider: connection.provider,
        name: connection.name,
        connectionKey: connection.connectionKey,
        createdAt: connection.createdAt,
      },
      'Connection created successfully',
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all workspace connections' })
  @ApiParam({ name: 'workspaceId', type: 'string', description: 'Workspace ID' })
  @ApiQuery({
    name: 'provider',
    enum: AuthorizationProvider,
    required: false,
    description: 'Filter by provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Connections retrieved successfully',
  })
  async getConnections(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
    @Query('provider') provider?: AuthorizationProvider,
  ): Promise<ApiResponseDto<any[]>> {
    const connections = await this.workspaceConnectionsService.getConnections(
      workspaceId,
      user.id,
      provider,
    );

    const data = connections.map((conn) => ({
      provider: conn.provider,
      name: conn.name,
      connectionKey: conn.connectionKey,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    }));

    return ResponseUtil.success(data, 'Connections retrieved successfully');
  }

  @Get(':provider/:name')
  @ApiOperation({ summary: 'Get specific workspace connection' })
  @ApiParam({ name: 'workspaceId', type: 'string', description: 'Workspace ID' })
  @ApiParam({ name: 'provider', enum: AuthorizationProvider, description: 'Provider' })
  @ApiParam({ name: 'name', type: 'string', description: 'Connection name' })
  @ApiResponse({
    status: 200,
    description: 'Connection retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Connection not found',
  })
  async getConnection(
    @Param('workspaceId') workspaceId: string,
    @Param('provider') provider: AuthorizationProvider,
    @Param('name') name: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<any>> {
    const connection = await this.workspaceConnectionsService.getConnection(
      workspaceId,
      user.id,
      provider,
      name,
    );

    return ResponseUtil.success(
      {
        provider: connection.provider,
        name: connection.name,
        connectionKey: connection.connectionKey,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      },
      'Connection retrieved successfully',
    );
  }

  @Put(':provider/:name')
  @ApiOperation({ summary: 'Update workspace connection (Owner only)' })
  @ApiParam({ name: 'workspaceId', type: 'string', description: 'Workspace ID' })
  @ApiParam({ name: 'provider', enum: AuthorizationProvider, description: 'Provider' })
  @ApiParam({ name: 'name', type: 'string', description: 'Connection name' })
  @ApiBody({ type: UpdateWorkspaceConnectionDto })
  @ApiResponse({
    status: 200,
    description: 'Connection updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only workspace owner can update connections',
  })
  @ApiResponse({
    status: 404,
    description: 'Connection not found',
  })
  async updateConnection(
    @Param('workspaceId') workspaceId: string,
    @Param('provider') provider: AuthorizationProvider,
    @Param('name') name: string,
    @UserDecor() user: UserPayload,
    @Body() updateDto: UpdateWorkspaceConnectionDto,
  ): Promise<ApiResponseDto<any>> {
    const connection = await this.workspaceConnectionsService.updateConnection(
      workspaceId,
      user.id,
      provider,
      name,
      updateDto,
    );

    return ResponseUtil.success(
      {
        provider: connection.provider,
        name: connection.name,
        connectionKey: connection.connectionKey,
        updatedAt: connection.updatedAt,
      },
      'Connection updated successfully',
    );
  }

  @Delete(':provider/:name')
  @ApiOperation({ summary: 'Delete workspace connection (Owner only)' })
  @ApiParam({ name: 'workspaceId', type: 'string', description: 'Workspace ID' })
  @ApiParam({ name: 'provider', enum: AuthorizationProvider, description: 'Provider' })
  @ApiParam({ name: 'name', type: 'string', description: 'Connection name' })
  @ApiResponse({
    status: 200,
    description: 'Connection deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only workspace owner can delete connections',
  })
  @ApiResponse({
    status: 404,
    description: 'Connection not found',
  })
  async deleteConnection(
    @Param('workspaceId') workspaceId: string,
    @Param('provider') provider: AuthorizationProvider,
    @Param('name') name: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceConnectionsService.deleteConnection(workspaceId, user.id, provider, name);

    return ResponseUtil.success(null, 'Connection deleted successfully');
  }
}
