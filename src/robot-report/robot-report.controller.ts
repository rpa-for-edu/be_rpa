import { Controller, Get, Param, Query } from '@nestjs/common';
import { RobotReportService } from './robot-report.service';
import { UserDecor } from 'src/common/decorators/user.decorator';
import { UserPayload } from 'src/auth/strategy/jwt.strategy';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { WorkspaceDashboardQueryDto } from './dto/workspace-dashboard-query.dto';
import { AllStatusesResponseDto } from './dto/all-statuses-response.dto';
import { JobsHistoryResponseDto } from './dto/jobs-history-response.dto';
import { TransactionsResponseDto } from './dto/transactions-response.dto';

@Controller('robot-report')
@ApiTags('robot-report')
@ApiBearerAuth()
export class RobotReportController {
  constructor(private readonly robotRunDetailService: RobotReportService) {}

  // ─── Dashboard Endpoints (Personal) ──────────────────────────

  @Get('/dashboard/all-statuses')
  async getDashboardAllStatuses(
    @UserDecor() user: UserPayload,
  ): Promise<AllStatusesResponseDto> {
    return this.robotRunDetailService.getAllStatuses(user.id);
  }

  @Get('/dashboard/jobs-history')
  async getDashboardJobsHistory(
    @UserDecor() user: UserPayload,
    @Query() query: DashboardQueryDto,
  ): Promise<JobsHistoryResponseDto> {
    return this.robotRunDetailService.getDashboardJobsHistory(user.id, query.date);
  }

  @Get('/dashboard/transactions')
  async getDashboardTransactions(
    @UserDecor() user: UserPayload,
    @Query() query: DashboardQueryDto,
  ): Promise<TransactionsResponseDto> {
    return this.robotRunDetailService.getDashboardTransactions(user.id, query.date);
  }

  // ─── Dashboard Endpoints (Workspace) ─────────────────────────

  @Get('/dashboard/:workspaceId/all-statuses')
  async getWorkspaceDashboardAllStatuses(
    @Param('workspaceId') workspaceId: string,
  ): Promise<AllStatusesResponseDto> {
    return this.robotRunDetailService.getWorkspaceAllStatuses(workspaceId);
  }

  @Get('/dashboard/:workspaceId/jobs-history')
  async getWorkspaceDashboardJobsHistory(
    @Param('workspaceId') workspaceId: string,
    @Query() query: WorkspaceDashboardQueryDto,
  ): Promise<JobsHistoryResponseDto> {
    return this.robotRunDetailService.getWorkspaceDashboardJobsHistory(workspaceId, query.date);
  }

  @Get('/dashboard/:workspaceId/transactions')
  async getWorkspaceDashboardTransactions(
    @Param('workspaceId') workspaceId: string,
    @Query() query: WorkspaceDashboardQueryDto,
  ): Promise<TransactionsResponseDto> {
    return this.robotRunDetailService.getWorkspaceDashboardTransactions(
      workspaceId,
      query.date,
      query.granularity,
    );
  }

  // ─── Existing Endpoints ──────────────────────────────────

  @Get('/detail')
  async fetchRobotRunDetails(
    @UserDecor() user: UserPayload,
    @Query('streamID') streamID: string,
    @Query('processID') processID: string,
    @Query('version') version: number,
  ) {
    return this.robotRunDetailService.getRobotRunDetailCommands(
      streamID,
      user.id,
      processID,
      version,
    );
  }

  @Get('/overall')
  async fetchRobotRunOverall(
    @UserDecor() user: UserPayload,
    @Query('processID') processID: string,
    @Query('version') version: number,
    @Query('date') date?: string,
    @Query('passed') passed?: number,
  ) {
    return this.robotRunDetailService.getRobotRunTimeOverall(
      processID,
      user.id,
      version,
      passed,
      date,
    );
  }

  @Get('/overall/average')
  async fetchRobotRunDetailAverage(
    @UserDecor() user: UserPayload,
    @Query('processID') processID: string,
    @Query('version') version: number,
    @Query('date') date?: string,
    @Query('passed') passed?: number,
  ) {
    return this.robotRunDetailService.getAverageExecutionTime(
      processID,
      user.id,
      version,
      passed,
      date,
    );
  }

  @Get('/overall/group-passed')
  async fetchRobotRunDetailStatisticPassed(
    @UserDecor() user: UserPayload,
    @Query('processID') processID: string,
    @Query('version') version: number,
    @Query('date') date?: string,
  ) {
    return this.robotRunDetailService.getCountsGroupedByPassed(processID, user.id, version, date);
  }

  @Get('/overall/failures')
  async fetchRobotRunDetailFailures(
    @UserDecor() user: UserPayload,
    @Query('processID') processID: string,
    @Query('version') version: number,
    @Query('date') date?: string,
  ) {
    return this.robotRunDetailService.getFailedExecution(processID, user.id, version, date);
  }

  @Get('/overall/group-error')
  async fetchRobotRunDetailStatisticError(
    @UserDecor() user: UserPayload,
    @Query('processID') processID: string,
    @Query('version') version: number,
    @Query('date') date?: string,
  ) {
    return this.robotRunDetailService.getCountsGroupedByError(processID, user.id, version, date);
  }
}
