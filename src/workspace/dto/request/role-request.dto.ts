import { IsString, IsOptional, IsNotEmpty, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Developer' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Can view and execute processes' })
  description?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @ApiProperty({ type: [String], example: ['uuid-1', 'uuid-2'], description: 'Permission IDs' })
  permissionIds: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-3', 'uuid-4'],
    description: 'Activity Template IDs',
  })
  templateIds?: string[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Senior Developer' })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Can manage processes' })
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-1', 'uuid-2'],
    description: 'Permission IDs',
  })
  permissionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-3', 'uuid-4'],
    description: 'Activity Template IDs',
  })
  templateIds?: string[];
}
