# Frontend Implementation Guide - Team APIs

## 🎯 Objective

Implement Team Management features with role-based permissions, including:
1. Team Processes Management (CRUD)
2. Team Robots Management (CRUD + Validation)
3. Team Connections (Read-only)
4. Permission-based UI
5. Pre-action validation for Run and Delete

---

## 📋 Backend APIs Available

### Base URL
```
http://localhost:3000
```

### Authentication
All endpoints require JWT Bearer token:
```typescript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

---

## 1️⃣ Team Processes APIs

### 1.1 Get All Processes
```http
GET /team/:teamId/processes?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processes": [
      {
        "id": "process-123",
        "name": "Send Email Automation",
        "description": "Automated email sending",
        "version": 3,
        "createdBy": "John Doe",
        "createdAt": "2024-01-20T10:00:00Z",
        "updatedAt": "2024-01-24T15:30:00Z"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "totalPages": 3
    }
  }
}
```

**Required Permission:** `view_processes`

---

### 1.2 Get Process by ID
```http
GET /team/:teamId/processes/:processId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "process-123",
    "name": "Send Email Automation",
    "description": "Automated email sending",
    "version": 3,
    "createdBy": "John Doe",
    "createdAt": "2024-01-20T10:00:00Z",
    "updatedAt": "2024-01-24T15:30:00Z",
    "detail": {
      "processId": "process-123",
      "versionId": "3",
      "xml": "<bpmn>...</bpmn>",
      "variables": {},
      "activities": [
        {
          "activityID": "activity-1",
          "activityType": "task",
          "properties": {
            "activityPackage": "google-workspace",
            "serviceName": "Gmail",
            "activityName": "Send Email",
            "library": "gmail",
            "arguments": {},
            "return": {}
          }
        }
      ]
    }
  }
}
```

**Required Permission:** `view_processes`

---

### 1.3 Create Process
```http
POST /team/:teamId/processes
```

**Request Body:**
```json
{
  "name": "New Automation Process",
  "description": "Process description",
  "activities": [
    {
      "activityID": "activity-1",
      "activityTemplateId": "template-123",
      "activityType": "task",
      "properties": {
        "activityPackage": "google-workspace",
        "serviceName": "Gmail",
        "activityName": "Send Email",
        "library": "gmail",
        "arguments": {},
        "return": {}
      }
    }
  ],
  "variables": {}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Process created successfully",
  "data": {
    "id": "process-456",
    "name": "New Automation Process",
    "version": 1,
    "createdAt": "2024-01-24T16:00:00Z"
  }
}
```

**Required Permission:** `create_process`

**Validation:**
- ✅ User must have `create_process` permission
- ✅ User's role must have access to all activity templates used
- ✅ Team must have access to all activity packages

**Error Response (403):**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Process validation failed",
  "error": {
    "message": "Process validation failed",
    "errors": [
      "Your role doesn't have access to template: Send Gmail",
      "Team doesn't have access to package: Google Workspace"
    ]
  }
}
```

---

### 1.4 Update Process
```http
PUT /team/:teamId/processes/:processId
```

**Request Body:** (Same as Create)

**Required Permission:** `edit_process`

---

### 1.5 Delete Process
```http
DELETE /team/:teamId/processes/:processId
```

**Required Permission:** `delete_process`

---

## 2️⃣ Team Robots APIs

### 2.1 Get All Robots
```http
GET /team/:teamId/robots?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "robots": [
      {
        "robotKey": "robot-abc-xyz",
        "processId": "process-123",
        "processName": "Send Email Automation",
        "processVersion": 3,
        "createdBy": "John Doe",
        "createdAt": "2024-01-24T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    }
  }
}
```

**Required Permission:** `view_robots`

---

### 2.2 Get Robot by Key
```http
GET /team/:teamId/robots/:robotKey
```

**Required Permission:** `view_robots`

---

### 2.3 Create Robot
```http
POST /team/:teamId/robots
```

**Request Body:**
```json
{
  "name": "My Robot",
  "processId": "process-123",
  "processVersion": 3,
  "connections": [
    {
      "connectionKey": "conn-gmail-123",
      "isActivate": true
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Robot created successfully",
  "data": {
    "robotKey": "robot-def-456",
    "processId": "process-123",
    "processVersion": 3,
    "createdAt": "2024-01-24T16:00:00Z"
  }
}
```

**Required Permission:** `create_robot`

**Validation:**
- ✅ User must have `create_robot` permission
- ✅ Process must belong to the team
- ✅ User must have access to all templates in the process
- ✅ Team must have access to all required packages

---

### 2.4 Validate Robot Action ⭐ **NEW**
```http
POST /team/:teamId/robots/:robotKey/validate?action={run|delete}
```

**Query Parameters:**
- `action` (optional): `run` (default) or `delete`

**Response (Valid):**
```json
{
  "success": true,
  "message": "Robot validation completed",
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": ["Robot has no connections configured"],
    "action": "run",
    "robotKey": "robot-abc-xyz",
    "processId": "process-123",
    "processName": "Send Email Automation"
  }
}
```

**Response (Invalid):**
```json
{
  "success": true,
  "message": "Robot validation completed",
  "data": {
    "isValid": false,
    "errors": [
      "You don't have 'run_robot' permission in this team",
      "Your role doesn't have access to template: Send Gmail"
    ],
    "warnings": [],
    "action": "run",
    "robotKey": "robot-abc-xyz",
    "processId": "process-123",
    "processName": "Send Email Automation"
  }
}
```

**For `action=run`:**
- ✅ Checks `run_robot` permission
- ✅ Validates template access
- ✅ Validates package access
- ⚠️ Warns if no connections

**For `action=delete`:**
- ✅ Checks `delete_robot` permission only

---

### 2.5 Delete Robot
```http
DELETE /team/:teamId/robots/:robotKey
```

**Required Permission:** `delete_robot`

**⚠️ IMPORTANT:** Always validate before deleting:
```typescript
// Step 1: Validate
const validation = await validateRobot(teamId, robotKey, 'delete');
if (!validation.isValid) {
  showErrors(validation.errors);
  return;
}

// Step 2: Confirm
const confirmed = await confirmDialog('Delete this robot?');
if (!confirmed) return;

// Step 3: Delete
await deleteRobot(teamId, robotKey);
```

---

### 2.6 Get Robot Connections
```http
GET /team/:teamId/robots/:robotKey/connections
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "connectionKey": "conn-gmail-123",
      "provider": "gmail",
      "name": "My Gmail Account",
      "isActivate": true
    }
  ]
}
```

**Required Permission:** `view_robots`

---

## 3️⃣ Team Connections APIs (Read-Only)

### 3.1 Get All Connections
```http
GET /team/:teamId/connections?provider=gmail
```

**Query Parameters:**
- `provider` (optional): Filter by provider (gmail, drive, sheets, etc.)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "connectionKey": "conn-gmail-123",
      "provider": "gmail",
      "name": "My Gmail Account",
      "email": "user@example.com",
      "createdAt": "2024-01-20T10:00:00Z"
    }
  ]
}
```

**Note:** Teams use workspace connections (read-only). Only workspace owner can create/edit connections.

---

### 3.2 Get Connection by Provider and Name
```http
GET /team/:teamId/connections/:provider/:name
```

---

## 🎨 Frontend Implementation Tasks

### Task 1: Create Team Processes Page

**Location:** `/workspace/:workspaceId/teams/:teamId/processes`

**Features:**
1. ✅ List all processes with pagination
2. ✅ Search and filter processes
3. ✅ Create new process button (if has `create_process` permission)
4. ✅ Edit process button (if has `edit_process` permission)
5. ✅ Delete process button (if has `delete_process` permission)
6. ✅ View process details

**UI Components Needed:**
- Process list table/grid
- Create/Edit process modal/page
- Delete confirmation dialog
- Permission-based button visibility

**Code Example:**
```typescript
// Check if user has permission
const canCreateProcess = userPermissions.includes('create_process');
const canEditProcess = userPermissions.includes('edit_process');
const canDeleteProcess = userPermissions.includes('delete_process');

// Render buttons conditionally
{canCreateProcess && (
  <Button onClick={handleCreateProcess}>Create Process</Button>
)}

{canEditProcess && (
  <Button onClick={() => handleEditProcess(processId)}>Edit</Button>
)}

{canDeleteProcess && (
  <Button onClick={() => handleDeleteProcess(processId)}>Delete</Button>
)}
```

---

### Task 2: Create Team Robots Page

**Location:** `/workspace/:workspaceId/teams/:teamId/robots`

**Features:**
1. ✅ List all robots with pagination
2. ✅ Create new robot button (if has `create_robot` permission)
3. ✅ **Run robot button with validation** (if has `run_robot` permission)
4. ✅ **Delete robot button with validation** (if has `delete_robot` permission)
5. ✅ View robot details and connections

**UI Components Needed:**
- Robot list table/grid
- Create robot modal/page
- Run robot button with validation
- Delete robot button with validation
- Validation error display

**Code Example - Run Robot with Validation:**
```typescript
const handleRunRobot = async (robotKey: string) => {
  try {
    setLoading(true);
    
    // Step 1: Validate
    const response = await fetch(
      `/team/${teamId}/robots/${robotKey}/validate?action=run`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const { data: validation } = await response.json();
    
    // Step 2: Check validation result
    if (!validation.isValid) {
      // Show errors to user
      toast.error(
        <div>
          <strong>Cannot run robot:</strong>
          <ul>
            {validation.errors.map(err => <li key={err}>{err}</li>)}
          </ul>
        </div>
      );
      return;
    }
    
    // Step 3: Show warnings if any
    if (validation.warnings.length > 0) {
      toast.warning(validation.warnings.join('\n'));
    }
    
    // Step 4: Run robot via Lambda
    await runRobotViaLambda(teamId, robotKey);
    
    toast.success('Robot started successfully!');
  } catch (error) {
    toast.error('Failed to run robot');
    console.error(error);
  } finally {
    setLoading(false);
  }
};
```

**Code Example - Delete Robot with Validation:**
```typescript
const handleDeleteRobot = async (robotKey: string) => {
  try {
    setLoading(true);
    
    // Step 1: Validate
    const response = await fetch(
      `/team/${teamId}/robots/${robotKey}/validate?action=delete`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const { data: validation } = await response.json();
    
    // Step 2: Check validation result
    if (!validation.isValid) {
      toast.error(validation.errors.join('\n'));
      return;
    }
    
    // Step 3: Confirm deletion
    const confirmed = await confirmDialog({
      title: 'Delete Robot',
      message: `Are you sure you want to delete robot "${validation.processName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    // Step 4: Delete robot
    await fetch(`/team/${teamId}/robots/${robotKey}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    toast.success('Robot deleted successfully!');
    
    // Refresh list
    await fetchRobots();
  } catch (error) {
    toast.error('Failed to delete robot');
    console.error(error);
  } finally {
    setLoading(false);
  }
};
```

---

### Task 3: Create Team Connections Page

**Location:** `/workspace/:workspaceId/teams/:teamId/connections`

**Features:**
1. ✅ List all workspace connections (read-only)
2. ✅ Filter by provider
3. ✅ View connection details
4. ✅ Show message: "Connections are managed at workspace level"

**Note:** No create/edit/delete buttons. This is read-only.

---

### Task 4: Permission-Based UI

**Implement permission checks throughout the UI:**

```typescript
// Get user's permissions for this team
interface TeamMember {
  userId: number;
  teamId: string;
  role: {
    id: string;
    name: string;
    permissions: Array<{
      name: string;
      description: string;
    }>;
  };
}

// Helper function
const hasPermission = (permission: string): boolean => {
  return teamMember?.role?.permissions?.some(p => p.name === permission) ?? false;
};

// Usage in components
const canViewProcesses = hasPermission('view_processes');
const canCreateProcess = hasPermission('create_process');
const canEditProcess = hasPermission('edit_process');
const canDeleteProcess = hasPermission('delete_process');
const canViewRobots = hasPermission('view_robots');
const canCreateRobot = hasPermission('create_robot');
const canRunRobot = hasPermission('run_robot');
const canDeleteRobot = hasPermission('delete_robot');

// Conditional rendering
{canCreateProcess && <CreateProcessButton />}
{canRunRobot && <RunRobotButton />}
{canDeleteRobot && <DeleteRobotButton />}
```

---

### Task 5: Error Handling

**Handle validation errors gracefully:**

```typescript
// Error display component
const ValidationErrors: React.FC<{ errors: string[] }> = ({ errors }) => {
  if (errors.length === 0) return null;
  
  return (
    <Alert severity="error">
      <AlertTitle>Validation Failed</AlertTitle>
      <ul>
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </Alert>
  );
};

// Warning display component
const ValidationWarnings: React.FC<{ warnings: string[] }> = ({ warnings }) => {
  if (warnings.length === 0) return null;
  
  return (
    <Alert severity="warning">
      <AlertTitle>Warnings</AlertTitle>
      <ul>
        {warnings.map((warning, index) => (
          <li key={index}>{warning}</li>
        ))}
      </ul>
    </Alert>
  );
};
```

---

## 🔑 Permission Reference

### Process Permissions
- `view_processes` - View team processes
- `create_process` - Create new processes
- `edit_process` - Edit existing processes
- `delete_process` - Delete processes

### Robot Permissions
- `view_robots` - View team robots
- `create_robot` - Create new robots
- `run_robot` - Run robots
- `delete_robot` - Delete robots

---

## 📊 Typical User Flows

### Flow 1: Create and Run a Robot

```
1. User navigates to Team Robots page
   ↓
2. Clicks "Create Robot" (if has create_robot permission)
   ↓
3. Selects a process from team processes
   ↓
4. Configures robot connections
   ↓
5. Submits → Backend validates templates & packages
   ↓
6. If validation fails → Show errors
   ↓
7. If validation passes → Robot created
   ↓
8. User clicks "Run" button
   ↓
9. Frontend validates via POST /validate?action=run
   ↓
10. If valid → Send to Lambda
    ↓
11. Robot starts executing
```

### Flow 2: Delete a Robot

```
1. User clicks "Delete" button on robot
   ↓
2. Frontend validates via POST /validate?action=delete
   ↓
3. If user doesn't have delete_robot permission → Show error
   ↓
4. If user has permission → Show confirmation dialog
   ↓
5. User confirms → DELETE /robots/:robotKey
   ↓
6. Robot deleted → Refresh list
```

---

## 🎯 Implementation Checklist

### Pages
- [ ] Team Processes List Page
- [ ] Team Process Create/Edit Page
- [ ] Team Robots List Page
- [ ] Team Robot Create Page
- [ ] Team Connections List Page

### Components
- [ ] Process List Table
- [ ] Process Form
- [ ] Robot List Table
- [ ] Robot Form
- [ ] Connection List
- [ ] Validation Error Display
- [ ] Validation Warning Display
- [ ] Permission-based Button Wrapper

### API Integration
- [ ] Team Processes API Service
- [ ] Team Robots API Service
- [ ] Team Connections API Service
- [ ] Robot Validation API Service

### Permission System
- [ ] Permission Context/Hook
- [ ] Permission Check Helper
- [ ] Conditional Rendering based on Permissions

### Validation
- [ ] Pre-run robot validation
- [ ] Pre-delete robot validation
- [ ] Process creation validation error handling
- [ ] Robot creation validation error handling

---

## 🚨 Important Notes

1. **Always validate before run/delete:**
   - Never skip validation
   - Show clear error messages
   - Handle warnings appropriately

2. **Permission-based UI:**
   - Hide buttons user can't use
   - Show helpful messages when permission denied
   - Graceful degradation

3. **Error Handling:**
   - Display validation errors clearly
   - Show user-friendly messages
   - Provide actionable feedback

4. **User Experience:**
   - Loading states during validation
   - Confirmation dialogs for destructive actions
   - Success/error toasts
   - Optimistic UI updates where appropriate

---

## 📞 Backend Contact

If you encounter any issues or need clarification:
- Backend is running on `http://localhost:3000`
- All endpoints are documented with Swagger: `http://localhost:3000/api`
- Check `TEAM_APIS_STATUS.md` for implementation status

---

## 🎨 Design Recommendations

1. **Process List:**
   - Table or card layout
   - Show: name, description, version, created by, last updated
   - Actions: View, Edit (if permitted), Delete (if permitted)

2. **Robot List:**
   - Table or card layout
   - Show: robot key, process name, created by, created at
   - Actions: View, Run (with validation), Delete (with validation)
   - Status indicator (running, stopped, error)

3. **Validation Errors:**
   - Use alert/banner component
   - List all errors clearly
   - Provide links to resolve (e.g., "Contact admin to grant permissions")

4. **Warnings:**
   - Use warning color scheme
   - Allow user to proceed with warnings
   - Don't block actions on warnings

---

## ✅ Testing Checklist

- [ ] Create process with valid templates
- [ ] Create process with invalid templates (should fail)
- [ ] Create robot from team process
- [ ] Validate robot for run (with permission)
- [ ] Validate robot for run (without permission)
- [ ] Validate robot for delete (with permission)
- [ ] Validate robot for delete (without permission)
- [ ] Run robot after successful validation
- [ ] Delete robot after successful validation
- [ ] View workspace connections from team
- [ ] Permission-based button visibility
- [ ] Error message display
- [ ] Warning message display

---

**Good luck with the implementation! 🚀**
