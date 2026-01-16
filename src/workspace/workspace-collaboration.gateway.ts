import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './entity/workspace.entity';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { Process } from 'src/processes/entity/process.entity';

interface UserInfo {
  userId: number;
  userName: string;
  userEmail: string;
  userAvatar?: string;
}

interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
}

interface ActiveUser extends UserInfo {
  socketId: string;
  cursor?: CursorPosition;
  isEditing: boolean;
  lastActivity: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
  namespace: '/workspace-collaboration',
})
export class WorkspaceCollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WorkspaceCollaborationGateway');

  // Track active users per process
  // Key: processId, Value: Map of socketId -> ActiveUser
  private activeUsers = new Map<string, Map<string, ActiveUser>>();

  // Track process locks
  // Key: processId, Value: userId who has the lock
  private processLocks = new Map<string, number>();

  constructor(
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(Process)
    private processRepository: Repository<Process>,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove user from all processes they were in
    for (const [processId, users] of this.activeUsers.entries()) {
      if (users.has(client.id)) {
        const user = users.get(client.id);
        users.delete(client.id);

        // Release lock if user had it
        if (this.processLocks.get(processId) === user.userId) {
          this.processLocks.delete(processId);
          this.server.to(`process:${processId}`).emit('lock-released', {
            processId,
            userId: user.userId,
          });
        }

        // Notify others
        this.server.to(`process:${processId}`).emit('user-left', {
          userId: user.userId,
          userName: user.userName,
          activeUsers: Array.from(users.values()).map((u) => ({
            userId: u.userId,
            userName: u.userName,
            userEmail: u.userEmail,
            userAvatar: u.userAvatar,
            isEditing: u.isEditing,
            cursor: u.cursor,
          })),
        });

        // Clean up empty process rooms
        if (users.size === 0) {
          this.activeUsers.delete(processId);
        }
      }
    }
  }

  @SubscribeMessage('join-process')
  async handleJoinProcess(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      workspaceId: string;
      processId: string;
      userId: number;
      userName: string;
      userEmail: string;
      userAvatar?: string;
    },
  ) {
    const { workspaceId, processId, userId, userName, userEmail, userAvatar } = data;

    try {
      // Verify workspace access
      const workspace = await this.workspaceRepository.findOne({
        where: { id: workspaceId },
      });

      if (!workspace) {
        client.emit('error', { message: 'Workspace not found' });
        return;
      }

      // Check if user is workspace owner or member
      const isOwner = workspace.ownerId === userId;
      const isMember = await this.workspaceMemberRepository.findOne({
        where: { workspaceId, userId },
      });

      if (!isOwner && !isMember) {
        client.emit('error', { message: 'Access denied to workspace' });
        return;
      }

      // Verify process exists in workspace
      const process = await this.processRepository.findOne({
        where: { id: processId, workspaceId },
      });

      if (!process) {
        client.emit('error', { message: 'Process not found in workspace' });
        return;
      }

      // Join the process room
      client.join(`process:${processId}`);

      // Add user to active users
      if (!this.activeUsers.has(processId)) {
        this.activeUsers.set(processId, new Map());
      }

      const processUsers = this.activeUsers.get(processId);
      const activeUser: ActiveUser = {
        socketId: client.id,
        userId,
        userName,
        userEmail,
        userAvatar,
        isEditing: false,
        lastActivity: new Date(),
      };

      processUsers.set(client.id, activeUser);

      // Get current lock status
      const lockHolder = this.processLocks.get(processId);

      // Send current state to the joining user
      client.emit('joined-process', {
        processId,
        activeUsers: Array.from(processUsers.values()).map((u) => ({
          userId: u.userId,
          userName: u.userName,
          userEmail: u.userEmail,
          userAvatar: u.userAvatar,
          isEditing: u.isEditing,
          cursor: u.cursor,
        })),
        lockHolder,
      });

      // Notify others about the new user
      client.to(`process:${processId}`).emit('user-joined', {
        userId,
        userName,
        userEmail,
        userAvatar,
        activeUsers: Array.from(processUsers.values()).map((u) => ({
          userId: u.userId,
          userName: u.userName,
          userEmail: u.userEmail,
          userAvatar: u.userAvatar,
          isEditing: u.isEditing,
          cursor: u.cursor,
        })),
      });

      this.logger.log(
        `User ${userName} (${userId}) joined process ${processId} in workspace ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error('Error in join-process:', error);
      client.emit('error', { message: 'Failed to join process' });
    }
  }

  @SubscribeMessage('leave-process')
  async handleLeaveProcess(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { processId: string },
  ) {
    const { processId } = data;

    const processUsers = this.activeUsers.get(processId);
    if (!processUsers || !processUsers.has(client.id)) {
      return;
    }

    const user = processUsers.get(client.id);
    processUsers.delete(client.id);

    // Release lock if user had it
    if (this.processLocks.get(processId) === user.userId) {
      this.processLocks.delete(processId);
      this.server.to(`process:${processId}`).emit('lock-released', {
        processId,
        userId: user.userId,
      });
    }

    // Leave the room
    client.leave(`process:${processId}`);

    // Notify others
    this.server.to(`process:${processId}`).emit('user-left', {
      userId: user.userId,
      userName: user.userName,
      activeUsers: Array.from(processUsers.values()).map((u) => ({
        userId: u.userId,
        userName: u.userName,
        userEmail: u.userEmail,
        userAvatar: u.userAvatar,
        isEditing: u.isEditing,
        cursor: u.cursor,
      })),
    });

    // Clean up empty process rooms
    if (processUsers.size === 0) {
      this.activeUsers.delete(processId);
    }

    this.logger.log(`User ${user.userName} left process ${processId}`);
  }

  @SubscribeMessage('cursor-move')
  async handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { processId: string; cursor: CursorPosition },
  ) {
    const { processId, cursor } = data;

    const processUsers = this.activeUsers.get(processId);
    if (!processUsers || !processUsers.has(client.id)) {
      return;
    }

    const user = processUsers.get(client.id);
    user.cursor = cursor;
    user.lastActivity = new Date();

    // Broadcast cursor position to others
    client.to(`process:${processId}`).emit('cursor-moved', {
      userId: user.userId,
      userName: user.userName,
      cursor,
    });
  }

  @SubscribeMessage('editing-status')
  async handleEditingStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { processId: string; isEditing: boolean },
  ) {
    const { processId, isEditing } = data;

    const processUsers = this.activeUsers.get(processId);
    if (!processUsers || !processUsers.has(client.id)) {
      return;
    }

    const user = processUsers.get(client.id);
    user.isEditing = isEditing;
    user.lastActivity = new Date();

    // Broadcast editing status to others
    client.to(`process:${processId}`).emit('editing-status-changed', {
      userId: user.userId,
      userName: user.userName,
      isEditing,
    });
  }

  @SubscribeMessage('request-lock')
  async handleRequestLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { processId: string },
  ) {
    const { processId } = data;

    const processUsers = this.activeUsers.get(processId);
    if (!processUsers || !processUsers.has(client.id)) {
      client.emit('lock-denied', { message: 'Not in process room' });
      return;
    }

    const user = processUsers.get(client.id);
    const currentLockHolder = this.processLocks.get(processId);

    if (currentLockHolder && currentLockHolder !== user.userId) {
      client.emit('lock-denied', {
        message: 'Process is locked by another user',
        lockHolder: currentLockHolder,
      });
      return;
    }

    // Grant lock
    this.processLocks.set(processId, user.userId);

    client.emit('lock-granted', {
      processId,
      userId: user.userId,
    });

    // Notify others
    client.to(`process:${processId}`).emit('process-locked', {
      processId,
      userId: user.userId,
      userName: user.userName,
    });

    this.logger.log(`Lock granted to user ${user.userName} for process ${processId}`);
  }

  @SubscribeMessage('release-lock')
  async handleReleaseLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { processId: string },
  ) {
    const { processId } = data;

    const processUsers = this.activeUsers.get(processId);
    if (!processUsers || !processUsers.has(client.id)) {
      return;
    }

    const user = processUsers.get(client.id);
    const currentLockHolder = this.processLocks.get(processId);

    if (currentLockHolder === user.userId) {
      this.processLocks.delete(processId);

      client.emit('lock-released', {
        processId,
        userId: user.userId,
      });

      // Notify others
      this.server.to(`process:${processId}`).emit('lock-released', {
        processId,
        userId: user.userId,
      });

      this.logger.log(`Lock released by user ${user.userName} for process ${processId}`);
    }
  }

  @SubscribeMessage('process-update')
  async handleProcessUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      processId: string;
      update: any;
      version: number;
    },
  ) {
    const { processId, update, version } = data;

    const processUsers = this.activeUsers.get(processId);
    if (!processUsers || !processUsers.has(client.id)) {
      return;
    }

    const user = processUsers.get(client.id);

    // Verify user has the lock
    const currentLockHolder = this.processLocks.get(processId);
    if (currentLockHolder !== user.userId) {
      client.emit('update-denied', {
        message: 'You must have the lock to update the process',
      });
      return;
    }

    // Broadcast update to others
    client.to(`process:${processId}`).emit('process-updated', {
      processId,
      update,
      version,
      userId: user.userId,
      userName: user.userName,
    });

    this.logger.log(`Process ${processId} updated by user ${user.userName}`);
  }

  @SubscribeMessage('ping')
  async handlePing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { processId: string },
  ) {
    const { processId } = data;

    const processUsers = this.activeUsers.get(processId);
    if (processUsers && processUsers.has(client.id)) {
      const user = processUsers.get(client.id);
      user.lastActivity = new Date();
    }

    client.emit('pong', { timestamp: Date.now() });
  }
}
