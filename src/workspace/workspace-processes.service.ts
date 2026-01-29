import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { Process, ProcessScope } from 'src/processes/entity/process.entity';
import { ProcessDetail } from 'src/processes/schema/process.schema';
import { ProcessVersion } from 'src/processes/entity/processVersions.entity';
import { Workspace } from './entity/workspace.entity';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { CreateProcessDto } from 'src/processes/dto/create-process.dto';
import { UpdateProcessDto } from 'src/processes/dto/update-process.dto';
import { SaveProcessDto } from 'src/processes/dto/save-process.dto';
import { UsersService } from 'src/users/users.service';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/entity/notification.entity';
import {
  ProcessNotFoundException,
  UnableToCreateProcessException,
  UserNotFoundException,
} from 'src/common/exceptions';

@Injectable()
export class WorkspaceProcessesService {
  constructor(
    @InjectRepository(Process)
    private processRepository: Repository<Process>,
    @InjectRepository(ProcessVersion)
    private processVersionRepository: Repository<ProcessVersion>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectModel(ProcessDetail.name)
    private processDetailModel: Model<ProcessDetail>,
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Verify user has access to workspace
   */
  private async verifyWorkspaceAccess(workspaceId: string, userId: number): Promise<void> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user is owner or member
    const isOwner = workspace.ownerId === userId;
    const isMember = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
    });

    if (!isOwner && !isMember) {
      throw new ForbiddenException("You don't have permission to access this workspace");
    }
  }

  /**
   * Get all processes in workspace with pagination
   */
  async getProcesses(
    workspaceId: string,
    userId: number,
    limit: number,
    page: number,
  ): Promise<any[]> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    return this.processRepository
      .createQueryBuilder('process')
      .leftJoinAndSelect('process.user', 'user')
      .leftJoinAndSelect('process.sharedByUser', 'sharedByUser')
      .where('process.workspaceId = :workspaceId', { workspaceId })
      .andWhere('process.teamId IS NULL')
      .orderBy('process.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
  }

  /**
   * Get process count in workspace
   */
  async getProcessCount(workspaceId: string, userId: number): Promise<number> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    return this.processRepository.count({
      where: {
        workspaceId,
        teamId: null,
      },
    });
  }

  /**
   * Get process by ID
   */
  async getProcess(workspaceId: string, processId: string, userId: number): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const process = await this.processRepository.findOne({
      where: { id: processId, workspaceId },
      relations: ['user', 'sharedByUser'],
    });

    if (!process) {
      throw new ProcessNotFoundException();
    }

    // Get process detail from MongoDB
    const processDetail = await this.processDetailModel
      .findById(`${process.userId}.${processId}.${process.version}`)
      .lean()
      .exec();

    return {
      ...process,
      xml: processDetail?.xml,
      variables: processDetail?.variables,
      activities: processDetail?.activities,
    };
  }

  /**
   * Create process in workspace
   */
  async createProcess(
    workspaceId: string,
    userId: number,
    createProcessDto: CreateProcessDto,
  ): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    // Create process entity
    const processEntity = await this.processRepository.save({
      ...createProcessDto,
      userId,
      workspaceId,
      scope: ProcessScope.WORKSPACE,
    });

    try {
      // Create initial version
      const processVersionEntity = await this.processVersionRepository.save({
        processId: processEntity.id,
        createdBy: userId,
        tag: 'Initial Version',
        vdescription: 'The first version of the process',
        updatedAt: new Date(),
        isCurrent: true,
        creator: { id: userId },
      });

      // Create process detail in MongoDB
      const processDetail = new this.processDetailModel({
        _id: `${userId}.${processEntity.id}.1`,
        processId: processEntity.id,
        versionId: processVersionEntity.id,
        xml: createProcessDto.xml,
        variables: {},
        activities: [],
      });

      await processDetail.save();

      // Update process version
      await this.processRepository.update(
        { id: processEntity.id, userId },
        { version: 1, updatedAt: new Date() },
      );

      return processEntity;
    } catch (error) {
      // Rollback on error
      await this.processRepository.delete({ id: processEntity.id, userId });
      throw new UnableToCreateProcessException();
    }
  }

  /**
   * Update process
   */
  async updateProcess(
    workspaceId: string,
    processId: string,
    userId: number,
    updateProcessDto: UpdateProcessDto,
  ): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const process = await this.processRepository.findOne({
      where: { id: processId, workspaceId },
    });

    if (!process) {
      throw new ProcessNotFoundException();
    }

    // Check if user is the owner
    if (process.userId !== userId) {
      throw new ForbiddenException('Only the process owner can update this process');
    }

    await this.processRepository.update(
      { id: processId, workspaceId },
      { ...updateProcessDto, updatedAt: new Date() },
    );

    return this.processRepository.findOne({
      where: { id: processId, workspaceId },
    });
  }

  /**
   * Delete process
   */
  async deleteProcess(workspaceId: string, processId: string, userId: number): Promise<void> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const process = await this.processRepository.findOne({
      where: { id: processId, workspaceId },
    });

    if (!process) {
      throw new ProcessNotFoundException();
    }

    // Check if user is the owner
    if (process.userId !== userId) {
      throw new ForbiddenException('Only the process owner can delete this process');
    }

    // Delete process detail from MongoDB
    await this.processDetailModel.deleteMany({
      processId: processId,
    });

    // Delete all versions
    await this.processVersionRepository.delete({ processId });

    // Delete process
    await this.processRepository.delete({ id: processId, workspaceId });
  }

  /**
   * Save process (update XML and variables)
   */
  async saveProcess(
    workspaceId: string,
    processId: string,
    userId: number,
    saveProcessDto: SaveProcessDto,
  ): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const process = await this.processRepository.findOne({
      where: { id: processId, workspaceId },
    });

    if (!process) {
      throw new ProcessNotFoundException();
    }

    // Check if user is the owner
    if (process.userId !== userId) {
      throw new ForbiddenException('Only the process owner can save this process');
    }

    // Update process detail in MongoDB
    await this.processDetailModel.updateOne(
      { _id: `${userId}.${processId}.${process.version}` },
      {
        ...saveProcessDto,
      },
    );

    // Update version timestamp
    await this.processVersionRepository.update(
      { processId: processId, isCurrent: true },
      { updatedAt: new Date() },
    );

    return {
      id: processId,
      ...saveProcessDto,
      updatedAt: new Date(),
    };
  }

  /**
   * Share process with users
   */
  async shareProcess(
    workspaceId: string,
    processId: string,
    userId: number,
    emails: string[],
  ): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const process = await this.processRepository.findOne({
      where: { id: processId, workspaceId },
      relations: ['user'],
    });

    if (!process) {
      throw new ProcessNotFoundException();
    }

    // Check if user is the owner
    if (process.userId !== userId) {
      throw new ForbiddenException('Only the process owner can share this process');
    }

    if (process.sharedByUserId) {
      throw new ForbiddenException('Cannot share a shared process');
    }

    const sharedWith = [];

    for (const email of emails) {
      try {
        const targetUser = await this.usersService.findOneByEmail(email);
        if (!targetUser) {
          sharedWith.push({ email, status: 'failed' });
          continue;
        }

        // Verify target user has access to workspace
        const isMember = await this.workspaceMemberRepository.findOne({
          where: { workspaceId, userId: targetUser.id },
        });

        const workspace = await this.workspaceRepository.findOne({
          where: { id: workspaceId },
        });

        if (!isMember && workspace.ownerId !== targetUser.id) {
          sharedWith.push({ email, status: 'failed' });
          continue;
        }

        // Create shared process
        await this.createSharedProcess(process, targetUser.id);

        // Send notification
        await this.notificationService.createNotification({
          title: 'Process has been shared with you',
          content: `Process ${process.name} has been shared with you by ${process.user.email}`,
          type: NotificationType.PROCESS_SHARED,
          userId: targetUser.id,
        });

        sharedWith.push({ email, status: 'sent' });
      } catch (error) {
        sharedWith.push({ email, status: 'failed' });
      }
    }

    return {
      message: 'Process shared successfully',
      sharedWith,
    };
  }

  /**
   * Create shared process
   */
  private async createSharedProcess(process: Process, shareTo: number): Promise<void> {
    await this.processRepository.save({
      id: process.id,
      userId: shareTo,
      sharedByUserId: process.userId,
      version: process.version,
      name: process.name,
      description: process.description,
      workspaceId: process.workspaceId,
      scope: process.scope,
    });

    const processDetail = await this.processDetailModel.findById(
      `${process.userId}.${process.id}.${process.version}`,
    );

    if (processDetail) {
      const newSharedProcessDetail = new this.processDetailModel({
        _id: `${shareTo}.${process.id}.${process.version}`,
        processId: process.id,
        versionId: processDetail.versionId,
        xml: processDetail.xml,
        variables: processDetail.variables,
        activities: processDetail.activities,
      });

      // Remove connections from shared process
      this.processBeforeShare(newSharedProcessDetail);

      await newSharedProcessDetail.save();
    }
  }

  /**
   * Remove connections before sharing
   */
  private processBeforeShare(processDetail: ProcessDetail): void {
    processDetail.activities.forEach((activity) => {
      for (const argumentName in activity.properties.arguments) {
        if (argumentName === 'Connection') {
          activity.properties.arguments[argumentName].value = '';
        }
      }
    });
  }

  /**
   * Get shared users of process
   */
  async getSharedUsers(workspaceId: string, processId: string, userId: number): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const process = await this.processRepository.findOne({
      where: { id: processId, workspaceId },
    });

    if (!process) {
      throw new ProcessNotFoundException();
    }

    // Check if user is the owner
    if (process.userId !== userId) {
      throw new ForbiddenException('Only the process owner can view shared users');
    }

    if (process.sharedByUserId) {
      throw new ForbiddenException('Cannot view shared users of a shared process');
    }

    const sharedProcesses = await this.processRepository
      .createQueryBuilder('process')
      .leftJoinAndSelect('process.user', 'user')
      .where('process.id = :processId', { processId })
      .andWhere('process.workspaceId = :workspaceId', { workspaceId })
      .andWhere('process.userId != :userId', { userId })
      .getMany();

    return {
      sharedWith: sharedProcesses.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        sharedAt: p.createdAt,
      })),
    };
  }
}
