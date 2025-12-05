import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionAction, PermissionResource } from '../../entity/permission.entity';

export class CreatePermissionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'View Process' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Permission to view process details' })
  description?: string;

  @IsNotEmpty()
  @IsEnum(PermissionResource)
  @ApiProperty({
    enum: PermissionResource,
    example: PermissionResource.PROCESS,
  })
  resource: PermissionResource;

  @IsNotEmpty()
  @IsEnum(PermissionAction)
  @ApiProperty({
    enum: PermissionAction,
    example: PermissionAction.VIEW,
  })
  action: PermissionAction;
}

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'View Process' })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Permission to view process details' })
  description?: string;

  @IsOptional()
  @IsEnum(PermissionResource)
  @ApiPropertyOptional({
    enum: PermissionResource,
    example: PermissionResource.PROCESS,
  })
  resource?: PermissionResource;

  @IsOptional()
  @IsEnum(PermissionAction)
  @ApiPropertyOptional({
    enum: PermissionAction,
    example: PermissionAction.VIEW,
  })
  action?: PermissionAction;
}
