import {
  Controller,
  Get,
  Delete,
  Param,
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
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TeamConnectionsService } from './team-connections.service';
import { UserDecor } from 'src/common/decorators/user.decorator';
import { UserPayload } from 'src/auth/strategy/jwt.strategy';
import { AuthorizationProvider } from 'src/connection/entity/connection.entity';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { ResponseUtil } from 'src/common/utils/response.util';

@Controller('team/:teamId/connections')
@ApiTags('team-connections')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class TeamConnectionsController {
  constructor(private readonly teamConnectionsService: TeamConnectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all team connections (shared from workspace)' })
  @ApiParam({ name: 'teamId', type: 'string', description: 'Team ID' })
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
    @Param('teamId') teamId: string,
    @UserDecor() user: UserPayload,
    @Query('provider') provider?: AuthorizationProvider,
  ): Promise<ApiResponseDto<any[]>> {
    const connections = await this.teamConnectionsService.getConnections(
      teamId,
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
  @ApiOperation({ summary: 'Get specific team connection' })
  @ApiParam({ name: 'teamId', type: 'string', description: 'Team ID' })
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
    @Param('teamId') teamId: string,
    @Param('provider') provider: AuthorizationProvider,
    @Param('name') name: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<any>> {
    const connection = await this.teamConnectionsService.getConnection(
      teamId,
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
}
