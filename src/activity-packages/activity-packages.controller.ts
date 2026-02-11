import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ActivityPackagesService } from './activity-packages.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ApiResponseDto } from 'src/common/dto/api-response.dto';
import { ResponseUtil } from 'src/common/utils/response.util';
import { ActivityPackageResponseDto, ActivityTemplateResponseDto } from './dto/activity-package-response.dto';
import { CreatePackageDto, UploadPackageLibraryDto } from './dto/create-package.dto';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

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
    return ResponseUtil.success(data, 'Active activity packages retrieved successfully');
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all activity packages including inactive (Admin only)' })
  @ApiOkResponse({ type: ApiResponseDto<ActivityPackageResponseDto[]> })
  async findAllForAdmin(): Promise<ApiResponseDto<ActivityPackageResponseDto[]>> {
    const data = await this.activityPackagesService.findAllForAdmin();
    return ResponseUtil.success(data, 'All activity packages retrieved successfully');
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

  @Get(':id')
  @ApiOperation({ summary: 'Get package details' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<any> })
  async getPackage(@Param('id') id: string) {
    const data = await this.activityPackagesService.getPackage(id);
    return ResponseUtil.success(data, 'Package retrieved successfully');
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create new package (Admin only)' })
  @ApiOkResponse({ type: ApiResponseDto<any> })
  async create(@Body() dto: CreatePackageDto, @CurrentUser() user: any) {
    const data = await this.activityPackagesService.createPackage(dto, user?.id);
    return ResponseUtil.success(data, 'Package created successfully');
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Toggle package active status (Admin only)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<any> })
  async toggleActive(@Param('id') id: string) {
    const data = await this.activityPackagesService.toggleActive(id);
    return ResponseUtil.success(data, `Package ${data.isActive ? 'activated' : 'deactivated'} successfully`);
  }

  @Patch(':id/active')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Set package active status (Admin only)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ schema: { type: 'object', properties: { isActive: { type: 'boolean' } }, required: ['isActive'] } })
  @ApiOkResponse({ type: ApiResponseDto<any> })
  async setActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    const data = await this.activityPackagesService.setActive(id, isActive);
    return ResponseUtil.success(data, `Package ${data.isActive ? 'activated' : 'deactivated'} successfully`);
  }

  @Post(':id/library')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Upload library to package (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Python library file (.py, .whl)',
        },
        libraryVersion: {
          type: 'string',
          example: '1.0.0',
        },
      },
      required: ['file', 'libraryVersion'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOkResponse({ type: ApiResponseDto<any> })
  async uploadLibrary(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadPackageLibraryDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.activityPackagesService.uploadLibrary(id, file, dto, user?.id);
    return ResponseUtil.success(data, 'Library uploaded successfully');
  }

  @Post(':id/image')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Upload package image (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (png, jpg)',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOkResponse({ type: ApiResponseDto<ActivityPackageResponseDto> })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.activityPackagesService.uploadImage(id, file);
    return ResponseUtil.success(data, 'Image uploaded successfully');
  }

  @Put(':id/library/reparse')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Reparse package library (Admin only)' })
  @ApiOkResponse({ type: ApiResponseDto<any> })
  async reparseLibrary(@Param('id') id: string) {
    const data = await this.activityPackagesService.reparseLibrary(id);
    return ResponseUtil.success(data, 'Library reparsed successfully');
  }

  // ==================== TEMPLATE CRUD ====================

  @Get(':packageId/templates')
  @ApiOperation({ summary: 'Get all templates in a package' })
  @ApiParam({ name: 'packageId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<ActivityTemplateResponseDto[]> })
  async getTemplates(@Param('packageId') packageId: string) {
    const data = await this.activityPackagesService.getTemplates(packageId);
    return ResponseUtil.success(data, 'Templates retrieved successfully');
  }

  @Get(':packageId/templates/:templateId')
  @ApiOperation({ summary: 'Get template details' })
  @ApiParam({ name: 'packageId', type: 'string' })
  @ApiParam({ name: 'templateId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<ActivityTemplateResponseDto> })
  async getTemplate(
    @Param('packageId') packageId: string,
    @Param('templateId') templateId: string,
  ) {
    const data = await this.activityPackagesService.getTemplate(packageId, templateId);
    return ResponseUtil.success(data, 'Template retrieved successfully');
  }

  @Post(':packageId/templates')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create new template in package (Admin only)' })
  @ApiParam({ name: 'packageId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<ActivityTemplateResponseDto> })
  async createTemplate(
    @Param('packageId') packageId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    const data = await this.activityPackagesService.createTemplate(packageId, dto);
    return ResponseUtil.success(data, 'Template created successfully');
  }

  @Put(':packageId/templates/:templateId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update template (Admin only)' })
  @ApiParam({ name: 'packageId', type: 'string' })
  @ApiParam({ name: 'templateId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<ActivityTemplateResponseDto> })
  async updateTemplate(
    @Param('packageId') packageId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    const data = await this.activityPackagesService.updateTemplate(packageId, templateId, dto);
    return ResponseUtil.success(data, 'Template updated successfully');
  }

  @Delete(':packageId/templates/:templateId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete template (Admin only)' })
  @ApiParam({ name: 'packageId', type: 'string' })
  @ApiParam({ name: 'templateId', type: 'string' })
  @ApiOkResponse({ type: ApiResponseDto<void> })
  async deleteTemplate(
    @Param('packageId') packageId: string,
    @Param('templateId') templateId: string,
  ) {
    await this.activityPackagesService.deleteTemplate(packageId, templateId);
    return ResponseUtil.success(null, 'Template deleted successfully');
  }
}

