import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { User } from 'src/users/entity/user.entity';
import { WorkspaceMemberRole } from './workspace-member.entity';
import { InvitationStatus } from '../enums/InvitationStatus.enum';

@Entity('workspace_invitation')
export class WorkspaceInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column()
  workspaceId: string;

  @Column()
  invitedEmail: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invitedUserId' })
  invitedUser: User;

  @Column({ nullable: true })
  invitedUserId: number;

  @Column({
    type: 'enum',
    enum: WorkspaceMemberRole,
    default: WorkspaceMemberRole.MEMBER,
  })
  role: WorkspaceMemberRole;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invitedById' })
  invitedBy: User;

  @Column()
  invitedById: number;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @CreateDateColumn()
  createdAt: Date;
}
