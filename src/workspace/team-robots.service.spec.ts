import { Test, TestingModule } from '@nestjs/testing';
import { TeamRobotsService } from './team-robots.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Robot } from 'src/robot/entity/robot.entity';
import { Process } from 'src/processes/entity/process.entity';
import { RobotConnection } from 'src/connection/entity/robot_connection.entity';
import { TeamPermissionService } from './team-permission.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TeamRobotsService', () => {
  let service: TeamRobotsService;
  let mockRobotRepository: any;
  let mockProcessRepository: any;
  let mockRobotConnectionRepository: any;
  let mockTeamPermissionService: any;

  beforeEach(async () => {
    mockRobotRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    mockProcessRepository = { findOne: jest.fn() };
    mockRobotConnectionRepository = { find: jest.fn(), save: jest.fn(), delete: jest.fn() };
    
    mockTeamPermissionService = {
      checkTeamMember: jest.fn(),
      requirePermission: jest.fn(),
      checkPermission: jest.fn().mockReturnValue(true),
      getTeamWithWorkspace: jest.fn().mockResolvedValue({ workspaceId: 'w1' }),
      validateRobotProcess: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamRobotsService,
        { provide: getRepositoryToken(Robot), useValue: mockRobotRepository },
        { provide: getRepositoryToken(Process), useValue: mockProcessRepository },
        { provide: getRepositoryToken(RobotConnection), useValue: mockRobotConnectionRepository },
        { provide: TeamPermissionService, useValue: mockTeamPermissionService },
      ],
    }).compile();

    service = module.get<TeamRobotsService>(TeamRobotsService);
  });

  describe('getRobots', () => {
    it('should return paginated robots', async () => {
      mockTeamPermissionService.checkTeamMember.mockResolvedValue({});
      mockRobotRepository.findAndCount.mockResolvedValue([
        [{ robotKey: 'r1', process: {} }], 1
      ]);

      const result = await service.getRobots('t1', 1);
      
      expect(mockTeamPermissionService.requirePermission).toHaveBeenCalledWith(expect.anything(), 'view_robots');
      expect(result.robots.length).toBe(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getRobot', () => {
    it('should throw if not found', async () => {
      mockRobotRepository.findOne.mockResolvedValue(null);
      await expect(service.getRobot('t1', 'r1', 1)).rejects.toThrow(NotFoundException);
    });

    it('should return a robot details', async () => {
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1' });
      const result = await service.getRobot('t1', 'r1', 1);
      expect(result.robotKey).toBe('r1');
    });
  });

  describe('createRobot', () => {
    it('should throw NotFoundException if process not in team', async () => {
      mockProcessRepository.findOne.mockResolvedValue(null);
      await expect(service.createRobot('t1', 1, { processId: 'p1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if templates validation fails', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1' });
      mockTeamPermissionService.validateRobotProcess.mockResolvedValue(['error']);
      await expect(service.createRobot('t1', 1, { processId: 'p1' })).rejects.toThrow(BadRequestException);
    });

    it('should create and return robot with connections', async () => {
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', version: 1 });
      mockRobotRepository.create.mockReturnValue({ robotKey: 'r1' });
      mockRobotRepository.save.mockResolvedValue({ robotKey: 'r1', processId: 'p1' });

      const dto = { processId: 'p1', connections: [{ connectionKey: 'c1' }] };
      const result = await service.createRobot('t1', 1, dto);
      
      expect(mockRobotRepository.save).toHaveBeenCalled();
      expect(mockRobotConnectionRepository.save).toHaveBeenCalled();
      expect(result.robotKey).toBe('r1');
    });
  });

  describe('deleteRobot', () => {
    it('should delete connections and robot', async () => {
      const mockRobot = { robotKey: 'r1' };
      mockRobotRepository.findOne.mockResolvedValue(mockRobot);
      
      await service.deleteRobot('t1', 'r1', 1);
      
      expect(mockRobotConnectionRepository.delete).toHaveBeenCalledWith({ robotKey: 'r1' });
      expect(mockRobotRepository.remove).toHaveBeenCalledWith(mockRobot);
    });
  });

  describe('getRobotConnections', () => {
    it('should return mapped connections', async () => {
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1' });
      mockRobotConnectionRepository.find.mockResolvedValue([
        { connectionKey: 'c1', connection: { provider: 'test', name: 'conn1' }, isActivate: true }
      ]);
      const result = await service.getRobotConnections('t1', 'r1', 1);
      expect(result.length).toBe(1);
      expect(result[0].provider).toBe('test');
    });
  });

  describe('validateRobot', () => {
    it('should return isValid false if robot not found', async () => {
      mockRobotRepository.findOne.mockResolvedValue(null);
      await expect(service.validateRobot('t1', 'r1', 1)).rejects.toThrow(NotFoundException);
    });

    it('should return isValid false if missing run permission', async () => {
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1' });
      mockTeamPermissionService.checkPermission.mockReturnValue(false);
      
      const result = await service.validateRobot('t1', 'r1', 1, 'run');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('run_robot'));
    });

    it('should add warnings if no connections found for run', async () => {
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1', processId: 'p1' });
      mockTeamPermissionService.checkPermission.mockReturnValue(true);
      mockRobotConnectionRepository.find.mockResolvedValue([]);
      
      const result = await service.validateRobot('t1', 'r1', 1, 'run');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBe(1);
    });
  });
});
