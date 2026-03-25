import { ApiProperty } from '@nestjs/swagger';

export class RobotStatusItemDto {
  @ApiProperty({ example: 'My Robot', description: 'Robot name' })
  name: string;

  @ApiProperty({ example: 'proc-123', description: 'Process ID' })
  processId: string;

  @ApiProperty({ example: 1, description: 'Process version' })
  processVersion: number;

  @ApiProperty({ example: 'manual', description: 'Trigger type of the robot' })
  triggerType: string;

  @ApiProperty({ example: 'personal', description: 'Scope of the robot' })
  scope: string;

  @ApiProperty({
    example: 'running',
    description: 'Simplified status: running | stopped | idle',
    nullable: true,
  })
  status: string | null;
}

export class AllStatusesResponseDto {
  @ApiProperty({ example: 2, description: 'Count of robots in running/executing/pending state' })
  running: number;

  @ApiProperty({ example: 3, description: 'Count of robots in stopping/stopped/cooldown state' })
  stopped: number;

  @ApiProperty({ example: 0, description: 'Count of robots being terminated' })
  terminating: number;

  @ApiProperty({ example: 1, description: 'Count of robots with no state (never ran or no log)' })
  idle: number;

  @ApiProperty({
    type: [RobotStatusItemDto],
    description: 'List of robots with their current status, triggerType, and scope',
  })
  robots: RobotStatusItemDto[];

  @ApiProperty({
    example: { manual: 3, schedule: 2, 'event-gmail': 1 },
    description: 'Count of robots grouped by trigger type',
  })
  triggerTypeCounts: Record<string, number>;

  constructor(partial: Partial<AllStatusesResponseDto>) {
    this.running = partial.running ?? 0;
    this.stopped = partial.stopped ?? 0;
    this.terminating = partial.terminating ?? 0;
    this.idle = partial.idle ?? 0;
    this.robots = partial.robots ?? [];
    this.triggerTypeCounts = partial.triggerTypeCounts ?? {};
  }
}
