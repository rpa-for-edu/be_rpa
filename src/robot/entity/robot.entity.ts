import {
  Entity,
  Column,
  ManyToOne,
  PrimaryColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from 'src/users/entity/user.entity';
import { Process } from 'src/processes/entity/process.entity';
import { Workspace } from 'src/workspace/entity/workspace.entity';
import { Team } from 'src/workspace/entity/team.entity';

export enum TriggerType {
  SCHEDULE = 'schedule',
  MANUAL = 'manual',
  EVENT_GMAIL = 'event-gmail',
  EVENT_DRIVE = 'event-drive',
  EVENT_FORMS = 'event-forms',
}

export enum RobotScope {
  PERSONAL = 'personal',
  TEAM = 'team',
  WORKSPACE = 'workspace',
}

@Entity()
export class Robot {
  @Column({
    nullable: false,
  })
  name: string;

  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  userId: number;

  @ManyToOne(() => User, (user) => user.id)
  user: User;

  @Column()
  processId: string;

  @ManyToOne(() => Process, (process) => process.id)
  process: Process;

  @Column()
  processVersion: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({
    type: 'enum',
    enum: TriggerType,
    default: TriggerType.MANUAL,
  })
  triggerType: TriggerType;

  @Column('uuid', { name: 'robot_key', generated: 'uuid', unique: true })
  robotKey: string;

  @Column({
    type: 'enum',
    enum: RobotScope,
    default: RobotScope.PERSONAL,
  })
  scope: RobotScope;

  @Column({ nullable: true })
  workspaceId: string;

  @ManyToOne(() => Workspace, { nullable: true })
  workspace: Workspace;

  @Column({ nullable: true })
  teamId: string;

  @ManyToOne(() => Team, { nullable: true })
  team: Team;
}
