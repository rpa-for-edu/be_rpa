import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
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
import { WorkspaceRobotsService } from 'src/workspace/workspace-robots.service';
import { UserDecor } from 'src/common/decorators/user.decorator';
import { UserPayload } from 'src/auth/strategy/jwt.strategy';
import { ResponseUtil } from 'src/common/utils/response.util';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { CreateRobotDtoV2 } from 'src/robot/dto/create-robot-v2.dto';

@Controller('workspace/:workspaceId/robots')
@ApiTags('workspace-robots')
@ApiBearerAuth()
export class WorkspaceRobotsController {
  constructor(private readonly workspaceRobotsService: WorkspaceRobotsService) {}

  @Get()
  @ApiOperation({ summary: 'Get robots in workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiQuery({ name: 'limit', required: true, type: 'number' })
  @ApiQuery({ name: 'page', required: true, type: 'number' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getRobots(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('page', ParseIntPipe) page: number,
  ): Promise<ApiResponseDto<any[]>> {
    const data = await this.workspaceRobotsService.getRobots(workspaceId, user.id, limit, page);
    return ResponseUtil.success(data, 'Robots retrieved successfully');
  }

  @Get('count')
  @ApiOperation({ summary: 'Get robot count in workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getRobotCount(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<{ count: number }>> {
    const count = await this.workspaceRobotsService.getRobotCount(workspaceId, user.id);
    return ResponseUtil.success({ count }, 'Robot count retrieved successfully');
  }

  @Get(':robotKey')
  @ApiOperation({ summary: 'Get robot by key' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getRobot(
    @Param('workspaceId') workspaceId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceRobotsService.getRobot(workspaceId, robotKey, user.id);
    return ResponseUtil.success(data, 'Robot retrieved successfully');
  }

  @Post()
  @ApiOperation({ summary: 'Create robot in workspace (publish process)' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiCreatedResponse({ type: ApiResponseDto })
  async createRobot(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
    @Body() createRobotDto: CreateRobotDtoV2,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceRobotsService.createRobot(
      workspaceId,
      user.id,
      createRobotDto,
    );
    return ResponseUtil.created(data, 'Robot created successfully');
  }

  @Put(':robotKey')
  @ApiOperation({ summary: 'Update robot' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async updateRobot(
    @Param('workspaceId') workspaceId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
    @Body() updateRobotDto: any,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceRobotsService.updateRobot(
      workspaceId,
      robotKey,
      user.id,
      updateRobotDto,
    );
    return ResponseUtil.updated(data, 'Robot updated successfully');
  }

  @Delete(':robotKey')
  @ApiOperation({ summary: 'Delete robot' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async deleteRobot(
    @Param('workspaceId') workspaceId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<any>> {
    await this.workspaceRobotsService.deleteRobot(workspaceId, robotKey, user.id);
    return ResponseUtil.deleted('Robot deleted successfully');
  }

  @Post(':robotKey/run')
  @ApiOperation({ summary: 'Run robot (manual trigger)' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async runRobot(
    @Param('workspaceId') workspaceId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
    @Body() runParams: any,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceRobotsService.runRobot(
      workspaceId,
      robotKey,
      user.id,
      runParams,
    );
    return ResponseUtil.success(data, 'Robot started successfully');
  }

  @Post(':robotKey/stop')
  @ApiOperation({ summary: 'Stop robot' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async stopRobot(
    @Param('workspaceId') workspaceId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceRobotsService.stopRobot(workspaceId, robotKey, user.id);
    return ResponseUtil.success(data, 'Robot stopped successfully');
  }

  @Get(':robotKey/logs')
  @ApiOperation({ summary: 'Get robot logs' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiQuery({ name: 'logGroup', required: true, type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiQuery({ name: 'startTime', required: false, type: 'number' })
  @ApiQuery({ name: 'endTime', required: false, type: 'number' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getRobotLogs(
    @Param('workspaceId') workspaceId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
    @Query('logGroup') logGroup: string,
    @Query('limit') limit?: number,
    @Query('startTime') startTime?: number,
    @Query('endTime') endTime?: number,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceRobotsService.getRobotLogs(
      workspaceId,
      robotKey,
      user.id,
      logGroup,
      { limit, startTime, endTime },
    );
    return ResponseUtil.success(data, 'Robot logs retrieved successfully');
  }

  @Get(':robotKey/schedule')
  @ApiOperation({ summary: 'Get robot schedule' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getRobotSchedule(
    @Param('workspaceId') workspaceId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceRobotsService.getRobotSchedule(
      workspaceId,
      robotKey,
      user.id,
    );
    return ResponseUtil.success(data, 'Robot schedule retrieved successfully');
  }

  @Post(':robotKey/schedule')
  @ApiOperation({ summary: 'Create/Update robot schedule' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async createOrUpdateSchedule(
    @Param('workspaceId') workspaceId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
    @Body() scheduleDto: any,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceRobotsService.createOrUpdateSchedule(
      workspaceId,
      robotKey,
      user.id,
      scheduleDto,
    );
    return ResponseUtil.success(data, 'Schedule created/updated successfully');
  }

  @Delete(':robotKey/schedule')
  @ApiOperation({ summary: 'Delete robot schedule' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async deleteSchedule(
    @Param('workspaceId') workspaceId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceRobotsService.deleteSchedule(workspaceId, robotKey, user.id);
    return ResponseUtil.deleted('Schedule deleted successfully');
  }

  @Get(':robotKey/connections')
  @ApiOperation({ summary: 'Get robot connections' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'robotKey', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getRobotConnections(
    @Param('workspaceId') workspaceId: string,
    @Param('robotKey') robotKey: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceRobotsService.getRobotConnections(
      workspaceId,
      robotKey,
      user.id,
    );
    return ResponseUtil.success(data, 'Robot connections retrieved successfully');
  }
}
