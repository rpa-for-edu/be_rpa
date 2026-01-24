import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { AuthorizationProvider } from 'src/connection/entity/connection.entity';

@Entity('workspace_connection')
export class WorkspaceConnection {
  @PrimaryColumn({
    nullable: false,
    type: 'enum',
    enum: AuthorizationProvider,
  })
  provider: AuthorizationProvider;

  @PrimaryColumn({
    nullable: false,
  })
  name: string;

  @PrimaryColumn({
    nullable: false,
  })
  workspaceId: string;

  @ManyToOne(() => Workspace, { eager: false })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({
    nullable: false,
  })
  accessToken: string;

  @Column({
    nullable: false,
  })
  refreshToken: string;

  @Column({
    nullable: false,
    name: 'connection_key',
    unique: true,
  })
  connectionKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
