import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { UserDecor } from 'src/common/decorators/user.decorator';
import { UserPayload } from 'src/auth/strategy/jwt.strategy';
import { AuthorizationProvider } from 'src/connection/entity/connection.entity';
import {
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Public } from 'src/common/decorators/public.decorator';
import { GetUserCredentialBodyDto } from './dto/robot-credentials-body.dto';
import { GetUserCredentialWithRobotVersionBodyDto } from './dto/robot-version-credentials-body.dto';
import { CreateMoodleConnectionDto } from './dto/create-moodle-connection.dto';

@Controller('connection')
@ApiTags('connection')
@ApiBearerAuth()
export class ConnectionController {
  constructor(private readonly connectionService: ConnectionService) {}

  @Get()
  @ApiQuery({ name: 'provider', enum: AuthorizationProvider, required: false })
  async getConnections(
    @UserDecor() user: UserPayload,
    @Query('provider') provider?: AuthorizationProvider,
  ) {
    return this.connectionService.getConnections(user.id, provider);
  }

  @Get('/refresh')
  async refreshToken(
    @UserDecor() user: UserPayload,
    @Query('provider') provider: AuthorizationProvider,
    @Query('name') name: string,
  ) {
    return this.connectionService.refreshToken(user.id, provider, name);
  }

  @Delete()
  async removeConnection(
    @UserDecor() user: UserPayload,
    @Query('provider') provider: AuthorizationProvider,
    @Query('name') name: string,
  ) {
    return this.connectionService.removeConnection(user.id, provider, name);
  }

  @Post('/robot')
  async getConnectionsForRobotRun(
    @UserDecor() user: UserPayload,
    @Body() body: Omit<GetUserCredentialWithRobotVersionBodyDto, 'userId'>,
  ) {
    const { id } = user;
    const { processId, processVersion } = body;
    try {
      let result = await this.connectionService.getRobotConnectionsForUser(
        id,
        processId,
        processVersion,
      );
      return result;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: JSON.stringify(error),
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }
  }

  @Get('/robot/:robotKey')
  async getConnectionListByRobotKey(
    @Param('robotKey') robotKey: string,
    @Query('limit') limit?: number | undefined,
    @Query('offset') offset?: number | undefined,
  ) {
    try {
      limit = isNaN(limit as number) ? undefined : limit;
      offset = isNaN(offset as number) ? undefined : offset;
      let result = await this.connectionService.getAllConnectionsByRobotKey(
        robotKey,
        limit,
        offset,
      );
      return result;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: JSON.stringify(error),
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }
  }

  @Get('/usage/:connectionKey')
  async getRobotListUsedConnection(
    @UserDecor() user: UserPayload,
    @Param('connectionKey') connectionKey: string,
    @Query('limit') limit?: number | undefined,
    @Query('offset') offset?: number | undefined,
  ) {
    try {
      limit = isNaN(limit as number) ? undefined : limit;
      offset = isNaN(offset as number) ? undefined : offset;
      let result = await this.connectionService.getRobotsByConnection(connectionKey, limit, offset);
      return result;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: JSON.stringify(error),
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }
  }

  @Post('/connectionKey')
  async getConnectionByConnectionKey(@Body() body: { connectionKeys: string[] }) {
    try {
      let result = await this.connectionService.getConnectionByConnectionKey(body.connectionKeys);
      return result;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: JSON.stringify(error),
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }
  }

  @Post('/activate/robot/:robotKey')
  async activiteRobotConnection(
    @Param('robotKey') robotKey: string,
    @Body() body: { connectionKey: string; status: boolean },
  ) {
    try {
      let result = await this.connectionService.toggleRobotActivation(
        robotKey,
        body.connectionKey,
        body.status,
      );
      return result;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: JSON.stringify(error),
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }
  }

  @Post('/for-robot/version')
  @Public()
  @UseGuards(AuthGuard('api-key'))
  async getConnectionsForRobotVersion(@Body() body: GetUserCredentialWithRobotVersionBodyDto) {
    const { userId, processId, processVersion } = body;
    return this.connectionService.getRobotConnection(userId, processId, processVersion);
  }

  @Post('/moodle')
  @ApiOperation({ summary: 'Create Moodle connection' })
  @ApiBody({ type: CreateMoodleConnectionDto })
  @ApiResponse({
    status: 201,
    description: 'Moodle connection created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid Moodle credentials or connection already exists',
  })
  async createMoodleConnection(
    @UserDecor() user: UserPayload,
    @Body() createMoodleDto: CreateMoodleConnectionDto,
  ) {
    try {
      const connection = await this.connectionService.createMoodleConnection(
        user.id,
        createMoodleDto,
      );
      return {
        message: 'Moodle connection created successfully',
        connection: {
          provider: connection.provider,
          name: connection.name,
          connectionKey: connection.connectionKey,
          createdAt: connection.createdAt,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: error.message || 'Failed to create Moodle connection',
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }
  }

  @Get('/moodle/test')
  @ApiOperation({ summary: 'Test Moodle connection' })
  @ApiQuery({ name: 'name', description: 'Connection name', required: true })
  @ApiResponse({
    status: 200,
    description: 'Moodle connection test successful',
  })
  async testMoodleConnection(
    @UserDecor() user: UserPayload,
    @Query('name') name: string,
  ) {
    try {
      const siteInfo = await this.connectionService.testMoodleConnection(user.id, name);
      return {
        message: 'Connection successful',
        siteInfo,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: error.message || 'Failed to test Moodle connection',
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }
  }

  @Get('/erpnext/test')
  @ApiOperation({ summary: 'Test ERPNext connection' })
  @ApiQuery({ name: 'name', description: 'Connection name', required: true })
  @ApiResponse({
    status: 200,
    description: 'ERPNext connection test status',
  })
  async testERPNextConnection(
    @UserDecor() user: UserPayload,
    @Query('name') name: string,
  ) {
    try {
      return await this.connectionService.testERPNextConnection(user.id, name);
    } catch (error) {
       throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: error.message || 'Failed to test ERPNext connection',
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }
  }

  @Get('/moodle/credentials')
  @ApiOperation({ summary: 'Get Moodle credentials' })
  @ApiQuery({ name: 'name', description: 'Connection name', required: true })
  @ApiResponse({
    status: 200,
    description: 'Moodle credentials retrieved successfully',
  })
  async getMoodleCredentials(
    @UserDecor() user: UserPayload,
    @Query('name') name: string,
  ) {
    try {
      const credentials = await this.connectionService.getMoodleCredentials(user.id, name);
      return credentials;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: error.message || 'Failed to get Moodle credentials',
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }
  }
}
