import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { User } from 'src/users/entity/user.entity';
import { Role } from './role.entity';
import { InvitationStatus } from '../enums/InvitationStatus.enum';

@Entity('team_invitation')
export class TeamInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Team, (team) => team.invitations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column()
  teamId: string;

  @Column()
  invitedEmail: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invitedUserId' })
  invitedUser: User;

  @Column({ nullable: true })
  invitedUserId: number;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column()
  roleId: string;

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
