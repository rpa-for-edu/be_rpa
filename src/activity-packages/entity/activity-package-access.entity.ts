import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { Team } from 'src/workspace/entity/team.entity';

@Entity('activity_package_access')
@Unique(['packageId', 'teamId'])
export class ActivityPackageAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  packageId: string;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column()
  teamId: string;

  @Column({ default: true })
  hasAccess: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
