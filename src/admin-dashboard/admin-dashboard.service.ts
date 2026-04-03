import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Process } from '../processes/entity/process.entity';
import { Robot } from '../robot/entity/robot.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { User } from '../users/entity/user.entity';
import { RobotReportService } from '../robot-report/robot-report.service';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Process)
    private readonly processRepository: Repository<Process>,
    @InjectRepository(Robot)
    private readonly robotRepository: Repository<Robot>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly robotReportService: RobotReportService,
  ) {}

  async getProcessesCount(): Promise<number> {
    return this.processRepository.count();
  }

  async getRobotsCount(): Promise<number> {
    return this.robotRepository.count();
  }

  async getWorkspacesCount(): Promise<number> {
    return this.workspaceRepository.count();
  }

  async getUsersCount(): Promise<number> {
    return this.userRepository.count();
  }

  async getAllStatuses() {
    return this.robotReportService.getSystemAllStatuses();
  }

  async getJobsHistory(date?: string) {
    return this.robotReportService.getSystemDashboardJobsHistory(date);
  }

  async getTransactions(date?: string, granularity?: string) {
    return this.robotReportService.getSystemDashboardTransactions(date, granularity);
  }

  async getRecentActivities() {
    return this.robotReportService.getSystemRecentActivities();
  }
}
