import { ApiProperty } from '@nestjs/swagger';

export class JobsHistoryResponseDto {
  @ApiProperty({ example: 6, description: 'Count of executions where passed > 0 AND failed = 0' })
  successful: number;

  @ApiProperty({ example: 2, description: 'Count of executions where failed > 0' })
  faulted: number;

  @ApiProperty({ example: 0, description: 'Count of executions that were stopped' })
  stopped: number;

  @ApiProperty({ example: 8, description: 'Total count of all executions' })
  total: number;

  constructor(partial: Partial<JobsHistoryResponseDto>) {
    this.successful = partial.successful ?? 0;
    this.faulted = partial.faulted ?? 0;
    this.stopped = partial.stopped ?? 0;
    this.total = partial.total ?? 0;
  }
}
