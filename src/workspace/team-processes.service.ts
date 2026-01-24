import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Process } from 'src/processes/entity/process.entity';
import { ProcessDetail } from 'src/processes/schema/process.schema';
import { ProcessVersion } from 'src/processes/entity/processVersions.entity';
import { TeamPermissionService } from './team-permission.service';

@Injectable()
export class TeamProcessesService {
  constructor(
    @InjectRepository(Process)
    private processRepository: Repository<Process>,
    @InjectRepository(ProcessVersion)
    private processVersionRepository: Repository<ProcessVersion>,
    @InjectModel(ProcessDetail.name)
    private processDetailModel: Model<ProcessDetail>,
    private teamPermissionService: TeamPermissionService,
  ) {}

  /**
   * Get all processes in team
   */
  async getProcesses(
    teamId: string,
    userId: number,
    options?: { page?: number; limit?: number },
  ): Promise<any> {
    // Check team member
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);
    this.teamPermissionService.requirePermission(member, 'view_processes');

    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const [processes, total] = await this.processRepository.findAndCount({
      where: { teamId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      processes: processes.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        version: p.version,
        createdBy: p.user?.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get process by ID
   */
  async getProcess(teamId: string, processId: string, userId: number): Promise<any> {
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);
    this.teamPermissionService.requirePermission(member, 'view_processes');

    const process = await this.processRepository.findOne({
      where: { id: processId, teamId },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    // Get process details from MongoDB - query by processId and version, not userId
    const processDetail = await this.processDetailModel
      .findOne({
        processId: processId,
        _id: new RegExp(`^\\d+\\.${processId}\\.${process.version}$`),
      })
      .lean()
      .exec();

    if (!processDetail) {
      throw new NotFoundException('Process detail not found');
    }

    return processDetail;
  }

  /**
   * Create process in team
   */
  async createProcess(teamId: string, userId: number, createDto: any): Promise<any> {
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);
    this.teamPermissionService.requirePermission(member, 'create_process');

    // Extract activity template IDs from process definition
    const templateIds = this.extractTemplateIds(createDto.activities || []);

    // Validate templates against team permissions
    const errors = await this.teamPermissionService.validateProcessTemplates(
      teamId,
      member,
      templateIds,
    );

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Process validation failed',
        errors,
      });
    }

    // Get team with workspace
    const team = await this.teamPermissionService.getTeamWithWorkspace(teamId);

    // Create process
    const savedProcess = await this.processRepository.save({
      id: createDto.id,
      name: createDto.name,
      description: createDto.description,
      userId,
      teamId,
      workspaceId: team.workspaceId,
      scope: 'team' as any,
      version: 1,
    });

    // Create process version
    const processVersion = await this.processVersionRepository.save({
      processId: savedProcess.id,
      tag: 'v1',
      description: 'Initial version',
      createdBy: userId,
      isCurrent: true,
    });

    // Save process details to MongoDB
    const processDetail = new this.processDetailModel({
      _id: `${userId}.${savedProcess.id}.1`,
      processId: savedProcess.id,
      versionId: processVersion.id,
      xml: createDto.xml || '',
      activities: createDto.activities || [],
      variables: createDto.variables || {},
    });

    await processDetail.save();

    // Return only ProcessDetail like workspace
    return processDetail.toObject();
  }

  /**
   * Update process
   */
  async updateProcess(
    teamId: string,
    processId: string,
    userId: number,
    updateDto: any,
  ): Promise<any> {
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);
    this.teamPermissionService.requirePermission(member, 'edit_process');

    const process = await this.processRepository.findOne({
      where: { id: processId, teamId },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    // If activities are being updated, validate templates
    if (updateDto.activities) {
      const templateIds = this.extractTemplateIds(updateDto.activities);
      const errors = await this.teamPermissionService.validateProcessTemplates(
        teamId,
        member,
        templateIds,
      );

      if (errors.length > 0) {
        throw new BadRequestException({
          message: 'Process validation failed',
          errors,
        });
      }
    }

    // Update process metadata
    if (updateDto.name) process.name = updateDto.name;
    if (updateDto.description) process.description = updateDto.description;

    const savedProcess = await this.processRepository.save(process);

    // If activities/variables are updated, create new version
    if (updateDto.activities || updateDto.variables || updateDto.xml) {
      // Increment version
      process.version += 1;
      await this.processRepository.save(process);

      // Set old version as not current
      await this.processVersionRepository.update(
        { processId, isCurrent: true },
        { isCurrent: false },
      );

      // Create new process version
      const processVersion = await this.processVersionRepository.save({
        processId: savedProcess.id,
        tag: `v${process.version}`,
        description: updateDto.description || 'Updated version',
        createdBy: userId,
        isCurrent: true,
      });

      // Save new version details to MongoDB
      const processDetail = new this.processDetailModel({
        _id: `${userId}.${savedProcess.id}.${process.version}`,
        processId: savedProcess.id,
        versionId: processVersion.id,
        xml: updateDto.xml || '',
        activities: updateDto.activities || [],
        variables: updateDto.variables || {},
      });

      await processDetail.save();
    }

    return savedProcess;
  }

  /**
   * Delete process
   */
  async deleteProcess(teamId: string, processId: string, userId: number): Promise<void> {
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);
    this.teamPermissionService.requirePermission(member, 'delete_process');

    const process = await this.processRepository.findOne({
      where: { id: processId, teamId },
    });

    if (!process) {
      throw new NotFoundException('Process not found');
    }

    // Delete from MySQL
    await this.processRepository.remove(process);

    // Delete from MongoDB
    await this.processDetailModel.deleteMany({ processId });
  }

  /**
   * Extract activity template IDs from activities array
   */
  private extractTemplateIds(activities: any[]): string[] {
    const templateIds = new Set<string>();

    for (const activity of activities) {
      if (activity.activityTemplateId) {
        templateIds.add(activity.activityTemplateId);
      }
    }

    return Array.from(templateIds);
  }
}
