import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { ProcessVersion } from 'src/processes/entity/processVersions.entity';

export enum AuthenticationProvider {
  GOOGLE = 'Google',
  LOCAL = 'Local',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum Language {
  VI = 'vi',
  EN = 'en',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    unique: true,
  })
  email: string;

  @Column({
    nullable: true,
  })
  avatarUrl: string;

  @Exclude()
  @Column({
    nullable: true,
  })
  hashedPassword: string;

  @Column({
    nullable: false,
    type: 'enum',
    enum: AuthenticationProvider,
    default: AuthenticationProvider.LOCAL,
  })
  provider: string;

  @Exclude()
  @Column({
    nullable: true,
  })
  providerId: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: Language,
    default: Language.VI,
  })
  language: Language;

  @OneToMany(() => ProcessVersion, (processVersion) => processVersion.creator)
  processVersions: ProcessVersion[];
}
