import {
  Entity,
  Column,
  ManyToOne,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entity/user.entity';
import { Workspace } from '../../workspace/entity/workspace.entity';
import { Team } from '../../workspace/entity/team.entity';
import { ProcessVersion } from './processVersions.entity';

export enum ProcessScope {
  PERSONAL = 'personal',
  TEAM = 'team',
  WORKSPACE = 'workspace',
}

@Entity()
export class Process {
  @PrimaryColumn()
  id: string;

  @Column({
    nullable: false,
  })
  name: string;

  @Column({
    nullable: true,
  })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // NOTE: can use VersionColumn. Update version manually for now.
  @Column({
    nullable: false,
    default: 0,
  })
  version: number;

  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User, (user) => user.id)
  user: User;

  @Column({
    nullable: true,
  })
  sharedByUserId: number;

  @ManyToOne(() => User, (user) => user.id)
  sharedByUser: User;

  @Column({
    type: 'enum',
    enum: ProcessScope,
    default: ProcessScope.PERSONAL,
  })
  scope: ProcessScope;

  @Column({ nullable: true })
  workspaceId: string;

  @ManyToOne(() => Workspace, { nullable: true })
  workspace: Workspace;

  @Column({ nullable: true })
  teamId: string;

  @ManyToOne(() => Team, { nullable: true })
  team: Team;

  @OneToMany(() => ProcessVersion, (processVersion) => processVersion.process)
  versions: ProcessVersion[];
}
