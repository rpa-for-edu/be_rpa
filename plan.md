# 📦 Package & Template Management - Implementation Plan

## 🎯 Mục tiêu
Xây dựng hệ thống quản lý Package và Activity Templates với khả năng:
- **Upload file Python library** (.py, .whl) khi tạo/edit Package
- **Tự động parse file** để extract `@keyword` decorators (Robot Framework)
- **Gợi ý Activity Templates** dựa trên keywords đã parse
- **CRUD Package** với library file và templates đi kèm
- **Robot tự động tải và cài đặt** library từ S3 khi chạy process

**Khác biệt với cách cũ:**
- ❌ Cũ: Hardcode packages trong `packages.json`
- ✅ Mới: Admin upload Python file → Parse keywords → Auto-generate templates → Lưu vào database
- ✅ Library files được lưu trên S3, robot tải về khi chạy

---

## 🏗️ Kiến trúc tổng quan

```
                            ┌──────────────────┐
                            │   Frontend       │
                            │   (Next.js)      │
                            └──────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
         ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
         │  Backend NestJS  │  │  AWS Lambda      │  │   S3 Storage     │
         │  (Main Backend)  │  │  (SAM Functions) │  │                  │
         │                  │  │  - RunRobot      │  │ - robot.json     │
         │  - Packages      │  │  - StopRobot     │  │ - libraries/     │
         │  - Templates     │  │  - GetDetail     │  │ - processes/     │
         │  - Users         │  │  - Schedule      │  └──────────────────┘
         └──────────────────┘  └──────────────────┘           │
                    │                    │                     │
                    ▼                    │                     │
         ┌──────────────────┐           │                     │
         │   PostgreSQL     │           │                     │
         │                  │           │                     │
         │  - packages      │           │                     │
         │  - templates     │           │                     │
         │  - users         │           │                     │
         │  - workspaces    │           │                     │
         └──────────────────┘           │                     │
                                        ▼                     │
                            ┌──────────────────┐              │
                            │   DynamoDB       │              │
                            │                  │              │
                            │  - robot         │◀─────────────┤
                            │  - robot-run     │              │
                            └──────────────────┘              │
                                        │                     │
                                        ▼                     │
                            ┌──────────────────┐              │
                            │  EC2 Instance    │              │
                            │  (Robot Runner)  │◀─────────────┘
                            │                  │
                            │  1. Download     │
                            │     robot.json   │
                            │  2. Install deps │
                            │  3. Install S3   │
                            │     libraries    │
                            │  4. Run robot    │
                            └──────────────────┘
```

**Lưu ý kiến trúc:**
- **Frontend** gọi đến **2 backends**:
  - **NestJS Backend**: Quản lý packages, templates, users (PostgreSQL)
  - **AWS Lambda**: Quản lý robot execution, scheduling (DynamoDB)
- **S3**: Lưu trữ robot.json và libraries (cả 2 backends đều có thể access)
- **EC2**: Được trigger bởi Lambda, download từ S3

---

## 🔄 Flow chi tiết

### 1. Admin Creates Package with Library (NestJS Backend)
```
Admin (Frontend) → POST /api/packages (with library file)
  ↓
NestJS Backend receives:
  - Package info (name, displayName, description, icon)
  - Python library file (.py or .whl)
  ↓
Backend uploads library to S3: s3://bucket/libraries/{packageName}/{version}/file.py
  ↓
Backend parses Python file (if .py):
  - Extract @keyword decorators
  - Extract class definitions
  - Extract __init__ args
  ↓
Backend auto-generates Activity Templates from keywords
  ↓
Save to PostgreSQL:
  - packages table (with library_s3_key, library_checksum)
  - activity_templates table (auto-generated from keywords)
  ↓
Return to Frontend:
  - Package info
  - Suggested templates (for admin to review/edit)
```

### 2. Admin Edits Templates (Frontend)
```
Admin reviews auto-generated templates
  ↓
Admin can:
  - Edit template name, description
  - Modify input arguments (add/remove/edit)
  - Set default values
  - Mark arguments as required/optional
  ↓
Frontend → PUT /api/packages/:id/templates
  ↓
Backend updates activity_templates table
```

### 3. User Creates/Runs Process (Frontend → NestJS → Lambda)
```
User selects activities from package (Frontend)
  ↓
Frontend → POST /api/processes (NestJS Backend)
  ↓
NestJS generates robot.json with:
  - resource.imports: ["RPA.ERPNext"]  # From package.library
  - s3Libraries: [{
      name: "rpa-erpnext",
      version: "1.0.0",
      s3Path: "s3://bucket/libraries/erpnext/1.0.0/ERPNext.py",
      checksum: "abc123...",
      required: true
    }]
  - tasks: [...]  # From selected activities
  ↓
NestJS uploads robot.json to S3
  ↓
NestJS returns s3Key to Frontend
  ↓
Frontend → POST /robot/run (AWS Lambda)
  ↓
Lambda triggers EC2 with ROBOT_FILE env var
```

### 4. Lambda Triggers EC2 (AWS SAM)
```
POST /robot/run (Lambda endpoint)
  ↓
Lambda RunRobotFunction
  ↓
Launch/Start EC2 instance with UserData:
  - ROBOT_FILE=s3://bucket/robots/{userId}/{processId}/{version}/robot.json
  - Run setup.sh
  ↓
Update DynamoDB (robot table) with instance info
```

### 5. EC2 Executes Robot (setup.sh)
```bash
#!/bin/bash
# 1. Download robot.json from S3
aws s3 cp s3://$bucket/$ROBOT_FILE ./robot.json

# 2. Install PyPI dependencies (existing logic)
install_dependencies_from_robot_file "$robot_code"

# 3. Install S3 custom libraries (NEW)
install_s3_dependencies "$robot_code"

# 4. Run robot
python3 -m robot robot.json

# 5. Upload results to DynamoDB
python3 upload_run.py
```

---

## 📊 Database Schema

### 0. User Table (Updated - Add Role)
```sql
-- Add role column to existing users table
ALTER TABLE "user" ADD COLUMN role VARCHAR(20) DEFAULT 'user';

-- Create enum type for roles
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Update column to use enum
ALTER TABLE "user" ALTER COLUMN role TYPE user_role USING role::user_role;

-- Create index for role queries
CREATE INDEX idx_user_role ON "user"(role);

-- Set first user as admin (optional)
UPDATE "user" SET role = 'admin' WHERE id = (SELECT MIN(id) FROM "user");
```

**Role Permissions:**
- `user`: Normal user - can create/run processes, manage own workspaces
- `admin`: System admin - can upload libraries, manage packages, view all users

### 1. Package Table (Updated - Add Library Fields)
```sql
-- Add library-related columns to existing packages table
ALTER TABLE packages ADD COLUMN library_file_name VARCHAR(255);
ALTER TABLE packages ADD COLUMN library_file_type VARCHAR(10); -- 'py', 'whl'
ALTER TABLE packages ADD COLUMN library_s3_bucket VARCHAR(255) DEFAULT 'rpa-robot-bktest';
ALTER TABLE packages ADD COLUMN library_s3_key VARCHAR(500);
ALTER TABLE packages ADD COLUMN library_s3_url TEXT;
ALTER TABLE packages ADD COLUMN library_checksum VARCHAR(64); -- SHA256
ALTER TABLE packages ADD COLUMN library_version VARCHAR(50);

-- Parsed metadata (only for .py files)
ALTER TABLE packages ADD COLUMN parsed_keywords JSONB;
ALTER TABLE packages ADD COLUMN parsed_classes JSONB;
ALTER TABLE packages ADD COLUMN imports JSONB;

-- Parse status
ALTER TABLE packages ADD COLUMN parse_status VARCHAR(20) DEFAULT 'pending'; -- pending, success, failed, not_applicable
ALTER TABLE packages ADD COLUMN parse_error TEXT;

-- Timestamps
ALTER TABLE packages ADD COLUMN created_by INTEGER REFERENCES "user"(id);
ALTER TABLE packages ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Indexes
CREATE INDEX idx_packages_parse_status ON packages(parse_status);
CREATE INDEX idx_packages_library_s3_key ON packages(library_s3_key);
```

**Package Structure After Update:**
```typescript
interface Package {
  // Existing fields
  id: string;
  name: string;
  displayName: string;
  description?: string;
  imageKey?: string;
  library?: string;  // Keep for backward compatibility
  version?: string;
  isActive: boolean;
  
  // NEW: Library file info
  libraryFileName?: string;
  libraryFileType?: 'py' | 'whl';
  libraryS3Bucket?: string;
  libraryS3Key?: string;
  libraryS3Url?: string;
  libraryChecksum?: string;
  libraryVersion?: string;
  
  // NEW: Parsed metadata (for .py files)
  parsedKeywords?: ParsedKeyword[];
  parsedClasses?: ParsedClass[];
  imports?: string[];
  
  // NEW: Parse status
  parseStatus?: 'pending' | 'success' | 'failed' | 'not_applicable';
  parseError?: string;
  
  // Audit
  createdBy?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Activity Template Table (Updated)
```sql
-- Add keyword mapping columns to existing activity_templates table
ALTER TABLE activity_templates ADD COLUMN keyword_name VARCHAR(255);
ALTER TABLE activity_templates ADD COLUMN python_method VARCHAR(255);
ALTER TABLE activity_templates ADD COLUMN is_auto_generated BOOLEAN DEFAULT false;
ALTER TABLE activity_templates ADD COLUMN line_number INTEGER;

CREATE INDEX idx_templates_keyword ON activity_templates(keyword_name);
CREATE INDEX idx_templates_auto_generated ON activity_templates(is_auto_generated);
```

**ActivityTemplate Structure After Update:**
```typescript
interface ActivityTemplate {
  // Existing fields
  id: string;
  packageId: string;
  name: string;
  description?: string;
  keyword: string;
  arguments: Argument[];
  returnValue?: ReturnValue;
  
  // NEW: Keyword mapping
  keywordName?: string;      // e.g., "Setup ERPNext Connection"
  pythonMethod?: string;      // e.g., "setup_erpnext_connection"
  isAutoGenerated?: boolean;  // true if generated from parsing
  lineNumber?: number;        // line number in source file
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. No Separate Libraries Table
**Lý do:** 
- Package và Library có quan hệ 1-1 (mỗi package có 1 library file)
- Không cần quản lý library độc lập
- Đơn giản hóa database schema
- Dễ maintain và query

**So sánh:**
```
❌ Cũ (phức tạp):
libraries table → packages table → activity_templates table

✅ Mới (đơn giản):
packages table (with library fields) → activity_templates table
```

---

## 🔧 Backend Implementation (NestJS)

### Phase 1: Library Module

#### 1.0 Admin Role Guard
**File:** `src/auth/guard/admin.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can access this resource');
    }

    return true;
  }
}
```

**File:** `src/common/decorators/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

**Usage in Controllers:**
```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
@Post('upload')
async uploadLibrary() {
  // Only admins can access
}
```

#### 1.1 File Structure
```
backend/src/library/
├── entities/
│   └── library.entity.ts
├── dto/
│   ├── create-library.dto.ts
│   ├── update-library.dto.ts
│   └── library-response.dto.ts
├── services/
│   ├── library.service.ts
│   └── python-parser.service.ts
├── library.controller.ts
└── library.module.ts
```

#### 1.1 Library Entity
**File:** `src/library/entities/library.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entity/user.entity';

export enum ParseStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface ParsedKeyword {
  name: string;           // "Setup ERPNext Connection"
  methodName: string;     // "setup_erpnext_connection"
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

@Entity('libraries')
export class Library {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  version: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  fileName: string;

  @Column({ length: 10 })
  fileType: string; // 'py', 'whl', 'tar.gz'

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ default: 'rpa-robot-bktest' })
  s3Bucket: string;

  @Column()
  s3Key: string;

  @Column({ type: 'text' })
  s3Url: string;

  @Column()
  checksum: string;

  // Parsed metadata
  @Column({ type: 'jsonb', nullable: true })
  parsedKeywords: ParsedKeyword[];

  @Column({ type: 'jsonb', nullable: true })
  parsedClasses: ParsedClass[];

  @Column({ type: 'jsonb', nullable: true })
  imports: string[];

  @Column({
    type: 'enum',
    enum: ParseStatus,
    default: ParseStatus.PENDING,
  })
  parseStatus: ParseStatus;

  @Column({ type: 'text', nullable: true })
  parseError: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### 1.2 DTOs
**File:** `src/library/dto/create-library.dto.ts`

```typescript
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLibraryDto {
  @ApiProperty({ description: 'Library name (e.g., rpa-erpnext)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Semantic version (e.g., 1.0.0)' })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UploadLibraryResponseDto {
  id: string;
  name: string;
  version: string;
  s3Url: string;
  parseStatus: string;
  parsedKeywords?: ParsedKeyword[];
}
```

#### 1.3 Python Parser Service
**File:** `src/library/services/python-parser.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ParsedKeyword, ParsedClass } from '../entities/library.entity';

@Injectable()
export class PythonParserService {
  private readonly logger = new Logger(PythonParserService.name);

  /**
   * Parse Python file content to extract Robot Framework keywords
   */
  async parseLibraryFile(fileContent: string): Promise<{
    keywords: ParsedKeyword[];
    classes: ParsedClass[];
    imports: string[];
  }> {
    try {
      const keywords = this.extractKeywords(fileContent);
      const classes = this.extractClasses(fileContent);
      const imports = this.extractImports(fileContent);

      return { keywords, classes, imports };
    } catch (error) {
      this.logger.error('Failed to parse library file', error);
      throw error;
    }
  }

  /**
   * Extract @keyword decorated methods
   */
  private extractKeywords(content: string): ParsedKeyword[] {
    const keywords: ParsedKeyword[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Find @keyword decorator
      if (line.startsWith('@keyword(') || line === '@keyword') {
        const keywordNameMatch = line.match(/@keyword\(['"](.*?)['"]\)/);
        const keywordName = keywordNameMatch ? keywordNameMatch[1] : null;

        // Next line should be the method definition
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith('def ')) {
          j++;
        }

        if (j < lines.length) {
          const methodLine = lines[j].trim();
          const methodMatch = methodLine.match(/def\s+(\w+)\s*\((.*?)\)/);
          
          if (methodMatch) {
            const methodName = methodMatch[1];
            const argsString = methodMatch[2];
            const args = this.parseMethodArgs(argsString);

            // Extract docstring
            let docstring = '';
            let k = j + 1;
            if (k < lines.length && lines[k].trim().startsWith('"""')) {
              const docLines = [];
              k++;
              while (k < lines.length && !lines[k].trim().endsWith('"""')) {
                docLines.push(lines[k].trim());
                k++;
              }
              docstring = docLines.join('\n').trim();
            }

            keywords.push({
              name: keywordName || this.methodNameToKeywordName(methodName),
              methodName,
              args,
              docstring,
              lineNumber: j + 1,
            });
          }
        }
      }
    }

    return keywords;
  }

  /**
   * Extract class definitions
   */
  private extractClasses(content: string): ParsedClass[] {
    const classes: ParsedClass[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('class ')) {
        const classMatch = line.match(/class\s+(\w+)/);
        if (classMatch) {
          const className = classMatch[1];
          let initArgs = [];
          let methods = [];
          let j = i + 1;
          let docstring = '';

          // Extract docstring
          if (j < lines.length && lines[j].trim().startsWith('"""')) {
            const docLines = [];
            j++;
            while (j < lines.length && !lines[j].trim().endsWith('"""')) {
              docLines.push(lines[j].trim());
              j++;
            }
            docstring = docLines.join('\n').trim();
            j++;
          }

          // Find methods
          while (j < lines.length && !lines[j].startsWith('class ')) {
            const methodLine = lines[j].trim();
            if (methodLine.startsWith('def ')) {
              const methodMatch = methodLine.match(/def\s+(\w+)\s*\((.*?)\)/);
              if (methodMatch) {
                const methodName = methodMatch[1];
                methods.push(methodName);

                if (methodName === '__init__') {
                  initArgs = this.parseMethodArgs(methodMatch[2]);
                }
              }
            }
            j++;
          }

          classes.push({
            name: className,
            methods,
            initArgs,
            docstring,
          });
        }
      }
    }

    return classes;
  }

  /**
   * Extract import statements
   */
  private extractImports(content: string): string[] {
    const imports = new Set<string>();
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      // import xxx
      const importMatch = trimmed.match(/^import\s+(\w+)/);
      if (importMatch) {
        imports.add(importMatch[1]);
      }

      // from xxx import yyy
      const fromMatch = trimmed.match(/^from\s+(\w+)/);
      if (fromMatch) {
        imports.add(fromMatch[1]);
      }
    }

    return Array.from(imports);
  }

  /**
   * Parse method arguments
   */
  private parseMethodArgs(argsString: string): Array<{
    name: string;
    type?: string;
    default?: any;
  }> {
    if (!argsString || argsString.trim() === '') {
      return [];
    }

    const args = argsString.split(',').map(arg => arg.trim());
    const result = [];

    for (const arg of args) {
      if (arg === 'self') continue;

      let name = arg;
      let type = undefined;
      let defaultValue = undefined;

      // Handle type hints: arg: str = "default"
      if (arg.includes(':')) {
        const parts = arg.split(':');
        name = parts[0].trim();
        const typeAndDefault = parts[1].trim();

        if (typeAndDefault.includes('=')) {
          const typeParts = typeAndDefault.split('=');
          type = typeParts[0].trim();
          defaultValue = typeParts[1].trim();
        } else {
          type = typeAndDefault;
        }
      } else if (arg.includes('=')) {
        // Handle default without type: arg="default"
        const parts = arg.split('=');
        name = parts[0].trim();
        defaultValue = parts[1].trim();
      }

      result.push({
        name,
        type,
        default: defaultValue,
      });
    }

    return result;
  }

  /**
   * Convert method_name to "Method Name"
   */
  private methodNameToKeywordName(methodName: string): string {
    return methodName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate suggested templates from parsed keywords
   */
  generateSuggestedTemplates(keywords: ParsedKeyword[]): Array<{
    keywordName: string;
    displayName: string;
    inputSchema: any[];
    description: string;
  }> {
    return keywords.map(keyword => ({
      keywordName: keyword.name,
      displayName: keyword.name,
      inputSchema: keyword.args.map(arg => ({
        name: arg.name,
        type: this.inferInputType(arg.type),
        required: arg.default === undefined,
        default: arg.default,
        label: this.camelCaseToTitle(arg.name),
      })),
      description: keyword.docstring || `Execute ${keyword.name}`,
    }));
  }

  /**
   * Infer input type from Python type hint
   */
  private inferInputType(pythonType?: string): string {
    if (!pythonType) return 'string';
    
    const typeMap: Record<string, string> = {
      'str': 'string',
      'int': 'number',
      'float': 'number',
      'bool': 'boolean',
      'dict': 'object',
      'list': 'array',
    };

    return typeMap[pythonType.toLowerCase()] || 'string';
  }

  /**
   * Convert camelCase to Title Case
   */
  private camelCaseToTitle(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim();
  }
}
```

#### 1.4 Library Service
**File:** `src/library/library.service.ts`

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Library, ParseStatus } from './entities/library.entity';
import { S3Service } from '../common/services/s3.service';
import { PythonParserService } from './services/python-parser.service';
import { CreateLibraryDto } from './dto/create-library.dto';
import * as crypto from 'crypto';

@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    @InjectRepository(Library)
    private libraryRepository: Repository<Library>,
    private s3Service: S3Service,
    private pythonParser: PythonParserService,
  ) {}

  /**
   * Upload library file to S3 and create database record
   */
  async uploadLibrary(
    file: Express.Multer.File,
    dto: CreateLibraryDto,
    userId: string,
  ): Promise<Library> {
    this.logger.log(`Uploading library: ${dto.name}@${dto.version}`);

    // Calculate checksum
    const checksum = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    // Determine file type
    const fileType = file.originalname.split('.').pop();

    // Upload to S3
    const s3Key = `libraries/${dto.name}/${dto.version}/${file.originalname}`;
    const s3Url = await this.s3Service.uploadFile(
      s3Key,
      file.buffer,
      file.mimetype,
    );

    // Create library record
    const library = this.libraryRepository.create({
      name: dto.name,
      version: dto.version,
      description: dto.description,
      fileName: file.originalname,
      fileType,
      s3Key,
      s3Url,
      fileSize: file.size,
      checksum,
      parseStatus: ParseStatus.PENDING,
      createdBy: { id: userId } as any,
    });

    const saved = await this.libraryRepository.save(library);

    // Parse file asynchronously (only for .py files)
    if (fileType === 'py') {
      this.parseLibraryAsync(saved.id, file.buffer.toString('utf-8'));
    } else {
      // For .whl, .tar.gz files, mark as success without parsing
      await this.libraryRepository.update(saved.id, {
        parseStatus: ParseStatus.SUCCESS,
      });
    }

    return saved;
  }

  /**
   * Parse library file in background
   */
  private async parseLibraryAsync(libraryId: string, fileContent: string) {
    try {
      this.logger.log(`Parsing library: ${libraryId}`);

      const parsed = await this.pythonParser.parseLibraryFile(fileContent);

      await this.libraryRepository.update(libraryId, {
        parsedKeywords: parsed.keywords as any,
        parsedClasses: parsed.classes as any,
        imports: parsed.imports as any,
        parseStatus: ParseStatus.SUCCESS,
      });

      this.logger.log(`Successfully parsed library: ${libraryId}`);
    } catch (error) {
      this.logger.error(`Failed to parse library: ${libraryId}`, error);
      
      await this.libraryRepository.update(libraryId, {
        parseStatus: ParseStatus.FAILED,
        parseError: error.message,
      });
    }
  }

  /**
   * Get library by ID with parsed data
   */
  async getLibrary(id: string): Promise<Library> {
    const library = await this.libraryRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!library) {
      throw new NotFoundException('Library not found');
    }

    return library;
  }

  /**
   * Get suggested templates for a library
   */
  async getSuggestedTemplates(libraryId: string) {
    const library = await this.getLibrary(libraryId);

    if (library.parseStatus !== ParseStatus.SUCCESS || !library.parsedKeywords) {
      return [];
    }

    return this.pythonParser.generateSuggestedTemplates(
      library.parsedKeywords || [],
    );
  }

  /**
   * List all libraries
   */
  async listLibraries(filters?: {
    name?: string;
    parseStatus?: ParseStatus;
  }): Promise<Library[]> {
    const query = this.libraryRepository.createQueryBuilder('library');

    if (filters?.name) {
      query.andWhere('library.name ILIKE :name', {
        name: `%${filters.name}%`,
      });
    }

    if (filters?.parseStatus) {
      query.andWhere('library.parseStatus = :status', {
        status: filters.parseStatus,
      });
    }

    return query
      .orderBy('library.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Delete library
   */
  async deleteLibrary(id: string): Promise<void> {
    const library = await this.getLibrary(id);

    // Delete from S3
    await this.s3Service.deleteFile(library.s3Key);

    // Delete from database
    await this.libraryRepository.delete(id);
  }

  /**
   * Re-parse library file
   */
  async reparseLibrary(id: string): Promise<Library> {
    const library = await this.getLibrary(id);

    if (library.fileType !== 'py') {
      throw new Error('Only .py files can be re-parsed');
    }

    // Download file from S3
    const fileContent = await this.s3Service.getFileContent(library.s3Key);

    // Reset parse status
    await this.libraryRepository.update(id, {
      parseStatus: ParseStatus.PENDING,
      parseError: null,
    });

    // Parse again
    await this.parseLibraryAsync(id, fileContent);

    return this.getLibrary(id);
  }
}
```

#### 1.5 Library Controller
**File:** `src/library/library.controller.ts`

```typescript
import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LibraryService } from './library.service';
import { CreateLibraryDto, UploadLibraryResponseDto } from './dto/create-library.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AdminGuard } from '../auth/guard/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Libraries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('libraries')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  // Admin only - Upload library
  @Post('upload')
  @UseGuards(AdminGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Python library file (.py, .whl, .tar.gz)',
        },
        name: { 
          type: 'string',
          example: 'rpa-erpnext',
        },
        version: { 
          type: 'string',
          example: '1.0.0',
        },
        description: { 
          type: 'string',
          example: 'ERPNext automation library',
        },
      },
      required: ['file', 'name', 'version'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadLibrary(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateLibraryDto,
    @CurrentUser() user: any,
  ): Promise<UploadLibraryResponseDto> {
    const library = await this.libraryService.uploadLibrary(file, dto, user.id);

    return {
      id: library.id,
      name: library.name,
      version: library.version,
      s3Url: library.s3Url,
      parseStatus: library.parseStatus,
      parsedKeywords: library.parsedKeywords,
    };
  }

  // All authenticated users can list libraries
  @Get()
  async listLibraries(
    @Query('name') name?: string,
    @Query('parseStatus') parseStatus?: string,
  ) {
    return this.libraryService.listLibraries({
      name,
      parseStatus: parseStatus as any,
    });
  }

  // All authenticated users can view library details
  @Get(':id')
  async getLibrary(@Param('id') id: string) {
    return this.libraryService.getLibrary(id);
  }

  // All authenticated users can view suggested templates
  @Get(':id/suggested-templates')
  async getSuggestedTemplates(@Param('id') id: string) {
    return this.libraryService.getSuggestedTemplates(id);
  }

  // Admin only - Re-parse library
  @Put(':id/reparse')
  @UseGuards(AdminGuard)
  async reparseLibrary(@Param('id') id: string) {
    return this.libraryService.reparseLibrary(id);
  }

  // Admin only - Delete library
  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteLibrary(@Param('id') id: string) {
    await this.libraryService.deleteLibrary(id);
    return { message: 'Library deleted successfully' };
  }
}
```

#### 1.6 Library Module
**File:** `src/library/library.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { PythonParserService } from './services/python-parser.service';
import { Library } from './entities/library.entity';
import { S3Module } from '../common/modules/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Library]),
    S3Module,
  ],
  controllers: [LibraryController],
  providers: [LibraryService, PythonParserService],
  exports: [LibraryService, PythonParserService],
})
export class LibraryModule {}
```

---

## 🎨 Frontend Implementation (Next.js)

### Phase 2: Library Management UI

#### File Structure
```
frontend/src/
├── pages/
│   └── admin/
│       └── libraries/
│           ├── index.tsx
│           └── [id].tsx
├── components/
│   └── library/
│       ├── UploadLibraryModal.tsx
│       ├── LibraryTable.tsx
│       ├── LibraryDetailsModal.tsx
│       └── SuggestedTemplatesView.tsx
├── api/
│   └── library.ts
└── types/
    └── library.ts
```

#### 2.1 Types
**File:** `src/types/library.ts`

```typescript
export interface Library {
  id: string;
  name: string;
  version: string;
  description?: string;
  fileName: string;
  fileType: string;
  s3Url: string;
  fileSize: number;
  checksum: string;
  
  parsedKeywords?: ParsedKeyword[];
  parsedClasses?: ParsedClass[];
  imports?: string[];
  
  parseStatus: 'pending' | 'success' | 'failed';
  parseError?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ParsedKeyword {
  name: string;
  methodName: string;
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

export interface SuggestedTemplate {
  keywordName: string;
  displayName: string;
  inputSchema: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: any;
    label: string;
  }>;
  description: string;
}
```

#### 2.2 API Client
**File:** `src/api/library.ts`

```typescript
import apiBase from './config';

export interface UploadLibraryRequest {
  file: File;
  name: string;
  version: string;
  description?: string;
}

export const libraryApi = {
  uploadLibrary: async (data: UploadLibraryRequest) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('name', data.name);
    formData.append('version', data.version);
    if (data.description) {
      formData.append('description', data.description);
    }

    const response = await apiBase.post('/libraries/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  listLibraries: async (filters?: { name?: string; parseStatus?: string }) => {
    const response = await apiBase.get('/libraries', { params: filters });
    return response.data;
  },

  getLibrary: async (id: string) => {
    const response = await apiBase.get(`/libraries/${id}`);
    return response.data;
  },

  getSuggestedTemplates: async (id: string) => {
    const response = await apiBase.get(`/libraries/${id}/suggested-templates`);
    return response.data;
  },

  reparseLibrary: async (id: string) => {
    const response = await apiBase.put(`/libraries/${id}/reparse`);
    return response.data;
  },

  deleteLibrary: async (id: string) => {
    const response = await apiBase.delete(`/libraries/${id}`);
    return response.data;
  },
};
```

#### 2.3 Library Management Page
**File:** `src/pages/admin/libraries/index.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Button, Table, Tag, Space, message, Modal } from 'antd';
import { UploadOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { libraryApi } from '@/api/library';
import type { Library } from '@/types/library';
import UploadLibraryModal from '@/components/library/UploadLibraryModal';
import LibraryDetailsModal from '@/components/library/LibraryDetailsModal';

export default function LibrariesPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);

  useEffect(() => {
    loadLibraries();
  }, []);

  const loadLibraries = async () => {
    setLoading(true);
    try {
      const data = await libraryApi.listLibraries();
      setLibraries(data);
    } catch (error) {
      message.error('Failed to load libraries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Delete Library',
      content: 'Are you sure you want to delete this library?',
      onOk: async () => {
        try {
          await libraryApi.deleteLibrary(id);
          message.success('Library deleted successfully');
          loadLibraries();
        } catch (error) {
          message.error('Failed to delete library');
        }
      },
    });
  };

  const handleReparse = async (id: string) => {
    try {
      await libraryApi.reparseLibrary(id);
      message.success('Library re-parsing started');
      loadLibraries();
    } catch (error) {
      message.error('Failed to re-parse library');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: 'Type',
      dataIndex: 'fileType',
      key: 'fileType',
      render: (type: string) => <Tag>{type.toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'parseStatus',
      key: 'parseStatus',
      render: (status: string) => {
        const colors = {
          pending: 'processing',
          success: 'success',
          failed: 'error',
        };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Keywords',
      key: 'keywords',
      render: (_, record: Library) => (
        <span>{record.parsedKeywords?.length || 0}</span>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Library) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedLibrary(record);
              setDetailsModalOpen(true);
            }}
          >
            View
          </Button>
          {record.fileType === 'py' && (
            <Button
              icon={<ReloadOutlined />}
              onClick={() => handleReparse(record.id)}
            >
              Re-parse
            </Button>
          )}
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => setUploadModalOpen(true)}
        >
          Upload Library
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={libraries}
        rowKey="id"
        loading={loading}
      />

      <UploadLibraryModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          setUploadModalOpen(false);
          loadLibraries();
        }}
      />

      {selectedLibrary && (
        <LibraryDetailsModal
          open={detailsModalOpen}
          library={selectedLibrary}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedLibrary(null);
          }}
        />
      )}
    </div>
  );
}
```

---

## 🤖 Serverless Robot Implementation

### Phase 3: Enhanced setup.sh

**File:** `setup.sh` (Updated)

```bash
install_s3_dependencies() {
    local robot_code=$1
    echo "====== Checking for Custom S3 Libraries ======"
    
    # Create cache directory
    CACHE_DIR="/tmp/rpa-libs-cache"
    mkdir -p "$CACHE_DIR"
    
    # Extract s3Libraries array
    local s3_libraries=$(jq -c '.s3Libraries[]?' <<< "$robot_code")
    
    if [[ -z "$s3_libraries" ]]; then
        echo "ℹ️  No custom S3 libraries defined"
        return 0
    fi
    
    # Process each library
    echo "$s3_libraries" | while read -r lib; do
        NAME=$(echo $lib | jq -r '.name')
        VERSION=$(echo $lib | jq -r '.version')
        S3_PATH=$(echo $lib | jq -r '.s3Path')
        CHECKSUM=$(echo $lib | jq -r '.checksum')
        REQUIRED=$(echo $lib | jq -r '.required // true')
        
        echo "📚 Processing $NAME@$VERSION..."
        
        # Determine file extension
        FILE_EXT="${S3_PATH##*.}"
        CACHE_FILE="$CACHE_DIR/${NAME}-${VERSION}.${FILE_EXT}"
        
        # Check cache
        if [ -f "$CACHE_FILE" ]; then
            CACHED_CHECKSUM=$(sha256sum "$CACHE_FILE" | cut -d' ' -f1)
            if [ "$CACHED_CHECKSUM" = "$CHECKSUM" ]; then
                echo "  ✅ Using cached version"
                pip install "$CACHE_FILE"
                continue
            else
                echo "  ⚠️  Cache checksum mismatch, re-downloading"
                rm "$CACHE_FILE"
            fi
        fi
        
        # Download from S3
        echo "  ⬇️  Downloading from S3..."
        if aws s3 cp "$S3_PATH" "$CACHE_FILE"; then
            # Verify checksum
            DOWNLOADED_CHECKSUM=$(sha256sum "$CACHE_FILE" | cut -d' ' -f1)
            if [ "$DOWNLOADED_CHECKSUM" != "$CHECKSUM" ]; then
                echo "  ❌ Checksum verification failed!"
                rm "$CACHE_FILE"
                [ "$REQUIRED" = "true" ] && exit 1
                continue
            fi
            
            # Install
            echo "  📥 Installing $NAME@$VERSION..."
            if pip install "$CACHE_FILE"; then
                echo "  ✅ Successfully installed $NAME@$VERSION"
            else
                echo "  ❌ Failed to install"
                [ "$REQUIRED" = "true" ] && exit 1
            fi
        else
            echo "  ❌ Failed to download from S3"
            [ "$REQUIRED" = "true" ] && exit 1
        fi
    done
    
    echo "✅ All S3 dependencies processed"
}
```

---

## 📝 robot.json Schema

```json
{
  "resource": {
    "imports": [
      {
        "name": "RPA.ERPNext",
        "type": "LIBRARY"
      },
      {
        "name": "RPA.Moodle",
        "type": "LIBRARY"
      }
    ]
  },
  "s3Libraries": [
    {
      "name": "rpa-erpnext",
      "version": "1.0.0",
      "s3Path": "s3://rpa-robot-bktest/libraries/rpa-erpnext/1.0.0/ERPNext.py",
      "checksum": "abc123def456...",
      "required": true
    },
    {
      "name": "rpa-moodle",
      "version": "2.1.0",
      "s3Path": "s3://rpa-robot-bktest/libraries/rpa-moodle/2.1.0/Moodle.whl",
      "checksum": "def456789...",
      "required": true
    }
  ],
  "cacheStrategy": {
    "enabled": true,
    "ttl": 3600
  },
  "tasks": [
    {
      "id": "1",
      "name": "Setup ERPNext",
      "keyword": "Setup ERPNext Connection",
      "args": {
        "url": "${ERP_URL}",
        "api_key": "${ERP_KEY}"
      }
    }
  ]
}
```

---

## 🎯 Implementation Roadmap

### Sprint 1: Backend Library Module (3-4 days)
- [ ] Create database migration for libraries table
- [ ] Implement Library entity
- [ ] Create PythonParserService with keyword extraction
- [ ] Implement LibraryService (upload, parse, CRUD)
- [ ] Create LibraryController with all endpoints
- [ ] Add S3Service integration
- [ ] Write unit tests for parser
- [ ] Write integration tests for API

### Sprint 2: Backend Package Integration (2-3 days)
- [ ] Add library_id column to packages table
- [ ] Update Package entity with library relation
- [ ] Add keyword_name, python_method to activity_templates
- [ ] Create RobotConfigService
- [ ] Implement robot.json generation logic
- [ ] Add endpoint to generate robot.json for process
- [ ] Write tests

### Sprint 3: Frontend Library Management (3-4 days)
- [ ] Create Library types and API client
- [ ] Build UploadLibraryModal component
- [ ] Create LibraryTable component
- [ ] Build LibraryDetailsModal
- [ ] Implement SuggestedTemplatesView
- [ ] Add library management page
- [ ] Add Vietnamese/English localization
- [ ] Write component tests

### Sprint 4: Frontend Package Update (2-3 days)
- [ ] Add library selection step to package creation
- [ ] Update PackageForm with library dropdown
- [ ] Show suggested templates when library selected
- [ ] Add template preview functionality
- [ ] Update package list to show linked library
- [ ] Add validation for library compatibility

### Sprint 5: Robot Setup Enhancement (1-2 days)
- [ ] Enhance install_s3_dependencies with caching
- [ ] Add checksum verification
- [ ] Improve error handling and logging
- [ ] Test with sample libraries (.py, .whl)
- [ ] Update setup.sh documentation

### Sprint 6: Testing & Documentation (2-3 days)
- [ ] End-to-end testing (upload → create package → run robot)
- [ ] Performance testing (large libraries)
- [ ] Security testing (file validation)
- [ ] Write user documentation
- [ ] Write developer documentation
- [ ] Create video tutorial

---

## 📚 Testing Checklist

### Backend Tests
- [ ] Library upload (valid files)
- [ ] Library upload (invalid files)
- [ ] Python parser (various keyword formats)
- [ ] S3 upload/download
- [ ] Checksum calculation
- [ ] Suggested template generation
- [ ] Library deletion (cascade to packages)

### Frontend Tests
- [ ] File upload UI
- [ ] Library list filtering
- [ ] Template preview rendering
- [ ] Package creation with library
- [ ] Error handling

### Integration Tests
- [ ] Upload library → Parse → Create package → Generate robot.json
- [ ] Robot downloads library from S3
- [ ] Robot installs library
- [ ] Robot executes with custom library
- [ ] Cache mechanism works correctly

---

## 🔒 Security Considerations

1. **File Validation**
   - Validate file extensions (.py, .whl, .tar.gz only)
   - Scan for malicious code patterns
   - Limit file size (max 50MB)

2. **S3 Security**
   - Use signed URLs for downloads
   - Set proper bucket policies
   - Enable versioning

3. **Checksum Verification**
   - Always verify SHA256 before installation
   - Reject mismatched checksums

4. **Access Control**
   - Only admins can upload libraries
   - Users can only view/use libraries

---

## 📊 Success Metrics

- [ ] Library upload time < 5 seconds
- [ ] Parse time < 10 seconds for typical library
- [ ] Robot library installation < 30 seconds
- [ ] 100% checksum verification success rate
- [ ] Zero security vulnerabilities

---

## 🚀 Deployment Steps

1. **Database Migration**
   ```bash
   npm run migration:generate -- -n CreateLibrariesTable
   npm run migration:run
   ```

2. **Backend Deployment**
   ```bash
   npm run build
   npm run deploy
   ```

3. **Frontend Deployment**
   ```bash
   npm run build
   npm run deploy
   ```

4. **Update EC2 AMI**
   - Upload new setup.sh to S3
   - Test with new EC2 instance
   - Update AMI if needed

---

## 📖 Documentation Links

- [Robot Framework Keyword Documentation](https://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#creating-test-libraries)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [TypeORM Relations](https://typeorm.io/relations)
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)

---

**Created:** 2026-02-06  
**Last Updated:** 2026-02-06  
**Version:** 1.0  
**Status:** Ready for Implementation
