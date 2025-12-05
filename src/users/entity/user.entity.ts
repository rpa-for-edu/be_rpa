import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

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
}
