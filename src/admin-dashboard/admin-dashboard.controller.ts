import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminGuard } from '../auth/guard/admin.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardQueryDto } from '../robot-report/dto/dashboard-query.dto';
import { WorkspaceDashboardQueryDto } from '../robot-report/dto/workspace-dashboard-query.dto';

@ApiTags('admin/dashboard')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('processes/count')
  async getProcessesCount() {
    const count = await this.adminDashboardService.getProcessesCount();
    return count;
  }

  @Get('robots/count')
  async getRobotsCount() {
    const count = await this.adminDashboardService.getRobotsCount();
    return count;
  }

  @Get('workspaces/count')
  async getWorkspacesCount() {
    const count = await this.adminDashboardService.getWorkspacesCount();
    return count;
  }

  @Get('users/count')
  async getUsersCount() {
    const count = await this.adminDashboardService.getUsersCount();
    return count;
  }

  @Get('all-statuses')
  async getAllStatuses() {
    return this.adminDashboardService.getAllStatuses();
  }

  @Get('jobs-history')
  async getJobsHistory(@Query() query: DashboardQueryDto) {
    return this.adminDashboardService.getJobsHistory(query.date);
  }

  @Get('transactions')
  async getTransactions(@Query() query: WorkspaceDashboardQueryDto) {
    return this.adminDashboardService.getTransactions(query.date, query.granularity);
  }

  @Get('recent-activities')
  async getRecentActivities() {
    return this.adminDashboardService.getRecentActivities();
  }
}
