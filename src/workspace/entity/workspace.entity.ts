import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/users/entity/user.entity';
import { Team } from './team.entity';
import { WorkspaceMember } from './workspace-member.entity';
import { WorkspaceInvitation } from './workspace-invitation.entity';

@Entity('workspace')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  ownerId: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => Team, (team) => team.workspace)
  teams: Team[];

  @OneToMany(() => WorkspaceMember, (member) => member.workspace)
  members: WorkspaceMember[];

  @OneToMany(() => WorkspaceInvitation, (invitation) => invitation.workspace)
  invitations: WorkspaceInvitation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
