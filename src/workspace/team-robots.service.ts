import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Robot } from 'src/robot/entity/robot.entity';
import { Process } from 'src/processes/entity/process.entity';
import { RobotConnection } from 'src/connection/entity/robot_connection.entity';
import { TeamPermissionService } from './team-permission.service';

@Injectable()
export class TeamRobotsService {
  constructor(
    @InjectRepository(Robot)
    private robotRepository: Repository<Robot>,
    @InjectRepository(Process)
    private processRepository: Repository<Process>,
    @InjectRepository(RobotConnection)
    private robotConnectionRepository: Repository<RobotConnection>,
    private teamPermissionService: TeamPermissionService,
  ) {}

  /**
   * Get all robots in team
   */
  async getRobots(
    teamId: string,
    userId: number,
    options?: { page?: number; limit?: number },
  ): Promise<any> {
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);
    this.teamPermissionService.requirePermission(member, 'view_robots');

    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const [robots, total] = await this.robotRepository.findAndCount({
      where: { teamId },
      relations: ['process', 'user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      robots: robots.map((r) => ({
        robotKey: r.robotKey,
        processId: r.processId,
        processName: r.process?.name,
        processVersion: r.processVersion,
        triggerType: r.triggerType,
        createdBy: r.user?.name,
        createdAt: r.createdAt,
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
   * Get robot by key
   */
  async getRobot(teamId: string, robotKey: string, userId: number): Promise<any> {
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);
    this.teamPermissionService.requirePermission(member, 'view_robots');

    const robot = await this.robotRepository.findOne({
      where: { robotKey, teamId },
      relations: ['process', 'user'],
    });

    if (!robot) {
      throw new NotFoundException('Robot not found');
    }

    return {
      robotKey: robot.robotKey,
      processId: robot.processId,
      processName: robot.process?.name,
      processVersion: robot.processVersion,
      createdBy: robot.user?.name,
      createdAt: robot.createdAt,
      workspaceId: robot.workspaceId,
      teamId: robot.teamId,
    };
  }

  /**
   * Create robot in team
   */
  async createRobot(teamId: string, userId: number, createDto: any): Promise<any> {
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);
    this.teamPermissionService.requirePermission(member, 'create_robot');

    // Verify process belongs to team
    const process = await this.processRepository.findOne({
      where: {
        id: createDto.processId,
        teamId,
      },
    });

    if (!process) {
      throw new NotFoundException('Process not found in this team');
    }

    // Validate that user has permission to use all templates in this process
    const validationErrors = await this.teamPermissionService.validateRobotProcess(
      teamId,
      createDto.processId,
      member,
    );

    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Cannot create robot: insufficient permissions for process templates',
        errors: validationErrors,
      });
    }

    // Get team with workspace
    const team = await this.teamPermissionService.getTeamWithWorkspace(teamId);

    // Create robot
    const robot = this.robotRepository.create({
      name: createDto.name || `Robot ${Date.now()}`,
      processId: createDto.processId,
      processVersion: createDto.processVersion || process.version,
      userId,
      workspaceId: team.workspaceId,
      teamId,
    });

    const savedRobot = await this.robotRepository.save(robot);

    // Add robot connections if provided
    if (createDto.connections && createDto.connections.length > 0) {
      const robotConnections = createDto.connections.map((conn: any) => ({
        robotKey: savedRobot.robotKey,
        connectionKey: conn.connectionKey,
        isActivate: conn.isActivate !== false,
      }));

      await this.robotConnectionRepository.save(robotConnections);
    }

    return {
      robotKey: savedRobot.robotKey,
      processId: savedRobot.processId,
      processVersion: savedRobot.processVersion,
      createdAt: savedRobot.createdAt,
    };
  }

  /**
   * Delete robot
   */
  async deleteRobot(teamId: string, robotKey: string, userId: number): Promise<void> {
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);
    this.teamPermissionService.requirePermission(member, 'delete_robot');

    const robot = await this.robotRepository.findOne({
      where: { robotKey, teamId },
    });

    if (!robot) {
      throw new NotFoundException('Robot not found');
    }

    // Delete robot connections first
    await this.robotConnectionRepository.delete({ robotKey });

    // Delete robot
    await this.robotRepository.remove(robot);
  }

  /**
   * Get robot connections
   */
  async getRobotConnections(teamId: string, robotKey: string, userId: number): Promise<any> {
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);
    this.teamPermissionService.requirePermission(member, 'view_robots');

    const robot = await this.robotRepository.findOne({
      where: { robotKey, teamId },
    });

    if (!robot) {
      throw new NotFoundException('Robot not found');
    }

    const robotConnections = await this.robotConnectionRepository.find({
      where: { robotKey },
      relations: ['connection'],
    });

    return robotConnections.map((rc) => ({
      connectionKey: rc.connectionKey,
      provider: rc.connection?.provider,
      name: rc.connection?.name,
      isActivate: rc.isActivate,
    }));
  }

  /**
   * Validate robot action (run or delete)
   * Check permissions and template access
   */
  async validateRobot(
    teamId: string,
    robotKey: string,
    userId: number,
    action: 'run' | 'delete' = 'run',
  ): Promise<any> {
    const member = await this.teamPermissionService.checkTeamMember(teamId, userId);

    // Check if robot exists and belongs to team
    const robot = await this.robotRepository.findOne({
      where: { robotKey, teamId },
      relations: ['process'],
    });

    if (!robot) {
      throw new NotFoundException('Robot not found');
    }

    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      action,
      robotKey: robot.robotKey,
      processId: robot.processId,
      processName: robot.process?.name,
    };

    // Check permission based on action
    const requiredPermission = action === 'delete' ? 'delete_robot' : 'run_robot';

    if (!this.teamPermissionService.checkPermission(member, requiredPermission)) {
      validationResult.isValid = false;
      validationResult.errors.push(
        `You don't have '${requiredPermission}' permission in this team`,
      );
      return validationResult;
    }

    // For run action, also validate process templates
    if (action === 'run') {
      try {
        const templateErrors = await this.teamPermissionService.validateRobotProcess(
          teamId,
          robot.processId,
          member,
        );

        if (templateErrors.length > 0) {
          validationResult.isValid = false;
          validationResult.errors.push(...templateErrors);
        }
      } catch (error) {
        validationResult.isValid = false;
        validationResult.errors.push(error.message || 'Failed to validate process templates');
      }

      // Check robot connections (optional warning for run action)
      const robotConnections = await this.robotConnectionRepository.find({
        where: { robotKey },
      });

      if (robotConnections.length === 0) {
        validationResult.warnings.push('Robot has no connections configured');
      }
    }

    return validationResult;
  }
}
