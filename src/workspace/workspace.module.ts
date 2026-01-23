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
  ],
  providers: [
    WorkspaceService,
    WorkspaceProcessesService,
    WorkspaceRobotsService,
    WorkspaceConnectionsService,
    // WorkspaceCollaborationGateway,
  ],
  exports: [WorkspaceService, WorkspaceConnectionsService, TypeOrmModule],
})
export class WorkspaceModule {}

