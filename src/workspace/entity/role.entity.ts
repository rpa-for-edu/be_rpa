import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { Permission } from './permission.entity';
import { TeamMember } from './team-member.entity';
import { ActivityTemplate } from 'src/activity-packages/entity/activity-template.entity';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isDefault: boolean;

  @ManyToOne(() => Team, (team) => team.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column()
  teamId: string;

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permission',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @ManyToMany(() => ActivityTemplate, (template) => template.roles)
  @JoinTable({
    name: 'role_activity_template',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'activityTemplateId', referencedColumnName: 'id' },
  })
  activityTemplates: ActivityTemplate[];

  @OneToMany(() => TeamMember, (member) => member.role)
  teamMembers: TeamMember[];
}
