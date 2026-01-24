import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TeamMember } from './entity/team-member.entity';
import { Team } from './entity/team.entity';
import { Process } from 'src/processes/entity/process.entity';
import { ProcessDetail } from 'src/processes/schema/process.schema';
import { ActivityPackageAccess } from 'src/activity-packages/entity/activity-package-access.entity';

@Injectable()
export class TeamPermissionService {
  constructor(
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Process)
    private processRepository: Repository<Process>,
    @InjectRepository(ActivityPackageAccess)
    private packageAccessRepository: Repository<ActivityPackageAccess>,
    @InjectModel(ProcessDetail.name)
    private processDetailModel: Model<ProcessDetail>,
  ) {}

  /**
   * Check if user is team member and return member with full permissions
   */
  async checkTeamMember(teamId: string, userId: number): Promise<TeamMember> {
    const member = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
      relations: [
        'role',
        'role.permissions',
        'role.activityTemplates',
        'role.activityTemplates.activityPackage',
      ],
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this team');
    }

    return member;
  }

  /**
   * Check if member has specific permission
   */
  checkPermission(member: TeamMember, permissionName: string): boolean {
    // Owner role has all permissions
    if (member.role && member.role.name === 'Owner') {
      return true;
    }

    if (!member.role || !member.role.permissions) {
      return false;
    }

    return member.role.permissions.some((p) => p.name === permissionName);
  }

  /**
   * Require permission or throw exception
   */
  requirePermission(member: TeamMember, permissionName: string): void {
    if (!this.checkPermission(member, permissionName)) {
      throw new ForbiddenException(`You don't have '${permissionName}' permission in this team`);
    }
  }

  /**
   * Check if team has access to package
   */
  async checkPackageAccess(teamId: string, packageId: string): Promise<boolean> {
    const access = await this.packageAccessRepository.findOne({
      where: { teamId, packageId },
    });

    return !!access;
  }

  /**
   * Require package access or throw exception
   */
  async requirePackageAccess(
    teamId: string,
    packageId: string,
    packageName?: string,
  ): Promise<void> {
    const hasAccess = await this.checkPackageAccess(teamId, packageId);

    if (!hasAccess) {
      throw new ForbiddenException(
        `Team doesn't have access to package: ${packageName || packageId}`,
      );
    }
  }

  /**
   * Check if member's role has access to activity template
   */
  checkTemplateAccess(member: TeamMember, templateId: string): boolean {
    // Owner role has access to all templates
    if (member.role && member.role.name === 'Owner') {
      return true;
    }

    if (!member.role || !member.role.activityTemplates) {
      return false;
    }

    return member.role.activityTemplates.some((t) => t.id === templateId);
  }

  /**
   * Require template access or throw exception
   */
  requireTemplateAccess(member: TeamMember, templateId: string, templateName?: string): void {
    if (!this.checkTemplateAccess(member, templateId)) {
      throw new ForbiddenException(
        `Your role doesn't have access to template: ${templateName || templateId}`,
      );
    }
  }

  /**
   * Get team with workspace info
   */
  async getTeamWithWorkspace(teamId: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ['workspace'],
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  /**
   * Validate process templates against team permissions
   * Returns array of validation errors (empty if all valid)
   */
  async validateProcessTemplates(
    teamId: string,
    member: TeamMember,
    activityTemplateIds: string[],
  ): Promise<string[]> {
    // Owner role has access to all templates and packages
    if (member.role && member.role.name === 'Owner') {
      return [];
    }

    const errors: string[] = [];

    // Get all templates with their packages
    const templates = member.role.activityTemplates || [];
    const allowedTemplateIds = new Set(templates.map((t) => t.id));

    for (const templateId of activityTemplateIds) {
      // Check if role has access to template
      if (!allowedTemplateIds.has(templateId)) {
        const template = templates.find((t) => t.id === templateId);
        errors.push(`Your role doesn't have access to template: ${template?.name || templateId}`);
        continue;
      }

      // Check if team has access to template's package
      const template = templates.find((t) => t.id === templateId);
      if (template && template.activityPackage) {
        const hasPackageAccess = await this.checkPackageAccess(teamId, template.activityPackage.id);
        if (!hasPackageAccess) {
          errors.push(
            `Team doesn't have access to package: ${template.activityPackage.displayName}`,
          );
        }
      }
    }

    return errors;
  }

  /**
   * Validate robot's process templates against team permissions
   * This checks if user has permission to use all templates in the process
   */
  async validateRobotProcess(
    teamId: string,
    processId: string,
    member: TeamMember,
  ): Promise<string[]> {
    // Get process
    const process = await this.processRepository.findOne({
      where: { id: processId, teamId },
    });

    if (!process) {
      throw new NotFoundException('Process not found in this team');
    }

    // Get process details from MongoDB
    const processDetail = await this.processDetailModel.findOne({
      processId,
      versionId: process.version.toString(),
    });

    if (!processDetail || !processDetail.activities) {
      return []; // No activities to validate
    }

    // Extract template IDs from activities
    const templateIds = this.extractTemplateIdsFromActivities(processDetail.activities);

    // Validate templates
    return this.validateProcessTemplates(teamId, member, templateIds);
  }

  /**
   * Extract activity template IDs from process activities
   */
  private extractTemplateIdsFromActivities(activities: any[]): string[] {
    const templateIds = new Set<string>();

    for (const activity of activities) {
      // Check if activity has template ID
      if (activity.activityTemplateId) {
        templateIds.add(activity.activityTemplateId);
      }
      // Also check in properties if needed
      if (activity.properties?.activityTemplateId) {
        templateIds.add(activity.properties.activityTemplateId);
      }
    }

    return Array.from(templateIds);
  }
}
