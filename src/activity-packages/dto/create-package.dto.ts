import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePackageDto {
  @ApiProperty({ description: 'Package ID (e.g., erpnext, moodle)' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  library?: string; // For backward compatibility

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  libraryVersion?: string;
}

export class UploadPackageLibraryDto {
  @ApiProperty({ description: 'Library version (e.g., 1.0.0)' })
  @IsString()
  @IsNotEmpty()
  libraryVersion: string;
}
