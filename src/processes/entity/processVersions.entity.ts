import { User } from 'src/users/entity/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Process } from './process.entity';

@Entity()
export class ProcessVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  processId: string;

  @ManyToOne(() => Process, (process) => process.versions, { onDelete: 'CASCADE' })
  process: Process;

  @Column({ length: 50 })
  tag: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column()
  createdBy: number;

  @ManyToOne(() => User)
  creator: User;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isCurrent: boolean;
}
