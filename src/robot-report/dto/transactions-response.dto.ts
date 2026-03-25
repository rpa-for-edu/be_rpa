import { ApiProperty } from '@nestjs/swagger';

export class TransactionsResponseDto {
  @ApiProperty({
    example: ['04:00', '05:00', '06:00', '07:00', '08:00'],
    description: 'Time bucket labels for x-axis',
  })
  labels: string[];

  @ApiProperty({
    example: [0, 1, 3, 2, 1],
    description: 'Count of transactions in each time bucket',
  })
  data: number[];

  @ApiProperty({ example: 7, description: 'Total transaction count in the period' })
  total: number;

  constructor(partial: Partial<TransactionsResponseDto>) {
    this.labels = partial.labels ?? [];
    this.data = partial.data ?? [];
    this.total = partial.total ?? 0;
  }
}
