import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { ProcessVersion } from 'src/processes/entity/processVersions.entity';

export enum AuthenticationProvider {
  GOOGLE = 'Google',
  LOCAL = 'Local',
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

  @OneToMany(() => ProcessVersion, (processVersion) => processVersion.creator)
  processVersions: ProcessVersion[];
}
