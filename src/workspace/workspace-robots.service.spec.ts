import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceRobotsService } from './workspace-robots.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Robot } from 'src/robot/entity/robot.entity';
import { Process } from 'src/processes/entity/process.entity';
import { Workspace } from './entity/workspace.entity';
import { WorkspaceMember } from './entity/workspace-member.entity';
import { ConfigService } from '@nestjs/config';
import { ConnectionService } from 'src/connection/connection.service';
import { ProcessNotFoundException, RobotNotFoundException } from 'src/common/exceptions';
import { ForbiddenException, NotFoundException, HttpException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: jest.fn(),
  };
});

describe('WorkspaceRobotsService', () => {
  let service: WorkspaceRobotsService;
  let mockRobotRepository: any;
  let mockProcessRepository: any;
  let mockWorkspaceRepository: any;
  let mockWorkspaceMemberRepository: any;
  let mockConnectionService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockRobotRepository = {
      createQueryBuilder: jest.fn().mockImplementation(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ robotKey: 'r1' }]),
      })),
      count: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockProcessRepository = { findOne: jest.fn() };
    mockWorkspaceRepository = { findOne: jest.fn() };
    mockWorkspaceMemberRepository = { findOne: jest.fn() };

    mockConnectionService = {
      getAllConnectionsByRobotKey: jest.fn().mockResolvedValue([]),
      addRobotConnection: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'AWS_REGION_EXTRA') return 'us-east-1';
        if (key === 'SERVERLESS_ROBOT_URL') return 'http://serverless';
        return 'mockValue';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceRobotsService,
        { provide: getRepositoryToken(Robot), useValue: mockRobotRepository },
        { provide: getRepositoryToken(Process), useValue: mockProcessRepository },
        { provide: getRepositoryToken(Workspace), useValue: mockWorkspaceRepository },
        { provide: getRepositoryToken(WorkspaceMember), useValue: mockWorkspaceMemberRepository },
        { provide: ConnectionService, useValue: mockConnectionService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WorkspaceRobotsService>(WorkspaceRobotsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyWorkspaceAccess', () => {
    it('should throw NotFoundException if workspace not found', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue(null);
      await expect(service.getRobots('w1', 1, 10, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user lacks access', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 2 });
      mockWorkspaceMemberRepository.findOne.mockResolvedValue(null);
      await expect(service.getRobots('w1', 1, 10, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getRobots', () => {
    it('should return paginated robots', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      const result = await service.getRobots('w1', 1, 10, 1);
      expect(result.length).toBe(1);
    });
  });

  describe('getRobotCount', () => {
    it('should return number of robots', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockRobotRepository.count.mockResolvedValue(5);
      expect(await service.getRobotCount('w1', 1)).toBe(5);
    });
  });

  describe('getRobot', () => {
    it('should throw RobotNotFoundException', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockRobotRepository.findOne.mockResolvedValue(null);
      await expect(service.getRobot('w1', 'r1', 1)).rejects.toThrow(RobotNotFoundException);
    });

    it('should return robot with connections', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1' });
      const result = await service.getRobot('w1', 'r1', 1);
      expect(result.robotKey).toBe('r1');
      expect(result.connections).toEqual([]);
    });
  });

  describe('createRobot', () => {
    it('should throw ProcessNotFoundException', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.findOne.mockResolvedValue(null);
      await expect(service.createRobot('w1', 1, { processId: 'p1' } as any)).rejects.toThrow(ProcessNotFoundException);
    });

    it('should upload to S3 and save robot', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', version: 1 });
      mockRobotRepository.save.mockResolvedValue({ robotKey: 'r1' });

      const dto = { processId: 'p1', code: 'code', providers: ['aws'] } as any;
      const result = await service.createRobot('w1', 1, dto);

      expect(mockRobotRepository.save).toHaveBeenCalled();
      expect(mockConnectionService.addRobotConnection).toHaveBeenCalledWith(1, 'r1', ['aws']);
      expect(result.robotKey).toBe('r1');
    });
  });

  describe('runRobot', () => {
    it('should call axios.post and return status', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1', processId: 'p1' });
      (axios.post as jest.Mock).mockResolvedValue({ data: { instanceId: 'i-123' } });

      const result = await service.runRobot('w1', 'r1', 1, {});
      expect(axios.post).toHaveBeenCalled();
      expect(result.instanceId).toBe('i-123');
      expect(result.status).toBe('running');
    });

    it('should throw HttpException on axios error', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1' });
      (axios.post as jest.Mock).mockRejectedValue(new Error());

      await expect(service.runRobot('w1', 'r1', 1, {})).rejects.toThrow(HttpException);
    });
  });

  describe('stopRobot', () => {
    it('should call axios.post to stop', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1', processId: 'p1' });
      (axios.post as jest.Mock).mockResolvedValue({ data: { instanceId: 'i-123' } });

      const result = await service.stopRobot('w1', 'r1', 1);
      expect(axios.post).toHaveBeenCalled();
      expect(result.status).toBe('stopped');
    });
  });

  describe('updateRobot', () => {
    it('should throw ForbiddenException if not owner', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1', userId: 2 });
      await expect(service.updateRobot('w1', 'r1', 1, {})).rejects.toThrow(ForbiddenException);
    });

    it('should update and return', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1', userId: 1 });
      
      await service.updateRobot('w1', 'r1', 1, {});
      expect(mockRobotRepository.update).toHaveBeenCalled();
    });
  });

  describe('deleteRobot', () => {
    it('should throw ForbiddenException if not owner', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1', userId: 2 });
      await expect(service.deleteRobot('w1', 'r1', 1)).rejects.toThrow(ForbiddenException);
    });

    it('should call terminate config and delete record', async () => {
      mockWorkspaceRepository.findOne.mockResolvedValue({ ownerId: 1 });
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1', userId: 1 });
      (axios.put as jest.Mock).mockResolvedValue({});

      await service.deleteRobot('w1', 'r1', 1);
      expect(axios.put).toHaveBeenCalled();
      expect(mockRobotRepository.delete).toHaveBeenCalled();
    });
  });

});
