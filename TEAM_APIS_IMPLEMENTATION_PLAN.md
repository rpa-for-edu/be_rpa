# Team APIs Implementation Plan

## 📋 Overview
Tạo Team APIs tương tự Workspace APIs nhưng với permission system dựa trên:
1. **Team-Package Access** - Kiểm tra team có quyền với package
2. **Role Permissions** - Kiểm tra member role có permission
3. **Activity Template Access** - Kiểm tra role có quyền dùng template

---

## 🏗️ Architecture

### Entities (Đã có)
- ✅ Team
- ✅ TeamMember
- ✅ Role
- ✅ Permission
- ✅ ActivityTemplate
- ✅ ActivityPackageAccess

### New Services & Controllers
1. **TeamProcessesService** - Quản lý processes trong team
2. **TeamProcessesController** - API endpoints
3. **TeamRobotsService** - Quản lý robots trong team
4. **TeamRobotsController** - API endpoints
5. **TeamPermissionService** - Helper service check permissions

---

## 🔐 Permission System

### 1. Check Team Member
```typescript
async checkTeamMember(teamId: string, userId: number): Promise<TeamMember> {
  const member = await teamMemberRepository.findOne({
    where: { teamId, userId },
    relations: ['role', 'role.permissions', 'role.activityTemplates'],
  });
  
  if (!member) throw new ForbiddenException('Not a team member');
  return member;
}
```

### 2. Check Permission
```typescript
async checkPermission(member: TeamMember, permissionName: string): Promise<boolean> {
  return member.role.permissions.some(p => p.name === permissionName);
}
```

### 3. Check Package Access
```typescript
async checkPackageAccess(teamId: string, packageId: string): Promise<boolean> {
  const access = await activityPackageAccessRepository.findOne({
    where: { teamId, packageId },
  });
  
  return !!access;
}
```

### 4. Check Template Access
```typescript
async checkTemplateAccess(member: TeamMember, templateId: string): Promise<boolean> {
  return member.role.activityTemplates.some(t => t.id === templateId);
}
```

---

## 📡 API Endpoints

### Team Processes

#### GET /team/:teamId/processes
- **Permission**: `view_processes`
- **Returns**: List of processes in team

#### POST /team/:teamId/processes
- **Permission**: `create_process`
- **Check**: 
  - User has `create_process` permission
  - All activity templates belong to allowed packages
  - Role has access to all activity templates used
- **Body**: Process definition

#### GET /team/:teamId/processes/:processId
- **Permission**: `view_processes`

#### PUT /team/:teamId/processes/:processId
- **Permission**: `edit_process`
- **Check**: Same as create

#### DELETE /team/:teamId/processes/:processId
- **Permission**: `delete_process`

---

### Team Robots

#### GET /team/:teamId/robots
- **Permission**: `view_robots`

#### POST /team/:teamId/robots
- **Permission**: `create_robot`
- **Check**: Process belongs to team

#### POST /team/:teamId/robots/:robotKey/run
- **Permission**: `run_robot`

#### POST /team/:teamId/robots/:robotKey/stop
- **Permission**: `stop_robot`

#### DELETE /team/:teamId/robots/:robotKey
- **Permission**: `delete_robot`

---

## 🎯 Implementation Steps

### Phase 1: Permission Helper Service
1. Create `TeamPermissionService`
2. Implement all check methods
3. Add to WorkspaceModule

### Phase 2: Team Processes
1. Create `TeamProcessesService`
2. Create `TeamProcessesController`
3. Implement CRUD with permission checks
4. Add package & template validation

### Phase 3: Team Robots
1. Create `TeamRobotsService`
2. Create `TeamRobotsController`
3. Implement CRUD with permission checks
4. Integrate with serverless

### Phase 4: Testing
1. Test permission checks
2. Test package access
3. Test template access
4. Integration tests

---

## 📝 Permission Names

```typescript
enum TeamPermission {
  // Process permissions
  VIEW_PROCESSES = 'view_processes',
  CREATE_PROCESS = 'create_process',
  EDIT_PROCESS = 'edit_process',
  DELETE_PROCESS = 'delete_process',
  
  // Robot permissions
  VIEW_ROBOTS = 'view_robots',
  CREATE_ROBOT = 'create_robot',
  RUN_ROBOT = 'run_robot',
  STOP_ROBOT = 'stop_robot',
  DELETE_ROBOT = 'delete_robot',
  
  // Member permissions
  INVITE_MEMBER = 'invite_member',
  REMOVE_MEMBER = 'remove_member',
  
  // Package permissions
  VIEW_PACKAGES = 'view_packages',
}
```

---

## 🔄 Workflow Example

### Create Process in Team
```
1. User calls POST /team/:teamId/processes
2. Check user is team member
3. Check user has 'create_process' permission
4. Extract all activity templates from process
5. For each template:
   - Get template's package
   - Check team has access to package
   - Check user's role has access to template
6. If all checks pass, create process
7. Return process
```

---

## 📊 Database Queries

### Get Member with Full Permissions
```sql
SELECT tm.*, r.*, p.*, at.*
FROM team_member tm
JOIN role r ON tm.roleId = r.id
LEFT JOIN role_permission rp ON r.id = rp.roleId
LEFT JOIN permission p ON rp.permissionId = p.id
LEFT JOIN role_activity_template rat ON r.id = rat.roleId
LEFT JOIN activity_template at ON rat.activityTemplateId = at.id
WHERE tm.teamId = ? AND tm.userId = ?
```

### Check Package Access
```sql
SELECT *
FROM activity_package_access
WHERE teamId = ? AND packageId = ?
```

---

## ✅ Checklist

### Backend
- [ ] TeamPermissionService
- [ ] TeamProcessesService
- [ ] TeamProcessesController
- [ ] TeamRobotsService
- [ ] TeamRobotsController
- [ ] DTOs
- [ ] Swagger docs
- [ ] Unit tests

### Frontend
- [ ] Team layout
- [ ] Team processes page
- [ ] Team robots page
- [ ] Permission-based UI
- [ ] Package selection
- [ ] Template filtering

---

**Estimated Time**: 3-4 days
**Priority**: High
**Dependencies**: Workspace APIs (completed)
