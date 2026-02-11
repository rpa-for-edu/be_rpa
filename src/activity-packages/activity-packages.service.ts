import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { ActivityPackage, ParseStatus } from './entity/activity-package.entity';
import { ActivityPackageAccess } from './entity/activity-package-access.entity';
import { ActivityPackageResponseDto } from './dto/activity-package-response.dto';
import { plainToInstance } from 'class-transformer';
import { S3Service } from 'src/common/services/s3.service';
import { PythonParserService } from './services/python-parser.service';
import { CreatePackageDto, UploadPackageLibraryDto } from './dto/create-package.dto';
import { ActivityTemplate } from './entity/activity-template.entity';
import { Argument } from './entity/argument.entity';
import * as crypto from 'crypto';

@Injectable()
export class ActivityPackagesService {
  private readonly logger = new Logger(ActivityPackagesService.name);

  constructor(
    @InjectRepository(ActivityPackage)
    private packageRepository: Repository<ActivityPackage>,
    @InjectRepository(ActivityPackageAccess)
    private packageAccessRepository: Repository<ActivityPackageAccess>,
    @InjectRepository(ActivityTemplate)
    private templateRepository: Repository<ActivityTemplate>,
    private s3Service: S3Service,
    private pythonParser: PythonParserService,
    private dataSource: DataSource,
  ) {}

  // Get only ACTIVE packages (for normal users)
  async findAll(): Promise<ActivityPackageResponseDto[]> {
    const packages = await this.packageRepository.find({
      where: { isActive: true },
      select: [
        'id',
        'displayName',
        'description',
        'library',
        'version',
        'imageKey',
        'isActive',
        'createdAt',
        'updatedAt',
        'libraryS3Url',
      ],
      relations: [
        'activityTemplates',
        'activityTemplates.arguments',
        'activityTemplates.returnValue',
      ],
      order: {
        displayName: 'ASC',
        activityTemplates: {
          name: 'ASC',
        },
      },
    });

    // DEBUG LOG
    console.log('Allocated packages:', packages.length);
    packages.forEach(p => {
      console.log(`Package: ${p.displayName}, Templates: ${p.activityTemplates?.length}`);
      if (p.imageKey) {
        p.imageUrl = this.s3Service.getS3Url(p.imageKey);
      }
    });

    return plainToInstance(ActivityPackageResponseDto, packages, {
      excludeExtraneousValues: false,
    });
  }

  // Get ALL packages including inactive (for admin)
  async findAllForAdmin(): Promise<ActivityPackageResponseDto[]> {
    const packages = await this.packageRepository.find({
      select: [
        'id',
        'displayName',
        'description',
        'library',
        'version',
        'imageKey',
        'isActive',
        'createdAt',
        'updatedAt',
        'parseStatus',
        'parseError',
        'libraryFileName',
        'libraryVersion',
        'libraryS3Url',
      ],
      relations: [
        'activityTemplates',
        'activityTemplates.arguments',
        'activityTemplates.returnValue',
      ],
      order: {
        isActive: 'DESC', // Active packages first
        displayName: 'ASC',
        activityTemplates: {
          name: 'ASC',
        },
      },
    });

    packages.forEach(p => {
      if (p.imageKey) {
        p.imageUrl = this.s3Service.getS3Url(p.imageKey);
      }
    });

    return plainToInstance(ActivityPackageResponseDto, packages, {
      excludeExtraneousValues: false,
    });
  }

  // Get packages accessible by a team
  async findByTeam(teamId: string): Promise<ActivityPackageResponseDto[]> {
    const accessList = await this.packageAccessRepository.find({
      where: { teamId, hasAccess: true },
    });

    if (accessList.length === 0) {
      // If team has no specific access, return public packages? 
      // Current logic strictly filters by access.
      // If needed, check if we should return default active packages.
      // For now, let's stick to explicit access + active packages.
      
      // However, if logic implies ALL active packages are available effectively if no restriction,
      // verify requirement. Assuming access control is strict.
      return [];
    }

    const packageIds = accessList.map((access) => access.packageId);
    const packages = await this.packageRepository.find({
      where: {
        id: In(packageIds),
        isActive: true,
      },
      select: [
        'id',
        'displayName',
        'description',
        'library',
        'version',
        'imageKey',
        'isActive',
        'createdAt',
        'updatedAt',
        'libraryS3Url',
      ],
      relations: [
        'activityTemplates',
        'activityTemplates.arguments',
        'activityTemplates.returnValue',
      ],
      order: {
        displayName: 'ASC',
        activityTemplates: {
          name: 'ASC',
        },
      },
    });

    return plainToInstance(ActivityPackageResponseDto, packages, {
      excludeExtraneousValues: false,
    });
  }

  // Grant access to a package for a team
  async grantAccess(packageId: string, teamId: string) {
    const existing = await this.packageAccessRepository.findOne({
      where: { packageId, teamId },
    });

    if (existing) {
      existing.hasAccess = true;
      return this.packageAccessRepository.save(existing);
    }

    return this.packageAccessRepository.save({
      packageId,
      teamId,
      hasAccess: true,
    });
  }

  // Revoke access to a package for a team
  async revokeAccess(packageId: string, teamId: string) {
    const existing = await this.packageAccessRepository.findOne({
      where: { packageId, teamId },
    });

    if (existing) {
      existing.hasAccess = false;
      return this.packageAccessRepository.save(existing);
    }
  }

  // Check if a team has access to a package
  async hasAccess(packageId: string, teamId: string): Promise<boolean> {
    const access = await this.packageAccessRepository.findOne({
      where: { packageId, teamId, hasAccess: true },
    });

    return !!access;
  }

  // Get all teams that have access to a package
  async getTeamsWithAccess(packageId: string) {
    return this.packageAccessRepository.find({
      where: { packageId, hasAccess: true },
      relations: ['team'],
    });
  }

  // Create Package
  async createPackage(dto: CreatePackageDto, userId?: number): Promise<ActivityPackage> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(ActivityPackage, { where: { id: dto.id } });
      if (existing) {
        throw new BadRequestException(`Package with ID ${dto.id} already exists`);
      }

      const pkg = queryRunner.manager.create(ActivityPackage, {
        ...dto,
        isActive: true,
        createdBy: { id: userId } as any,
      });

      const savedPackage = await queryRunner.manager.save(ActivityPackage, pkg);

      await queryRunner.commitTransaction();
      return savedPackage;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Get Package Details
  async getPackage(id: string): Promise<ActivityPackage> {
    const pkg = await this.packageRepository.findOne({
      where: { id },
      select: [
        'id',
        'displayName',
        'description',
        'library',
        'version',
        'imageKey',
        'isActive',
        'createdAt',
        'updatedAt',
        'libraryFileName',
        'libraryVersion',
        'parseStatus',
        'parseError',
        'libraryS3Url',
      ],
      relations: ['activityTemplates', 'activityTemplates.arguments', 'createdBy'],
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    if (pkg.imageKey) {
      pkg.imageUrl = this.s3Service.getS3Url(pkg.imageKey);
    }

    return pkg;
  }

  // Upload Library
  async uploadLibrary(
    packageId: string,
    file: Express.Multer.File,
    dto: UploadPackageLibraryDto,
    userId?: number,
  ): Promise<ActivityPackage> {
    const pkg = await this.getPackage(packageId);

    // 1. Calculate checksum
    const checksum = crypto.createHash('sha256').update(file.buffer as any).digest('hex');
    const fileType = file.originalname.split('.').pop() || '';
    const fileName = file.originalname;

    // 2. Upload to S3
    const s3Key = `libraries/${pkg.id}/${dto.libraryVersion}/${fileName}`;
    await this.s3Service.uploadFile(s3Key, file.buffer as any, file.mimetype);
    const s3Url = this.s3Service.getS3URI(s3Key);

    // 3. Parse if it's a Python file
    let parsedData = null;
    let parseStatus = ParseStatus.NOT_APPLICABLE;
    let parseError = null;

    if (fileType.toLowerCase() === 'py') {
      try {
        const fileContent = file.buffer.toString('utf-8');
        parsedData = await this.pythonParser.parseLibraryFile(fileContent);
        parseStatus = ParseStatus.SUCCESS;
      } catch (error) {
        this.logger.error(`Failed to parse library file for package ${pkg.id}`, error);
        parseStatus = ParseStatus.FAILED;
        parseError = error.message;
      }
    }

    // 4. Update Package
    pkg.libraryFileName = fileName;
    pkg.libraryFileType = fileType;
    pkg.libraryS3Key = s3Key;
    pkg.libraryS3Url = s3Url;
    pkg.libraryChecksum = checksum;
    pkg.libraryVersion = dto.libraryVersion;
    pkg.parseStatus = parseStatus;
    pkg.parseError = parseError;
    
    if (parsedData) {
      pkg.parsedKeywords = parsedData.keywords;
      pkg.parsedClasses = parsedData.classes;
      pkg.imports = parsedData.imports;
    }

    await this.packageRepository.save(pkg);

    // 5. Auto-generate templates if parse success
    if (parseStatus === ParseStatus.SUCCESS && parsedData?.keywords?.length > 0) {
      await this.generateTemplatesFromKeywords(pkg, parsedData.keywords);
    }

    return this.getPackage(packageId);
  }

  private async generateTemplatesFromKeywords(
    pkg: ActivityPackage,
    keywords: any[],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete existing auto-generated templates
      await queryRunner.manager.delete(ActivityTemplate, {
        activityPackageId: pkg.id,
        isAutoGenerated: true,
      });

      // Create new templates
      for (const kw of keywords) {
        const template = queryRunner.manager.create(ActivityTemplate, {
          activityPackageId: pkg.id,
          name: kw.name,
          keyword: kw.name, // Usually Python keyword name matches robot usage
          keywordName: kw.name,
          pythonMethod: kw.methodName,
          description: kw.docstring,
          isAutoGenerated: true,
          lineNumber: kw.lineNumber,
        });

        const savedTemplate = await queryRunner.manager.save(ActivityTemplate, template);

        // Create arguments
        if (kw.args && kw.args.length > 0) {
          const args = kw.args.map((arg) => {
            return queryRunner.manager.create(Argument, {
              activityTemplate: savedTemplate,
              name: arg.name,
              keywordArgument: arg.name,
              type: this.mapPythonTypeToRpaType(arg.type),
              defaultValue: JSON.stringify(arg.default),
              isRequired: arg.default === undefined, // Simple logic
              description: '',
            });
          });
          await queryRunner.manager.save(Argument, args);
        }
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      this.logger.error('Failed to generate templates', err);
      await queryRunner.rollbackTransaction();
      // Should we throw? Or just log? 
      // Let's not fail the library upload entirely, but maybe mark package status?
      // For now, just log.
    } finally {
      await queryRunner.release();
    }
  }

  private mapPythonTypeToRpaType(pyType: string): string {
    if (!pyType) return 'string';
    const t = pyType.toLowerCase();
    if (t.includes('int') || t.includes('float')) return 'number';
    if (t.includes('bool')) return 'boolean';
    if (t.includes('list') || t.includes('array')) return 'array';
    if (t.includes('dict')) return 'object';
    return 'string';
  }

  // Reparse library (e.g. if parsing logic changed or retrying)
  async reparseLibrary(packageId: string) {
    const pkg = await this.getPackage(packageId);
    if (!pkg.libraryS3Key) {
      throw new BadRequestException('No library file uploaded to reparse');
    }
    if (pkg.libraryFileType !== 'py') {
      throw new BadRequestException('Only .py files can be parsed');
    }

    const fileContent = await this.s3Service.getFileContent(pkg.libraryS3Key);
    // Reuse upload logic part
    try {
      const parsedData = await this.pythonParser.parseLibraryFile(fileContent);
      pkg.parsedKeywords = parsedData.keywords;
      pkg.parsedClasses = parsedData.classes;
      pkg.imports = parsedData.imports;
      pkg.parseStatus = ParseStatus.SUCCESS;
      pkg.parseError = null;
      await this.packageRepository.save(pkg);
      
      await this.generateTemplatesFromKeywords(pkg, parsedData.keywords);
      
      if (pkg.imageKey) {
      pkg.imageUrl = this.s3Service.getS3Url(pkg.imageKey);
    }
    return pkg;
    } catch (error) {
      pkg.parseStatus = ParseStatus.FAILED;
      pkg.parseError = error.message;
      await this.packageRepository.save(pkg);
      throw error;
    }
  }

  // ==================== TOGGLE ACTIVE ====================
  
  async toggleActive(packageId: string): Promise<ActivityPackage> {
    const pkg = await this.getPackage(packageId);
    pkg.isActive = !pkg.isActive;
    return this.packageRepository.save(pkg);
  }

  async setActive(packageId: string, isActive: boolean): Promise<ActivityPackage> {
    const pkg = await this.getPackage(packageId);
    pkg.isActive = isActive;
    return this.packageRepository.save(pkg);
  }

  // ==================== TEMPLATE CRUD ====================

  async getTemplates(packageId: string): Promise<ActivityTemplate[]> {
    await this.getPackage(packageId); // Ensure package exists
    return this.templateRepository.find({
      where: { activityPackageId: packageId },
      relations: ['arguments', 'returnValue'],
      order: { name: 'ASC' },
    });
  }

  async getTemplate(packageId: string, templateId: string): Promise<ActivityTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, activityPackageId: packageId },
      relations: ['arguments', 'returnValue'],
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found in package ${packageId}`);
    }

    return template;
  }

  async createTemplate(packageId: string, dto: any): Promise<ActivityTemplate> {
    await this.getPackage(packageId); // Ensure package exists

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create template
      const template = queryRunner.manager.create(ActivityTemplate, {
        activityPackageId: packageId,
        name: dto.name,
        description: dto.description,
        keyword: dto.keyword,
        keywordName: dto.keywordName,
        pythonMethod: dto.pythonMethod,
        isAutoGenerated: false,
      });

      const savedTemplate = await queryRunner.manager.save(ActivityTemplate, template);

      // Create arguments if provided
      if (dto.arguments && dto.arguments.length > 0) {
        const args = dto.arguments.map((arg: any) => {
          return queryRunner.manager.create(Argument, {
            activityTemplate: savedTemplate,
            name: arg.name,
            description: arg.description,
            type: arg.type,
            keywordArgument: arg.keywordArgument,
            isRequired: arg.isRequired ?? true,
            defaultValue: arg.defaultValue ? JSON.stringify(arg.defaultValue) : null,
          });
        });
        await queryRunner.manager.save(Argument, args);
      }

      // Create return value if provided
      if (dto.returnValue) {
        const { ReturnValue } = await import('./entity/return-value.entity');
        const returnVal = queryRunner.manager.create(ReturnValue, {
          activityTemplate: savedTemplate,
          type: dto.returnValue.type,
          description: dto.returnValue.description,
          displayName: dto.returnValue.displayName,
        });
        await queryRunner.manager.save(ReturnValue, returnVal);
      }

      await queryRunner.commitTransaction();
      return this.getTemplate(packageId, savedTemplate.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateTemplate(packageId: string, templateId: string, dto: any): Promise<ActivityTemplate> {
    const template = await this.getTemplate(packageId, templateId);

    // Update basic fields
    if (dto.name !== undefined) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.keyword !== undefined) template.keyword = dto.keyword;
    if (dto.keywordName !== undefined) template.keywordName = dto.keywordName;
    if (dto.pythonMethod !== undefined) template.pythonMethod = dto.pythonMethod;

    await this.templateRepository.save(template);

    // If arguments are provided, replace them
    if (dto.arguments !== undefined) {
      const { Argument } = await import('./entity/argument.entity');
      // Delete existing arguments
      await this.dataSource.manager.delete(Argument, { activityTemplate: { id: templateId } });

      // Create new arguments
      if (dto.arguments.length > 0) {
        const args = dto.arguments.map((arg: any) => {
          return this.dataSource.manager.create(Argument, {
            activityTemplate: template,
            name: arg.name,
            description: arg.description,
            type: arg.type,
            keywordArgument: arg.keywordArgument,
            isRequired: arg.isRequired ?? true,
            defaultValue: arg.defaultValue ? JSON.stringify(arg.defaultValue) : null,
          });
        });
        await this.dataSource.manager.save(Argument, args);
      }
    }

    // If returnValue is provided, replace it
    if (dto.returnValue !== undefined) {
      const { ReturnValue } = await import('./entity/return-value.entity');
      // Delete existing return value
      await this.dataSource.manager.delete(ReturnValue, { activityTemplate: { id: templateId } });

      if (dto.returnValue) {
        const returnVal = this.dataSource.manager.create(ReturnValue, {
          activityTemplate: template,
          type: dto.returnValue.type,
          description: dto.returnValue.description,
          displayName: dto.returnValue.displayName,
        });
        await this.dataSource.manager.save(ReturnValue, returnVal);
      }
    }

    return this.getTemplate(packageId, templateId);
  }

  async deleteTemplate(packageId: string, templateId: string): Promise<void> {
    const template = await this.getTemplate(packageId, templateId);
    await this.templateRepository.remove(template);
  }

  // Upload Image
  async uploadImage(packageId: string, file: Express.Multer.File): Promise<ActivityPackageResponseDto> {
    const pkg = await this.getPackage(packageId);

    // Upload to S3
    const fileType = file.originalname.split('.').pop() || 'png';
    const s3Key = `images/packages/${packageId}/icon.${fileType}`;
    
    // Explicit content type
    const contentType = file.mimetype;
    
    await this.s3Service.uploadFile(s3Key, file.buffer as any, contentType);

    pkg.imageKey = s3Key;
    await this.packageRepository.save(pkg);

    // Return with URL
    pkg.imageUrl = this.s3Service.getS3Url(s3Key);
    return plainToInstance(ActivityPackageResponseDto, pkg);
  }
}
