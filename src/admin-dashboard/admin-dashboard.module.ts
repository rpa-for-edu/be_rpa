import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { Robot } from '../robot/entity/robot.entity';
import { Process } from '../processes/entity/process.entity';
import { Workspace } from '../workspace/entity/workspace.entity';
import { User } from '../users/entity/user.entity';
import { RobotReportModule } from '../robot-report/robot-report.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Robot, Process, Workspace, User]),
    RobotReportModule,
  ],
  providers: [AdminDashboardService],
  controllers: [AdminDashboardController],
})
export class AdminDashboardModule {}
