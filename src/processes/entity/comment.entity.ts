import { User } from 'src/users/entity/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ProcessVersion } from './processVersions.entity';
import { Process } from './process.entity';

@Entity('comments')
export class CommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  commentText: string;

  @CreateDateColumn()
  createdAt: Date;

  /* ================== USER ================== */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  user_id: number;

  /* ================== PROCESS VERSION ================== */
  @ManyToOne(() => ProcessVersion, (version) => version.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'process_version_id' })
  processVersion: ProcessVersion;

  @ManyToOne(() => Process, (process) => process.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'process_id' })
  process: Process;

  @Column()
  process_id: string;

  @Column({ nullable: true })
  process_version_id: string;

  @Column()
  node_id?: string;
}
