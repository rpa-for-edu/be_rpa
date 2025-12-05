import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ActivityPackage } from './activity-package.entity';
import { Role } from 'src/workspace/entity/role.entity';
import { Argument } from './argument.entity';
import { ReturnValue } from './return-value.entity';

@Entity('activity_template')
export class ActivityTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ unique: true })
  keyword: string; // VD: "open_browser", "upload_file_to_drive"

  @OneToMany(() => Argument, (arg) => arg.activityTemplate, { cascade: true })
  arguments: Argument[];

  @OneToOne(() => ReturnValue, (returnValue) => returnValue.activityTemplate, {
    cascade: true,
    nullable: true,
  })
  returnValue: ReturnValue;

  @ManyToOne(() => ActivityPackage, (pkg) => pkg.activityTemplates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activityPackageId' })
  activityPackage: ActivityPackage;

  @Column()
  activityPackageId: string;

  @ManyToMany(() => Role, (role) => role.activityTemplates)
  roles: Role[];
}
