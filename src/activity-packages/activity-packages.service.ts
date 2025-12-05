import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ActivityPackage } from './entity/activity-package.entity';
import { ActivityPackageAccess } from './entity/activity-package-access.entity';
import { ActivityPackageResponseDto } from './dto/activity-package-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ActivityPackagesService {
  constructor(
    @InjectRepository(ActivityPackage)
    private packageRepository: Repository<ActivityPackage>,
    @InjectRepository(ActivityPackageAccess)
    private packageAccessRepository: Repository<ActivityPackageAccess>,
  ) {}

  async findAll(): Promise<ActivityPackageResponseDto[]> {
    const packages = await this.packageRepository.find({
      where: { isActive: true },
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

  // Get packages accessible by a team
  async findByTeam(teamId: string): Promise<ActivityPackageResponseDto[]> {
    const accessList = await this.packageAccessRepository.find({
      where: { teamId, hasAccess: true },
    });

    if (accessList.length === 0) {
      return [];
    }

    const packageIds = accessList.map((access) => access.packageId);
    const packages = await this.packageRepository.find({
      where: {
        id: In(packageIds),
        isActive: true,
      },
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
}
