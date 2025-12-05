import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'My Workspace' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'A workspace for our team' })
  description?: string;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Updated Workspace Name' })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Updated description' })
  description?: string;
}
