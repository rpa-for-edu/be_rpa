import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ActivityTemplate } from './activity-template.entity';

@Entity('argument')
export class Argument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'description_vi', nullable: true })
  descriptionVi: string;

  @Column()
  type: string; // VD: "string", "number", "boolean", "object", "array"

  @Column({ nullable: true })
  keywordArgument: string; // Tên argument khi gọi Python

  @Column({ default: false })
  isRequired: boolean;

  @Column({ type: 'text', nullable: true })
  defaultValue: any;

  @ManyToOne(() => ActivityTemplate, (template) => template.arguments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activityTemplateId' })
  activityTemplate: ActivityTemplate;

  @Column()
  activityTemplateId: string;
}
