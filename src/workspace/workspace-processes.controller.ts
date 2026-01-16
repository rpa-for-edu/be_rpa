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
import { WorkspaceProcessesService } from 'src/workspace/workspace-processes.service';
import { UserDecor } from 'src/common/decorators/user.decorator';
import { UserPayload } from 'src/auth/strategy/jwt.strategy';
import { ResponseUtil } from 'src/common/utils/response.util';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { CreateProcessDto } from 'src/processes/dto/create-process.dto';
import { UpdateProcessDto } from 'src/processes/dto/update-process.dto';
import { SaveProcessDto } from 'src/processes/dto/save-process.dto';

@Controller('workspace/:workspaceId/processes')
@ApiTags('workspace-processes')
@ApiBearerAuth()
export class WorkspaceProcessesController {
  constructor(private readonly workspaceProcessesService: WorkspaceProcessesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all processes in workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiQuery({ name: 'limit', required: true, type: 'number' })
  @ApiQuery({ name: 'page', required: true, type: 'number' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getProcesses(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
    @Query('limit', ParseIntPipe) limit: number,
    @Query('page', ParseIntPipe) page: number,
  ): Promise<ApiResponseDto<any[]>> {
    const data = await this.workspaceProcessesService.getProcesses(
      workspaceId,
      user.id,
      limit,
      page,
    );
    return ResponseUtil.success(data, 'Processes retrieved successfully');
  }

  @Get('count')
  @ApiOperation({ summary: 'Get process count in workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getProcessCount(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<{ count: number }>> {
    const count = await this.workspaceProcessesService.getProcessCount(workspaceId, user.id);
    return ResponseUtil.success({ count }, 'Process count retrieved successfully');
  }

  @Get(':processId')
  @ApiOperation({ summary: 'Get process by ID' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'processId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getProcess(
    @Param('workspaceId') workspaceId: string,
    @Param('processId') processId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceProcessesService.getProcess(workspaceId, processId, user.id);
    return ResponseUtil.success(data, 'Process retrieved successfully');
  }

  @Post()
  @ApiOperation({ summary: 'Create process in workspace' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiCreatedResponse({ type: ApiResponseDto })
  async createProcess(
    @Param('workspaceId') workspaceId: string,
    @UserDecor() user: UserPayload,
    @Body() createProcessDto: CreateProcessDto,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceProcessesService.createProcess(
      workspaceId,
      user.id,
      createProcessDto,
    );
    return ResponseUtil.created(data, 'Process created successfully');
  }

  @Put(':processId')
  @ApiOperation({ summary: 'Update process' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'processId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async updateProcess(
    @Param('workspaceId') workspaceId: string,
    @Param('processId') processId: string,
    @UserDecor() user: UserPayload,
    @Body() updateProcessDto: UpdateProcessDto,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceProcessesService.updateProcess(
      workspaceId,
      processId,
      user.id,
      updateProcessDto,
    );
    return ResponseUtil.updated(data, 'Process updated successfully');
  }

  @Delete(':processId')
  @ApiOperation({ summary: 'Delete process' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'processId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async deleteProcess(
    @Param('workspaceId') workspaceId: string,
    @Param('processId') processId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<null>> {
    await this.workspaceProcessesService.deleteProcess(workspaceId, processId, user.id);
    return ResponseUtil.deleted('Process deleted successfully');
  }

  @Put(':processId/save')
  @ApiOperation({ summary: 'Save process (update XML and variables)' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'processId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async saveProcess(
    @Param('workspaceId') workspaceId: string,
    @Param('processId') processId: string,
    @UserDecor() user: UserPayload,
    @Body() saveProcessDto: SaveProcessDto,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceProcessesService.saveProcess(
      workspaceId,
      processId,
      user.id,
      saveProcessDto,
    );
    return ResponseUtil.updated(data, 'Process saved successfully');
  }

  @Post(':processId/share')
  @ApiOperation({ summary: 'Share process with users' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'processId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async shareProcess(
    @Param('workspaceId') workspaceId: string,
    @Param('processId') processId: string,
    @UserDecor() user: UserPayload,
    @Body('emails') emails: string[],
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceProcessesService.shareProcess(
      workspaceId,
      processId,
      user.id,
      emails,
    );
    return ResponseUtil.success(data, 'Process shared successfully');
  }

  @Get(':processId/shared')
  @ApiOperation({ summary: 'Get shared users of process' })
  @ApiParam({ name: 'workspaceId', type: 'string' })
  @ApiParam({ name: 'processId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto })
  async getSharedUsers(
    @Param('workspaceId') workspaceId: string,
    @Param('processId') processId: string,
    @UserDecor() user: UserPayload,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.workspaceProcessesService.getSharedUsers(
      workspaceId,
      processId,
      user.id,
    );
    return ResponseUtil.success(data, 'Shared users retrieved successfully');
  }
}
