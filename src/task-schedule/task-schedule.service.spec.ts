import { Test, TestingModule } from '@nestjs/testing';
import { TaskScheduleService } from './task-schedule.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RobotConnection } from 'src/connection/entity';
import { NotificationService } from 'src/notification/notification.service';
import { ConnectionService } from 'src/connection/connection.service';
import { Logger } from '@nestjs/common';

describe('TaskScheduleService', () => {
  let service: TaskScheduleService;
  let mockRobotConnectionRepository: any;
  let mockNotificationService: any;
  let mockConnectionService: any;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    mockRobotConnectionRepository = {
      find: jest.fn(),
    };

    mockNotificationService = {
      createNotification: jest.fn(),
    };

    mockConnectionService = {
      refreshToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskScheduleService,
        {
          provide: getRepositoryToken(RobotConnection),
          useValue: mockRobotConnectionRepository,
        },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ConnectionService, useValue: mockConnectionService },
      ],
    }).compile();

    service = module.get<TaskScheduleService>(TaskScheduleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkRobotConnection', () => {
    it('should refresh tokens for valid connections', async () => {
      const connections = [
        {
          robotKey: 'r1',
          connectionKey: 'c1',
          robot: { userId: 1, name: 'Robot 1' },
          connection: { connectionKey: 'c1', userId: 1, provider: 'google', name: 'my-conn' },
        },
      ];
      mockRobotConnectionRepository.find.mockResolvedValue(connections);
      mockConnectionService.refreshToken.mockResolvedValue({});

      await service.checkRobotConnection();

      expect(mockConnectionService.refreshToken).toHaveBeenCalledWith(1, 'google', 'my-conn');
      expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should send notification when refresh token fails', async () => {
      const connections = [
        {
          robotKey: 'r2',
          connectionKey: 'c2',
          robot: { userId: 2, name: 'Robot 2' },
          connection: { connectionKey: 'c2', userId: 2, provider: 'microsoft', name: 'fail-conn' },
        },
      ];
      mockRobotConnectionRepository.find.mockResolvedValue(connections);
      mockConnectionService.refreshToken.mockRejectedValue(new Error('Refresh failed'));

      await service.checkRobotConnection();

      expect(mockConnectionService.refreshToken).toHaveBeenCalledWith(2, 'microsoft', 'fail-conn');
      expect(mockNotificationService.createNotification).toHaveBeenCalled();
    });

    it('should skip null connections and duplicate connections', async () => {
      const connections = [
        {
          robotKey: 'r3',
          connectionKey: 'c3',
          robot: { userId: 3, name: 'Robot 3' },
          connection: null,
        },
        {
          robotKey: 'r4',
          connectionKey: 'c4',
          robot: { userId: 4, name: 'Robot 4' },
          connection: { connectionKey: 'c4', userId: 4, provider: 'aws', name: 'dup-conn' },
        },
        {
          robotKey: 'r5',
          connectionKey: 'c4',
          robot: { userId: 5, name: 'Robot 5' },
          connection: { connectionKey: 'c4', userId: 4, provider: 'aws', name: 'dup-conn' }, // duplicate connectionKey
        },
      ];
      mockRobotConnectionRepository.find.mockResolvedValue(connections);
      mockConnectionService.refreshToken.mockResolvedValue({});

      await service.checkRobotConnection();

      expect(mockConnectionService.refreshToken).toHaveBeenCalledTimes(1);
    });
  });
});
