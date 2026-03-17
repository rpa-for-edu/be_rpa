import { Test, TestingModule } from '@nestjs/testing';
import { RobotService } from './robot.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Robot } from './entity/robot.entity';
import { Process } from 'src/processes/entity/process.entity';
import { ProcessesService } from 'src/processes/processes.service';
import { ConnectionService } from 'src/connection/connection.service';
import { ConfigService } from '@nestjs/config';
import { ProcessNotFoundException, RobotNotFoundException } from 'src/common/exceptions';
import axios from 'axios';

jest.mock('@aws-sdk/client-s3');
jest.mock('axios');

describe('RobotService', () => {
  let service: RobotService;
  let mockRobotRepository: any;
  let mockProcessRepository: any;
  let mockProcessesService: any;
  let mockConnectionService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockRobotRepository = {
      find: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    mockProcessRepository = {
      findOne: jest.fn(),
    };

    mockProcessesService = {
      createProcessVersionFromCurrent: jest.fn(),
    };

    mockConnectionService = {
      addRobotConnection: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          AWS_REGION_EXTRA: 'us-east-1',
          AWS_KEY_ID: 'test-key',
          AWS_SECRET_KEY: 'test-secret',
          AWS_S3_ROBOT_BUCKET_NAME: 'test-bucket',
          SERVERLESS_ROBOT_URL: 'http://localhost/robot',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RobotService,
        { provide: getRepositoryToken(Robot), useValue: mockRobotRepository },
        { provide: getRepositoryToken(Process), useValue: mockProcessRepository },
        { provide: ProcessesService, useValue: mockProcessesService },
        { provide: ConnectionService, useValue: mockConnectionService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RobotService>(RobotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRobots', () => {
    it('should return a list of robots', async () => {
      mockRobotRepository.find.mockResolvedValue([{ id: 1, name: 'Robot 1' }]);
      const result = await service.getRobots(1);
      expect(result).toEqual([{ id: 1, name: 'Robot 1' }]);
    });
  });

  describe('getRobotsCount', () => {
    it('should return robot count for user', async () => {
      mockRobotRepository.count.mockResolvedValue(3);
      const result = await service.getRobotsCount(1);
      expect(result).toBe(3);
      expect(mockRobotRepository.count).toHaveBeenCalledWith({ where: { userId: 1 } });
    });
  });

  describe('createRobot', () => {
    it('should create a robot and save to S3', async () => {
      const createDto = { processId: 'p1', code: '{}', providers: ['google'] } as any;
      mockProcessesService.createProcessVersionFromCurrent.mockResolvedValue({ version: 2 });
      mockProcessRepository.findOne.mockResolvedValue({ id: 'p1', version: 2 });
      mockRobotRepository.save.mockResolvedValue({});
      mockRobotRepository.findOne.mockResolvedValue({ robotKey: 'r1' });
      
      const result = await service.createRobot(1, createDto);
      
      expect(mockProcessesService.createProcessVersionFromCurrent).toHaveBeenCalled();
      expect(mockConnectionService.addRobotConnection).toHaveBeenCalledWith(1, 'r1', ['google']);
      expect(result.robotKey).toEqual('r1');
    });

    it('should throw ProcessNotFoundException if process not found', async () => {
      mockProcessesService.createProcessVersionFromCurrent.mockResolvedValue({ version: 2 });
      mockProcessRepository.findOne.mockResolvedValue(null);
      
      await expect(service.createRobot(1, { processId: 'p1' } as any)).rejects.toThrow(ProcessNotFoundException);
    });
  });

  describe('deleteRobot', () => {
    it('should throw RobotNotFoundException if robot not found', async () => {
      mockRobotRepository.findOne.mockResolvedValue(null);
      await expect(service.deleteRobot(1, 'r1')).rejects.toThrow(RobotNotFoundException);
    });

    it('should terminate resources and delete from DB', async () => {
      mockRobotRepository.findOne.mockResolvedValue({ userId: 1, robotKey: 'r1', processId: 'p1', processVersion: 1 });
      (axios.put as jest.Mock).mockResolvedValue({});
      mockRobotRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteRobot(1, 'r1');
      
      expect(axios.put).toHaveBeenCalled();
      expect(mockRobotRepository.delete).toHaveBeenCalledWith({ userId: 1, robotKey: 'r1' });
    });
  });
});
