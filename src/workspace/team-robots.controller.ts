import {
  Controller,
  Get,
  Post,
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
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TeamRobotsService } from './team-robots.service';
import { UserDecor } from 'src/common/decorators/user.decorator';
import { UserPayload } from 'src/auth/strategy/jwt.strategy';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { ResponseUtil } from 'src/common/utils/response.util';

@Controller('team/:teamId/robots')
@ApiTags('team-robots')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class TeamRobotsController {
  constructor(private readonly teamRobotsService: TeamRobotsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all robots in team' })
  @ApiParam({ name: 'teamId', type: 'string', description: 'Team ID' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getRobots(
    @Param('teamId') teamId: string,
    @UserDecor() user: UserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.teamRobotsService.getRobots(
      teamId,
      user.id,
      { page, limit },
    );
    return ResponseUtil.success(data, 'Robots retrieved successfully');
  }

  @Get(':robotKey')
  @ApiOperation({ summary: 'Get robot by key' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getRobot(
    @Param('teamId') teamId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.teamRobotsService.getRobot(
      teamId,
      robotKey,
      user.id,
    );
    return ResponseUtil.success(data, 'Robot retrieved successfully');
  }

  @Post()
  @ApiOperation({ summary: 'Create robot in team' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiCreatedResponse({ type: ApiResponseDto })
  async createRobot(
    @Param('teamId') teamId: string,
    @UserDecor() user: UserPayload,
    @Body() createRobotDto: any,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.teamRobotsService.createRobot(
      teamId,
      user.id,
      createRobotDto,
    );
    return ResponseUtil.created(data, 'Robot created successfully');
  }

  @Delete(':robotKey')
  @ApiOperation({ summary: 'Delete robot' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async deleteRobot(
    @Param('teamId') teamId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<null>> {
    await this.teamRobotsService.deleteRobot(teamId, robotKey, user.id);
    return ResponseUtil.deleted('Robot deleted successfully');
  }

  @Post(':robotKey/validate')
  @ApiOperation({ 
    summary: 'Validate robot action',
    description: 'Check if user has permission to perform an action (run/delete) on this robot'
  })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiQuery({ 
    name: 'action', 
    required: false, 
    enum: ['run', 'delete'],
    description: 'Action to validate (default: run)'
  })
  @ApiOkResponse({ 
    type: ApiResponseDto,
    description: 'Returns validation result with isValid flag and any errors'
  })
  async validateRobot(
    @Param('teamId') teamId: string,
    @Param('robotKey') robotKey: string,
    @Query('action') action: 'run' | 'delete' = 'run',
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.teamRobotsService.validateRobot(
      teamId,
      robotKey,
      user.id,
      action,
    );
    return ResponseUtil.success(data, 'Robot validation completed');
  }

  @Get(':robotKey/connections')
  @ApiOperation({ summary: 'Get robot connections' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getRobotConnections(
    @Param('teamId') teamId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.teamRobotsService.getRobotConnections(
      teamId,
      robotKey,
      user.id,
    );
    return ResponseUtil.success(data, 'Robot connections retrieved successfully');
  }
}
