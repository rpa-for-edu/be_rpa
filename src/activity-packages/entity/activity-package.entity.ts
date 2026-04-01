import { Entity, Column, PrimaryColumn, OneToMany, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ActivityTemplate } from './activity-template.entity';
import { User } from '../../users/entity/user.entity';

export enum ParseStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  NOT_APPLICABLE = 'not_applicable',
}

export interface ParsedKeyword {
  name: string; // "Setup ERPNext Connection"
  methodName: string; // "setup_erpnext_connection"
  args: Array<{
    name: string;
    type?: string;
    default?: any;
  }>;
  docstring?: string;
  lineNumber: number;
}

export interface ParsedClass {
  name: string;
  methods: string[];
  initArgs: Array<{
    name: string;
    type?: string;
    default?: any;
  }>;
  docstring?: string;
}

@Entity('activity_package')
export class ActivityPackage {
  @PrimaryColumn()
  id: string; // VD: "google_workspace", "browser_automation"

  @Column()
  displayName: string;

  @Column({ name: 'display_name_vi', nullable: true })
  displayNameVi: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'description_vi', nullable: true })
  descriptionVi: string;

  @Column({ nullable: true })
  imageKey: string; // Lưu trữ image trên CDN, VD: "activity-packages/google_workspace.png"

  imageUrl?: string;

  @Column({ nullable: true })
  library: string; // VD: "RPA.Cloud.Google" (keep for backward compatibility)

  @Column({ nullable: true })
  version: string; // VD: "1.0.0"

  @Column({ default: true })
  isActive: boolean;

  // NEW: Library file info
  @Column({ name: 'library_file_name', nullable: true })
  libraryFileName: string;

  @Column({ name: 'library_file_type', nullable: true })
  libraryFileType: string;

  @Column({ name: 'library_s3_bucket', nullable: true, default: 'rpa-robot-bktest' })
  libraryS3Bucket: string;

  @Column({ name: 'library_s3_key', nullable: true })
  libraryS3Key: string;

  @Column({ name: 'library_s3_url', type: 'text', nullable: true })
  libraryS3Url: string;

  @Column({ name: 'library_checksum', nullable: true })
  libraryChecksum: string; // SHA256

  @Column({ name: 'library_version', nullable: true })
  libraryVersion: string;

  // NEW: Parsed metadata (for .py files)
  @Column({ name: 'parsed_keywords', type: 'json', nullable: true })
  parsedKeywords: ParsedKeyword[];

  @Column({ name: 'parsed_classes', type: 'json', nullable: true })
  parsedClasses: ParsedClass[];

  @Column({ type: 'json', nullable: true })
  imports: string[];

  // NEW: Parse status
  @Column({
    name: 'parse_status',
    type: 'enum',
    enum: ParseStatus,
    default: ParseStatus.PENDING,
    nullable: true,
  })
  parseStatus: ParseStatus;

  @Column({ name: 'parse_error', type: 'text', nullable: true })
  parseError: string;

  // Audit
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at', nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt: Date;

  @OneToMany(() => ActivityTemplate, (template) => template.activityPackage)
  activityTemplates: ActivityTemplate[];
}
