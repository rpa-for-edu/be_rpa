import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import {
  Workspace,
  Team,
  Role,
  Permission,
  WorkspaceMember,
  TeamMember,
  TeamInvitation,
  WorkspaceInvitation,
} from './entity';
import { NotificationModule } from 'src/notification/notification.module';
import {
  ActivityTemplate,
  ActivityPackage,
  ActivityPackageAccess,
  Argument,
  ReturnValue,
} from 'src/activity-packages/entity';

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
      ActivityTemplate,
      ActivityPackage,
      ActivityPackageAccess,
      Argument,
      ReturnValue,
    ]),
    NotificationModule,
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService, TypeOrmModule],
})
export class WorkspaceModule {}
