import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { RobotRunDetail } from './entity/robot-run-detail.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RobotRunLog } from './entity/robot-run-log.entity';
import { RobotRunOverall } from './entity/robot-run-overall.entity';
import { Robot } from 'src/robot/entity/robot.entity';
import { AllStatusesResponseDto, RobotStatusItemDto } from './dto/all-statuses-response.dto';
import { JobsHistoryResponseDto } from './dto/jobs-history-response.dto';
import { TransactionsResponseDto } from './dto/transactions-response.dto';

@Injectable()
export class RobotReportService {
  constructor(
    @InjectRepository(RobotRunDetail)
    private readonly robotRunDetailRepository: Repository<RobotRunDetail>,
    @InjectRepository(RobotRunLog)
    private readonly robotRunLogRepository: Repository<RobotRunLog>,
    @InjectRepository(RobotRunOverall)
    private readonly robotRunOverallRepository: Repository<RobotRunOverall>,
    @InjectRepository(Robot)
    private readonly robotRepository: Repository<Robot>,
  ) {}

  // ─── Dashboard Methods ──────────────────────────────────────

  async getAllStatuses(userId: number): Promise<AllStatusesResponseDto> {
    const userIdStr = String(userId);

    // Get all robots for this user
    const robots = await this.robotRepository.find({
      where: { userId },
    });

    // Subquery: latest created_date per process_id_version
    const latestLogSubQuery = this.robotRunLogRepository
      .createQueryBuilder('sub')
      .select('sub.process_id_version', 'process_id_version')
      .addSelect('MAX(sub.created_date)', 'max_date')
      .where('sub.user_id = :userIdStr', { userIdStr })
      .groupBy('sub.process_id_version');

    // Get the latest status for each process_id_version
    const latestStatuses: { process_id_version: string; instance_state: string }[] =
      await this.robotRunLogRepository
        .createQueryBuilder('rrl')
        .select('rrl.process_id_version', 'process_id_version')
        .addSelect('rrl.instance_state', 'instance_state')
        .innerJoin(
          `(${latestLogSubQuery.getQuery()})`,
          'latest',
          'rrl.process_id_version = latest.process_id_version AND rrl.created_date = latest.max_date',
        )
        .where('rrl.user_id = :userIdStr')
        .setParameters({ ...latestLogSubQuery.getParameters(), userIdStr })
        .getRawMany();

    // Build a map: process_id_version -> instance_state
    const statusMap = new Map<string, string>();
    for (const row of latestStatuses) {
      statusMap.set(row.process_id_version, row.instance_state);
    }
    // Classify raw instance_state into simplified status
    const RUNNING_STATES = new Set(['running', 'executing', 'pending', 'setup']);
    const STOPPED_STATES = new Set(['stopping', 'stopped', 'cooldown']);
    const TERMINATING_STATES = new Set(['terminating', 'shutting-down']);

    const classifyStatus = (rawState: string | null): string => {
      if (!rawState) return 'idle';
      if (RUNNING_STATES.has(rawState)) return 'running';
      if (STOPPED_STATES.has(rawState)) return 'stopped';
      if (TERMINATING_STATES.has(rawState)) return 'terminating';
      return 'idle';
    };

    // Build per-robot items with simplified status
    const robotItems: RobotStatusItemDto[] = robots.map((robot) => {
      const processIdVersion = `${robot.processId}.${robot.processVersion}`;
      const rawState = statusMap.get(processIdVersion) ?? null;
      return {
        name: robot.name,
        processId: robot.processId,
        processVersion: robot.processVersion,
        triggerType: robot.triggerType,
        scope: robot.scope,
        status: classifyStatus(rawState),
      };
    });

    // Aggregate counts by simplified status
    let running = 0, stopped = 0, terminating = 0, idle = 0;
    for (const item of robotItems) {
      if (item.status === 'running') running++;
      else if (item.status === 'stopped') stopped++;
      else if (item.status === 'terminating') terminating++;
      else idle++;
    }

    // Aggregate counts by triggerType
    const triggerTypeCounts: Record<string, number> = {};
    for (const item of robotItems) {
      triggerTypeCounts[item.triggerType] = (triggerTypeCounts[item.triggerType] || 0) + 1;
    }

    return new AllStatusesResponseDto({
      running,
      stopped,
      terminating,
      idle,
      robots: robotItems,
      triggerTypeCounts,
    });
  }

  async getDashboardJobsHistory(userId: number, date?: string): Promise<JobsHistoryResponseDto> {
    const date1 = new Date("2025-02-23T03:08:39.309Z");
    const queryBuilder = this.robotRunOverallRepository
      .createQueryBuilder('rro')
      .select(
        `SUM(CASE WHEN rro.passed > 0 AND rro.failed = 0 THEN 1 ELSE 0 END)`,
        'successful',
      )
      .addSelect(
        `SUM(CASE WHEN rro.failed > 0 THEN 1 ELSE 0 END)`,
        'faulted',
      )
      .addSelect(
        `SUM(CASE WHEN rro.passed = 0 AND rro.failed = 0 THEN 1 ELSE 0 END)`,
        'stopped',
      )
      .addSelect('COUNT(*)', 'total')
      .where('rro.user_id = :userId', { userId });

    if (date) {
      queryBuilder.andWhere('rro.created_date >= :date1', { date1 });
    }

    const result = await queryBuilder.getRawOne();

    return new JobsHistoryResponseDto({
      successful: parseInt(result.successful, 10),
      faulted: parseInt(result.faulted, 10),
      stopped: parseInt(result.stopped, 10),
      total: parseInt(result.total, 10),
    });
  }

  async getDashboardTransactions(
    userId: number,
    date?: string,
  ): Promise<TransactionsResponseDto> {
    // Determine granularity based on time range
    const now = new Date();
    const fromDate = date ? new Date(date) : null;
    const diffMs = fromDate ? now.getTime() - fromDate.getTime() : null;
    const ONE_HOUR = 60 * 60 * 1000;
    const ONE_DAY = 24 * ONE_HOUR;

    let dateFormat: string;
    if (diffMs !== null && diffMs <= ONE_HOUR) {
      // Last hour → per-minute
      dateFormat = `'%H:%i'`;
    } else if (diffMs !== null && diffMs <= ONE_DAY) {
      // Last day → hourly
      dateFormat = `'%H:00'`;
    } else {
      // Last week / 30 days / no filter → daily
      dateFormat = `'%Y-%m-%d'`;
    }

    const queryBuilder = this.robotRunOverallRepository
      .createQueryBuilder('rro')
      .select(`DATE_FORMAT(rro.start_time, ${dateFormat})`, 'label')
      .addSelect('COUNT(*)', 'count')
      .where('rro.user_id = :userId', { userId });

    if (date) {
      queryBuilder.andWhere('rro.start_time >= :date', { date });
    }

    queryBuilder
      .groupBy('label')
      .orderBy('label', 'ASC');

    const results: { label: string; count: string }[] = await queryBuilder.getRawMany();

    const labels = results.map((r) => r.label);
    const data = results.map((r) => parseInt(r.count, 10));
    const total = data.reduce((sum, val) => sum + val, 0);

    return new TransactionsResponseDto({ labels, data, total });
  }

  async getRobotRunDetailCommands(
    uuid: string,
    userId: number,
    processId: string,
    version: number,
  ) {
    const queryBuilder = this.robotRunDetailRepository.createQueryBuilder('robot_run_detail');

    queryBuilder
      .select([
        'robot_run_detail.kw_id',
        'robot_run_detail.kw_name',
        'robot_run_detail.kw_args',
        'robot_run_detail.kw_status',
        'robot_run_detail.messages',
        'robot_run_detail.start_time',
        'robot_run_detail.end_time',
      ])
      .addSelect(
        'TIMESTAMPDIFF(SECOND, robot_run_detail.start_time, robot_run_detail.end_time)',
        'elapsed_time',
      )
      .where('robot_run_detail.uuid = :uuid', { uuid })
      .andWhere('robot_run_detail.user_id = :userId', { userId })
      .andWhere('robot_run_detail.process_id = :processId', { processId })
      .andWhere('robot_run_detail.version = :version', { version })
      .orderBy('robot_run_detail.kw_id', 'ASC');

    const results = await queryBuilder.getRawMany();

    return results;
  }

  async getRobotRunTimeOverall(
    processId: string,
    userId: number,
    version: number,
    passed?: number,
    date?: string,
  ) {
    const queryBuilder = this.robotRunOverallRepository.createQueryBuilder('robot_run_overall');

    queryBuilder
      .select([
        'robot_run_overall.uuid',
        'robot_run_overall.start_time',
        'robot_run_overall.end_time',
        'robot_run_overall.elapsed_time as time_execution',
      ])
      .where('robot_run_overall.process_id = :processId', { processId })
      .andWhere('robot_run_overall.user_id = :userId', { userId })
      .andWhere('robot_run_overall.version = :version', { version })
      .andWhere('robot_run_overall.passed = :passed', { passed });

    if (date) {
      queryBuilder.andWhere('DATE(robot_run_overall.start_time) = :date', { date });
    }

    const results = await queryBuilder.getRawMany();

    return results;
  }

  async getAverageExecutionTime(
    processId: string,
    userId: number,
    version: number,
    passed?: number,
    date?: string,
  ) {
    const queryBuilder = this.robotRunOverallRepository.createQueryBuilder('robot_run_overall');

    queryBuilder
      .select('AVG(robot_run_overall.elapsed_time)', 'avg_time_execution')
      .where('robot_run_overall.process_id = :processId', { processId })
      .andWhere('robot_run_overall.user_id = :userId', { userId })
      .andWhere('robot_run_overall.version = :version', { version })
      .andWhere('robot_run_overall.passed = :passed', { passed });

    if (date) {
      queryBuilder.andWhere('DATE(robot_run_overall.start_time) = :date', { date });
    }

    const result = await queryBuilder.getRawOne();

    return result;
  }

  async getCountsGroupedByPassed(
    processId: string,
    userId: number,
    version: number,
    date?: string,
  ) {
    const queryBuilder = this.robotRunOverallRepository.createQueryBuilder('robot_run_overall');

    queryBuilder
      .select('robot_run_overall.passed', 'passed')
      .addSelect('COUNT(*)', 'count')
      .where('robot_run_overall.process_id = :processId', { processId })
      .andWhere('robot_run_overall.user_id = :userId', { userId })
      .andWhere('robot_run_overall.version = :version', { version });

    if (date) {
      queryBuilder.andWhere('DATE(robot_run_overall.start_time) = :date', { date });
    }

    queryBuilder.groupBy('robot_run_overall.passed');

    const results = await queryBuilder.getRawMany();

    return results;
  }

  async getFailedExecution(processId: string, userId: number, version: number, date?: string) {
    const queryBuilder = this.robotRunOverallRepository.createQueryBuilder('robot_run_overall');

    queryBuilder
      .select('robot_run_overall.uuid', 'uuid')
      .addSelect('robot_run_overall.passed', 'passed')
      .addSelect('robot_run_overall.error_message', 'error_message')
      .addSelect('robot_run_overall.start_time', 'start_time')
      .addSelect('robot_run_overall.end_time', 'end_time')
      .addSelect(
        'TIMESTAMPDIFF(SECOND, robot_run_overall.start_time, robot_run_overall.end_time)',
        'time_execution',
      )
      .where('robot_run_overall.process_id = :processId', { processId })
      .andWhere('robot_run_overall.user_id = :userId', { userId })
      .andWhere('robot_run_overall.version = :version', { version })
      .andWhere('robot_run_overall.passed = :passed', { passed: 0 });

    if (date) {
      queryBuilder.andWhere('DATE(robot_run_overall.start_time) = :date', { date });
    }

    const results = await queryBuilder.getRawMany();

    return results;
  }

  async getCountsGroupedByError(processId: string, userId: number, version: number, date?: string) {
    const queryBuilder = this.robotRunOverallRepository.createQueryBuilder('robot_run_overall');

    queryBuilder
      .select('robot_run_overall.error_message', 'error_message')
      .addSelect('COUNT(*)', 'count')
      .where('robot_run_overall.process_id = :processId', { processId })
      .andWhere('robot_run_overall.user_id = :userId', { userId })
      .andWhere('robot_run_overall.version = :version', { version });

    if (date) {
      queryBuilder.andWhere('DATE(robot_run_overall.start_time) = :date', { date });
    }

    queryBuilder.groupBy('robot_run_overall.error_message');

    const results = await queryBuilder.getRawMany();

    return results;
  }
}
