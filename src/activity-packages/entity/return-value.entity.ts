import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { ActivityTemplate } from './activity-template.entity';

@Entity('return_value')
export class ReturnValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // "string", "boolean", "number", "object", "Browser", "Array<string>", etc.

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'description_vi', nullable: true })
  descriptionVi: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ name: 'display_name_vi', nullable: true })
  displayNameVi: string;

  @OneToOne(() => ActivityTemplate, (template) => template.returnValue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activityTemplateId' })
  activityTemplate: ActivityTemplate;

  @Column()
  activityTemplateId: string;
}
