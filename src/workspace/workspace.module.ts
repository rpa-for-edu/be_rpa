import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { WorkspaceProcessesController } from './workspace-processes.controller';
import { WorkspaceProcessesService } from './workspace-processes.service';
import { WorkspaceRobotsController } from './workspace-robots.controller';
import { WorkspaceRobotsService } from './workspace-robots.service';
import { WorkspaceConnectionsController } from './workspace-connections.controller';
import { WorkspaceConnectionsService } from './workspace-connections.service';
import { TeamProcessesController } from './team-processes.controller';
import { TeamProcessesService } from './team-processes.service';
import { TeamRobotsController } from './team-robots.controller';
import { TeamRobotsService } from './team-robots.service';
import { TeamConnectionsController } from './team-connections.controller';
import { TeamConnectionsService } from './team-connections.service';
import { TeamPermissionService } from './team-permission.service';
// import { WorkspaceCollaborationGateway } from './workspace-collaboration.gateway';
import {
  Workspace,
  Team,
  Role,
  Permission,
  WorkspaceMember,
  TeamMember,
  TeamInvitation,
  WorkspaceInvitation,
  WorkspaceConnection,
} from './entity';
import { NotificationModule } from 'src/notification/notification.module';
import {
  ActivityTemplate,
  ActivityPackage,
  ActivityPackageAccess,
  Argument,
  ReturnValue,
} from 'src/activity-packages/entity';
import { Process } from 'src/processes/entity/process.entity';
import { ProcessVersion } from 'src/processes/entity/processVersions.entity';
import { ProcessDetail, ProcessDetailSchema } from 'src/processes/schema/process.schema';
import { Robot } from 'src/robot/entity/robot.entity';
import { RobotConnection } from 'src/connection/entity/robot_connection.entity';
import { UsersModule } from 'src/users/users.module';
import { ConnectionModule } from 'src/connection/connection.module';
import { GoogleModule } from 'src/google/google.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      Team,
      Role,
      Permission,
      WorkspaceMember,
      TeamMember,
      TeamInvitation,
      WorkspaceInvitation,
      WorkspaceConnection,
      ActivityTemplate,
      ActivityPackage,
      ActivityPackageAccess,
      Argument,
      ReturnValue,
      Process,
      ProcessVersion,
      Robot,
      RobotConnection,
    ]),
    MongooseModule.forFeature([{ name: ProcessDetail.name, schema: ProcessDetailSchema }]),
    NotificationModule,
    UsersModule,
    ConnectionModule,
    GoogleModule,
  ],
  controllers: [
    WorkspaceController,
    WorkspaceProcessesController,
    WorkspaceRobotsController,
    WorkspaceConnectionsController,
    TeamProcessesController,
    TeamRobotsController,
    TeamConnectionsController,
  ],
  providers: [
    WorkspaceService,
    WorkspaceProcessesService,
    WorkspaceRobotsService,
    WorkspaceConnectionsService,
    TeamProcessesService,
    TeamRobotsService,
    TeamConnectionsService,
    TeamPermissionService,
    // WorkspaceCollaborationGateway,
  ],
  exports: [WorkspaceService, WorkspaceConnectionsService, TypeOrmModule],
})
export class WorkspaceModule {}

