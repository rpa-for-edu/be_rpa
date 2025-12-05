import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ example: 'permission-uuid-123' })
  id: string;

  @ApiProperty({ example: 'View Process' })
  name: string;

  @ApiProperty({ example: 'process' })
  resource: string;

  @ApiProperty({ example: 'view' })
  action: string;

  @ApiPropertyOptional({ example: 'Permission to view process details' })
  description?: string;
}
