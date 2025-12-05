import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { ActivityTemplate } from './activity-template.entity';

@Entity('activity_package')
export class ActivityPackage {
  @PrimaryColumn()
  id: string; // VD: "google_workspace", "browser_automation"

  @Column()
  displayName: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  imageKey: string; // Lưu trữ image trên CDN, VD: "activity-packages/google_workspace.png"

  @Column({ nullable: true })
  library: string; // VD: "RPA.Cloud.Google"

  @Column({ nullable: true })
  version: string; // VD: "1.0.0"

  @Column({ nullable: true })
  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => ActivityTemplate, (template) => template.activityPackage)
  activityTemplates: ActivityTemplate[];
}
