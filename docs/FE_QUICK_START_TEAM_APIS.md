# 🚀 Quick Start - Team APIs for Frontend

## TL;DR

Backend đã implement xong **Team APIs** với đầy đủ permission system và validation. Frontend cần implement 3 pages chính:

1. **Team Processes** - CRUD processes với permission checks
2. **Team Robots** - CRUD robots với **validation trước khi run/delete**
3. **Team Connections** - Read-only workspace connections

---

## 🔑 Key Features

### ⭐ Robot Validation API (MỚI & QUAN TRỌNG)

**Trước khi run hoặc delete robot, PHẢI validate:**

```typescript
// Validate before RUN
POST /team/:teamId/robots/:robotKey/validate?action=run

// Validate before DELETE  
POST /team/:teamId/robots/:robotKey/validate?action=delete
```

**Response:**
```json
{
  "isValid": true/false,
  "errors": ["Error message 1", "Error message 2"],
  "warnings": ["Warning message"],
  "action": "run" | "delete",
  "robotKey": "...",
  "processId": "...",
  "processName": "..."
}
```

---

## 📋 API Endpoints Summary

### Processes
```
GET    /team/:teamId/processes              (view_processes)
GET    /team/:teamId/processes/:id          (view_processes)
POST   /team/:teamId/processes              (create_process)
PUT    /team/:teamId/processes/:id          (edit_process)
DELETE /team/:teamId/processes/:id          (delete_process)
```

### Robots
```
GET    /team/:teamId/robots                 (view_robots)
GET    /team/:teamId/robots/:key            (view_robots)
POST   /team/:teamId/robots                 (create_robot)
POST   /team/:teamId/robots/:key/validate   (run_robot | delete_robot)
DELETE /team/:teamId/robots/:key            (delete_robot)
GET    /team/:teamId/robots/:key/connections (view_robots)
```

### Connections (Read-only)
```
GET    /team/:teamId/connections            (team member)
GET    /team/:teamId/connections/:provider/:name
```

---

## 💻 Code Examples

### 1. Run Robot with Validation

```typescript
const handleRunRobot = async (robotKey: string) => {
  try {
    // Step 1: Validate
    const res = await fetch(
      `/team/${teamId}/robots/${robotKey}/validate?action=run`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );
    const { data } = await res.json();
    
    // Step 2: Check result
    if (!data.isValid) {
      toast.error(data.errors.join('\n'));
      return;
    }
    
    // Step 3: Show warnings
    if (data.warnings.length > 0) {
      toast.warning(data.warnings.join('\n'));
    }
    
    // Step 4: Run via Lambda
    await runRobotViaLambda(teamId, robotKey);
    toast.success('Robot started!');
  } catch (error) {
    toast.error('Failed to run robot');
  }
};
```

### 2. Delete Robot with Validation

```typescript
const handleDeleteRobot = async (robotKey: string) => {
  try {
    // Step 1: Validate
    const res = await fetch(
      `/team/${teamId}/robots/${robotKey}/validate?action=delete`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );
    const { data } = await res.json();
    
    // Step 2: Check permission
    if (!data.isValid) {
      toast.error(data.errors.join('\n'));
      return;
    }
    
    // Step 3: Confirm
    const confirmed = await confirmDialog('Delete this robot?');
    if (!confirmed) return;
    
    // Step 4: Delete
    await fetch(`/team/${teamId}/robots/${robotKey}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    toast.success('Robot deleted!');
    fetchRobots(); // Refresh list
  } catch (error) {
    toast.error('Failed to delete robot');
  }
};
```

### 3. Permission-Based UI

```typescript
// Get permissions from team member data
const hasPermission = (permission: string) => {
  return teamMember?.role?.permissions?.some(p => p.name === permission);
};

// Use in components
{hasPermission('create_process') && (
  <Button onClick={handleCreate}>Create Process</Button>
)}

{hasPermission('run_robot') && (
  <Button onClick={() => handleRun(robotKey)}>Run</Button>
)}

{hasPermission('delete_robot') && (
  <Button onClick={() => handleDelete(robotKey)}>Delete</Button>
)}
```

### 4. Create Process with Validation

```typescript
const handleCreateProcess = async (processData) => {
  try {
    const res = await fetch(`/team/${teamId}/processes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: processData.name,
        description: processData.description,
        activities: processData.activities, // Must include activityTemplateId
        variables: processData.variables
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      // Show validation errors
      if (error.error?.errors) {
        toast.error(
          <div>
            <strong>Validation failed:</strong>
            <ul>
              {error.error.errors.map(err => <li>{err}</li>)}
            </ul>
          </div>
        );
      }
      return;
    }
    
    toast.success('Process created!');
    navigate(`/team/${teamId}/processes`);
  } catch (error) {
    toast.error('Failed to create process');
  }
};
```

---

## 🎯 Implementation Priority

### Phase 1: Basic CRUD (1-2 days)
- [ ] Team Processes List Page
- [ ] Team Robots List Page
- [ ] Team Connections List Page
- [ ] Permission-based button visibility

### Phase 2: Validation (1 day)
- [ ] Robot Run Validation
- [ ] Robot Delete Validation
- [ ] Error/Warning Display Components

### Phase 3: Create/Edit (2-3 days)
- [ ] Process Create/Edit Form
- [ ] Robot Create Form
- [ ] Template validation error handling

---

## 🔐 Permissions Reference

| Permission | Description |
|-----------|-------------|
| `view_processes` | View team processes |
| `create_process` | Create new processes |
| `edit_process` | Edit existing processes |
| `delete_process` | Delete processes |
| `view_robots` | View team robots |
| `create_robot` | Create new robots |
| `run_robot` | Run robots |
| `delete_robot` | Delete robots |

---

## ⚠️ Common Errors

### 1. Missing Permission
```json
{
  "statusCode": 403,
  "message": "You don't have 'run_robot' permission in this team"
}
```
**Solution:** Hide button or show disabled state with tooltip

### 2. Template Access Denied
```json
{
  "statusCode": 400,
  "message": "Process validation failed",
  "error": {
    "errors": [
      "Your role doesn't have access to template: Send Gmail"
    ]
  }
}
```
**Solution:** Show error message, suggest contacting admin

### 3. Package Access Denied
```json
{
  "error": {
    "errors": [
      "Team doesn't have access to package: Google Workspace"
    ]
  }
}
```
**Solution:** Show error message, suggest contacting workspace owner

---

## 📁 File Structure Suggestion

```
src/
├── pages/
│   └── team/
│       ├── TeamProcessesPage.tsx
│       ├── TeamRobotsPage.tsx
│       └── TeamConnectionsPage.tsx
├── components/
│   └── team/
│       ├── ProcessList.tsx
│       ├── ProcessForm.tsx
│       ├── RobotList.tsx
│       ├── RobotForm.tsx
│       ├── ConnectionList.tsx
│       ├── ValidationErrors.tsx
│       └── ValidationWarnings.tsx
├── services/
│   └── api/
│       ├── teamProcesses.ts
│       ├── teamRobots.ts
│       └── teamConnections.ts
├── hooks/
│   ├── useTeamPermissions.ts
│   └── useRobotValidation.ts
└── types/
    └── team.ts
```

---

## 🧪 Testing Scenarios

1. **User with full permissions:**
   - Can create, edit, delete processes
   - Can create, run, delete robots
   - All buttons visible

2. **User with view-only permissions:**
   - Can only view processes and robots
   - No create/edit/delete buttons
   - Run button hidden

3. **User with partial permissions:**
   - Can create but not delete
   - Can run but not create
   - Buttons conditionally visible

4. **Validation failures:**
   - Missing template access → Show error
   - Missing package access → Show error
   - No connections → Show warning (can still run)

---

## 📞 Need Help?

- **Full Documentation:** `docs/FE_TEAM_APIS_IMPLEMENTATION_GUIDE.md`
- **API Status:** `TEAM_APIS_STATUS.md`
- **Backend URL:** `http://localhost:3000`
- **Swagger Docs:** `http://localhost:3000/api`

---

## ✅ Quick Checklist

Before starting:
- [ ] Read this guide
- [ ] Check backend is running (`npm run start:dev`)
- [ ] Test API endpoints with Postman/Thunder Client
- [ ] Understand permission system

During development:
- [ ] Always validate before run/delete
- [ ] Show permission-based UI
- [ ] Handle errors gracefully
- [ ] Display warnings to users

Before deployment:
- [ ] Test all permission scenarios
- [ ] Test validation flows
- [ ] Test error handling
- [ ] Test with different roles

---

**Happy coding! 🎉**
