import { Entity, Column, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { Role } from './role.entity';

export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  EDIT = 'edit',
  DELETE = 'delete',
  EXECUTE = 'execute',
}

export enum PermissionResource {
  PROCESS = 'process',
  ROBOT = 'robot',
  DOCUMENT_TEMPLATE = 'document_template',
  TEAM = 'team',
  WORKSPACE = 'workspace',
}

@Entity('permission')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PermissionResource,
  })
  resource: PermissionResource;

  @Column({
    type: 'enum',
    enum: PermissionAction,
  })
  action: PermissionAction;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
