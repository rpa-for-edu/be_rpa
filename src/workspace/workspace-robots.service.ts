import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import { Robot, RobotScope } from 'src/robot/entity/robot.entity';
import { Process, ProcessScope } from 'src/processes/entity/process.entity';
import { Workspace } from './entity/workspace.entity';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { CreateRobotDtoV2 } from 'src/robot/dto/create-robot-v2.dto';
import { ConnectionService } from 'src/connection/connection.service';
import { ProcessNotFoundException, RobotNotFoundException } from 'src/common/exceptions';

@Injectable()
export class WorkspaceRobotsService {
  private readonly s3Client: S3Client;

  constructor(
    @InjectRepository(Robot)
    private robotRepository: Repository<Robot>,
    @InjectRepository(Process)
    private processRepository: Repository<Process>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepository: Repository<WorkspaceMember>,
    private connectionService: ConnectionService,
    private configService: ConfigService,
  ) {
    this.s3Client = new S3Client({
      region: configService.get('AWS_REGION_EXTRA'),
      credentials: {
        accessKeyId: configService.get('AWS_KEY_ID'),
        secretAccessKey: configService.get('AWS_SECRET_KEY'),
      },
    });
  }

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
   * Get all robots in workspace with pagination
   */
  async getRobots(
    workspaceId: string,
    userId: number,
    limit: number,
    page: number,
  ): Promise<any[]> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    return this.robotRepository
      .createQueryBuilder('robot')
      .leftJoinAndSelect('robot.user', 'user')
      .leftJoinAndSelect('robot.process', 'process')
      .where('robot.workspaceId = :workspaceId', { workspaceId })
      .orderBy('robot.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
  }

  /**
   * Get robot count in workspace
   */
  async getRobotCount(workspaceId: string, userId: number): Promise<number> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    return this.robotRepository.count({
      where: { workspaceId },
    });
  }

  /**
   * Get robot by key
   */
  async getRobot(workspaceId: string, robotKey: string, userId: number): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const robot = await this.robotRepository.findOne({
      where: { robotKey, workspaceId },
      relations: ['user', 'process'],
    });

    if (!robot) {
      throw new RobotNotFoundException();
    }

    // Get connections for this robot
    const connections = await this.connectionService.getAllConnectionsByRobotKey(robotKey);

    return {
      ...robot,
      connections: connections || [],
    };
  }

  /**
   * Create robot in workspace (publish process)
   */
  async createRobot(
    workspaceId: string,
    userId: number,
    createRobotDto: CreateRobotDtoV2,
  ): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    // Verify process belongs to the same workspace
    const process = await this.processRepository.findOne({
      where: {
        id: createRobotDto.processId,
        workspaceId,
        scope: ProcessScope.WORKSPACE,
      },
    });

    if (!process) {
      throw new ProcessNotFoundException();
    }

    // Upload robot code to S3
    const bucket = this.configService.get('AWS_S3_ROBOT_BUCKET_NAME');
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: `workspace/${workspaceId}/${process.id}/${process.version}/robot-code.json`,
      Body: createRobotDto.code,
      ContentType: 'application/json',
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      console.error('Failed to upload robot code to S3', error);
      throw new HttpException('Failed to upload robot code', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Create robot in database
    const robot = await this.robotRepository.save({
      ...createRobotDto,
      userId,
      workspaceId,
      processVersion: process.version,
      scope: RobotScope.WORKSPACE,
    });

    // Create robot connections if providers are specified
    if (createRobotDto.providers && createRobotDto.providers.length > 0) {
      await this.connectionService.addRobotConnection(
        userId,
        robot.robotKey,
        createRobotDto.providers,
      );
    }

    return robot;
  }

  /**
   * Update robot
   */
  async updateRobot(
    workspaceId: string,
    robotKey: string,
    userId: number,
    updateRobotDto: any,
  ): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const robot = await this.robotRepository.findOne({
      where: { robotKey, workspaceId },
    });

    if (!robot) {
      throw new RobotNotFoundException();
    }

    // Check if user is the owner
    if (robot.userId !== userId) {
      throw new ForbiddenException('Only the robot owner can update this robot');
    }

    await this.robotRepository.update({ robotKey, workspaceId }, updateRobotDto);

    return this.robotRepository.findOne({
      where: { robotKey, workspaceId },
    });
  }

  /**
   * Delete robot
   */
  async deleteRobot(workspaceId: string, robotKey: string, userId: number): Promise<void> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const robot = await this.robotRepository.findOne({
      where: { robotKey, workspaceId },
    });

    if (!robot) {
      throw new RobotNotFoundException();
    }

    // Check if user is the owner
    if (robot.userId !== userId) {
      throw new ForbiddenException('Only the robot owner can delete this robot');
    }

    // Terminate AWS resources
    await this.terminateRobotResources(robot);

    // Delete robot from database
    await this.robotRepository.delete({ robotKey, workspaceId });
  }

  /**
   * Run robot (manual trigger)
   */
  async runRobot(
    workspaceId: string,
    robotKey: string,
    userId: number,
    runParams: any,
  ): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const robot = await this.robotRepository.findOne({
      where: { robotKey, workspaceId },
    });

    if (!robot) {
      throw new RobotNotFoundException();
    }

    // TODO: Check if robot is already running
    // This would require checking EC2 instance state or a status field

    // Call serverless function to start robot
    const url = this.configService.get('SERVERLESS_ROBOT_URL') + '/robot/run';
    try {
      const response = await axios.post(url, {
        workspace_id: workspaceId,
        robot_key: robotKey,
        user_id: String(userId),
        process_id: robot.processId,
        version: robot.processVersion,
        parameters: runParams.parameters || {},
      });

      return {
        message: 'Robot started successfully',
        robotKey,
        instanceId: response.data.instanceId,
        status: 'running',
      };
    } catch (error) {
      console.error('Failed to run robot', error);
      throw new HttpException('Failed to start robot', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Stop robot
   */
  async stopRobot(workspaceId: string, robotKey: string, userId: number): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const robot = await this.robotRepository.findOne({
      where: { robotKey, workspaceId },
    });

    if (!robot) {
      throw new RobotNotFoundException();
    }

    // Call serverless function to stop robot
    const url = this.configService.get('SERVERLESS_ROBOT_URL') + '/robot/stop';
    try {
      const response = await axios.post(url, {
        workspace_id: workspaceId,
        robot_key: robotKey,
        user_id: String(userId),
        process_id: robot.processId,
        version: robot.processVersion,
      });

      return {
        message: 'Robot stopped successfully',
        robotKey,
        instanceId: response.data.instanceId,
        status: 'stopped',
      };
    } catch (error) {
      console.error('Failed to stop robot', error);
      throw new HttpException('Failed to stop robot', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get robot logs from CloudWatch
   */
  async getRobotLogs(
    workspaceId: string,
    robotKey: string,
    userId: number,
    logGroup: string,
    options: { limit?: number; startTime?: number; endTime?: number },
  ): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const robot = await this.robotRepository.findOne({
      where: { robotKey, workspaceId },
    });

    if (!robot) {
      throw new RobotNotFoundException();
    }

    // TODO: Implement CloudWatch Logs integration
    // For now, return mock data
    return {
      logs: [],
      nextToken: null,
    };
  }

  /**
   * Get robot schedule
   */
  async getRobotSchedule(workspaceId: string, robotKey: string, userId: number): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const robot = await this.robotRepository.findOne({
      where: { robotKey, workspaceId },
    });

    if (!robot) {
      throw new RobotNotFoundException();
    }

    // TODO: Implement schedule retrieval from database
    // For now, return mock data
    return {
      scheduleExpression: null,
      timezone: 'UTC',
      enabled: false,
      nextRunTime: null,
      lastRunTime: null,
    };
  }

  /**
   * Create or update robot schedule
   */
  async createOrUpdateSchedule(
    workspaceId: string,
    robotKey: string,
    userId: number,
    scheduleDto: any,
  ): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const robot = await this.robotRepository.findOne({
      where: { robotKey, workspaceId },
    });

    if (!robot) {
      throw new RobotNotFoundException();
    }

    // Check if user is the owner
    if (robot.userId !== userId) {
      throw new ForbiddenException('Only the robot owner can update the schedule');
    }

    // TODO: Implement schedule creation/update in database
    // TODO: Create EventBridge rule for the schedule

    return {
      message: 'Schedule created/updated successfully',
      schedule: {
        scheduleExpression: scheduleDto.scheduleExpression,
        timezone: scheduleDto.timezone || 'UTC',
        enabled: scheduleDto.enabled !== false,
        nextRunTime: null, // Calculate based on cron expression
      },
    };
  }

  /**
   * Delete robot schedule
   */
  async deleteSchedule(workspaceId: string, robotKey: string, userId: number): Promise<void> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const robot = await this.robotRepository.findOne({
      where: { robotKey, workspaceId },
    });

    if (!robot) {
      throw new RobotNotFoundException();
    }

    // Check if user is the owner
    if (robot.userId !== userId) {
      throw new ForbiddenException('Only the robot owner can delete the schedule');
    }

    // TODO: Implement schedule deletion from database
    // TODO: Delete EventBridge rule
  }

  /**
   * Get robot connections
   */
  async getRobotConnections(workspaceId: string, robotKey: string, userId: number): Promise<any> {
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const robot = await this.robotRepository.findOne({
      where: { robotKey, workspaceId },
    });

    if (!robot) {
      throw new RobotNotFoundException();
    }

    const connections = await this.connectionService.getAllConnectionsByRobotKey(robotKey);

    return {
      connections: connections || [],
    };
  }

  /**
   * Terminate robot AWS resources
   */
  private async terminateRobotResources(robot: Robot): Promise<void> {
    const url = this.configService.get('SERVERLESS_ROBOT_URL') + '/robot/terminate';
    try {
      await axios.put(url, {
        workspace_id: robot.workspaceId,
        robot_key: robot.robotKey,
        user_id: String(robot.userId),
        process_id: robot.processId,
        version: robot.processVersion,
      });
    } catch (error) {
      console.error('Failed to terminate robot resources', error);
      // Don't throw error here to allow database cleanup to proceed
    }
  }
}
