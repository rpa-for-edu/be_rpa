import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { Role } from './role.entity';
import { TeamMember } from './team-member.entity';
import { TeamInvitation } from './team-invitation.entity';

@Entity('team')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.teams, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  workspaceId: string;

  @OneToMany(() => Role, (role) => role.team)
  roles: Role[];

  @OneToMany(() => TeamMember, (member) => member.team)
  members: TeamMember[];

  @OneToMany(() => TeamInvitation, (invitation) => invitation.team)
  invitations: TeamInvitation[];

  @CreateDateColumn()
  createdAt: Date;
}
