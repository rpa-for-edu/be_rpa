import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
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
import { TeamProcessesService } from './team-processes.service';
import { UserDecor } from 'src/common/decorators/user.decorator';
import { UserPayload } from 'src/auth/strategy/jwt.strategy';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { ResponseUtil } from 'src/common/utils/response.util';

@Controller('team/:teamId/processes')
@ApiTags('team-processes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class TeamProcessesController {
  constructor(private readonly teamProcessesService: TeamProcessesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all processes in team' })
  @ApiParam({ name: 'teamId', type: 'string', description: 'Team ID' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getProcesses(
    @Param('teamId') teamId: string,
    @UserDecor() user: UserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.teamProcessesService.getProcesses(teamId, user.id, { page, limit });
    return ResponseUtil.success(data, 'Processes retrieved successfully');
  }

  @Get(':processId')
  @ApiOperation({ summary: 'Get process by ID' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiParam({ name: 'processId', type: 'string' })
  async getProcess(
    @Param('teamId') teamId: string,
    @Param('processId') processId: string,
    @UserDecor() user: UserPayload,
  ) {
    return await this.teamProcessesService.getProcess(teamId, processId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create process in team' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiCreatedResponse({ type: ApiResponseDto })
  async createProcess(
    @Param('teamId') teamId: string,
    @UserDecor() user: UserPayload,
    @Body() createProcessDto: any,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.teamProcessesService.createProcess(teamId, user.id, createProcessDto);
    return ResponseUtil.created(data, 'Process created successfully');
  }

  @Put(':processId')
  @ApiOperation({ summary: 'Update process' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiParam({ name: 'processId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async updateProcess(
    @Param('teamId') teamId: string,
    @Param('processId') processId: string,
    @UserDecor() user: UserPayload,
    @Body() updateProcessDto: any,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.teamProcessesService.updateProcess(
      teamId,
      processId,
      user.id,
      updateProcessDto,
    );
    return ResponseUtil.updated(data, 'Process updated successfully');
  }

  @Delete(':processId')
  @ApiOperation({ summary: 'Delete process' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiParam({ name: 'processId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async deleteProcess(
    @Param('teamId') teamId: string,
    @Param('processId') processId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<null>> {
    await this.teamProcessesService.deleteProcess(teamId, processId, user.id);
    return ResponseUtil.deleted('Process deleted successfully');
  }
}
