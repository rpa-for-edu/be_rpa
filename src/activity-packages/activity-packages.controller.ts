import { Controller, Get, Param } from '@nestjs/common';
import { ActivityPackagesService } from './activity-packages.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiParam } from '@nestjs/swagger';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { ResponseUtil } from 'src/common/utils/response.util';
import { ActivityPackageResponseDto } from './dto/activity-package-response.dto';

@Controller('activity-packages')
@ApiTags('activity-packages')
@ApiBearerAuth()
export class ActivityPackagesController {
  constructor(private readonly activityPackagesService: ActivityPackagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active activity packages' })
  @ApiOkResponse({ type: ApiResponseDto<ActivityPackageResponseDto[]> })
  async findAll(): Promise<ApiResponseDto<ActivityPackageResponseDto[]>> {
    const data = await this.activityPackagesService.findAll();
    return ResponseUtil.success(data, 'Activity packages retrieved successfully');
  }

  @Get('team/:teamId')
  @ApiOperation({ summary: 'Get activity packages accessible by team' })
  @ApiParam({ name: 'teamId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<ActivityPackageResponseDto[]> })
  async findByTeam(
    @Param('teamId') teamId: string,
  ): Promise<ApiResponseDto<ActivityPackageResponseDto[]>> {
    const data = await this.activityPackagesService.findByTeam(teamId);
    return ResponseUtil.success(data, 'Team activity packages retrieved successfully');
  }
}
