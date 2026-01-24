# 📚 Team APIs Documentation Index

## 🎯 For Frontend Developers

### Start Here 👇

1. **Quick Start Guide** ⭐ **READ THIS FIRST**
   - File: [`FE_QUICK_START_TEAM_APIS.md`](./FE_QUICK_START_TEAM_APIS.md)
   - What: Essential code examples and quick reference
   - Time: 10 minutes read

2. **Full Implementation Guide**
   - File: [`FE_TEAM_APIS_IMPLEMENTATION_GUIDE.md`](./FE_TEAM_APIS_IMPLEMENTATION_GUIDE.md)
   - What: Detailed API documentation with all endpoints
   - Time: 30 minutes read

---

## 🔧 For Backend Developers

### Implementation Status

1. **Team APIs Status** ✅ **COMPLETE**
   - File: [`../TEAM_APIS_STATUS.md`](../TEAM_APIS_STATUS.md)
   - What: Current implementation status and features
   - Status: All services implemented with validation

2. **Implementation Plan**
   - File: [`../TEAM_APIS_IMPLEMENTATION_PLAN.md`](../TEAM_APIS_IMPLEMENTATION_PLAN.md)
   - What: Original implementation plan and architecture

---

## 📖 What's Been Implemented

### ✅ Team Processes APIs
- Full CRUD operations
- Permission-based access control
- Activity template validation
- Activity package access validation

### ✅ Team Robots APIs
- Full CRUD operations
- Permission-based access control
- **Robot validation API** (run & delete)
- Process template validation on creation

### ✅ Team Connections APIs
- Read-only access to workspace connections
- Filter by provider
- Team member permission checks

### ✅ Permission System
- Role-based access control (RBAC)
- Granular permissions (view, create, edit, delete, run)
- Activity template access control
- Activity package access control

### ⭐ Robot Validation API (NEW)
- Validate before run
- Validate before delete
- Detailed error messages
- Warning system

---

## 🚀 Quick Reference

### Base URL
```
http://localhost:3000
```

### Authentication
```typescript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

### Key Endpoints

**Processes:**
```
GET    /team/:teamId/processes
POST   /team/:teamId/processes
PUT    /team/:teamId/processes/:id
DELETE /team/:teamId/processes/:id
```

**Robots:**
```
GET    /team/:teamId/robots
POST   /team/:teamId/robots
POST   /team/:teamId/robots/:key/validate?action={run|delete}  ← NEW!
DELETE /team/:teamId/robots/:key
```

**Connections:**
```
GET    /team/:teamId/connections
```

---

## 🔑 Permissions

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

## 💡 Key Concepts

### 1. Role-Based Permissions
Every action checks user's role permissions. Users can only perform actions their role allows.

### 2. Activity Template Access
Users can only use activity templates their role has access to. This is checked when creating/updating processes.

### 3. Activity Package Access
Teams must have explicit access to activity packages. This is managed by workspace owner.

### 4. Pre-Action Validation
Before running or deleting robots, frontend must validate to check permissions and template access.

### 5. Workspace Connection Inheritance
Teams use workspace connections (read-only). No need to create separate connections for teams.

---

## 🎯 Frontend Implementation Checklist

### Phase 1: Basic Pages
- [ ] Team Processes List Page
- [ ] Team Robots List Page
- [ ] Team Connections List Page

### Phase 2: CRUD Operations
- [ ] Create Process Form
- [ ] Edit Process Form
- [ ] Create Robot Form
- [ ] Delete Confirmation Dialogs

### Phase 3: Validation
- [ ] Robot Run Validation
- [ ] Robot Delete Validation
- [ ] Error Display Component
- [ ] Warning Display Component

### Phase 4: Permissions
- [ ] Permission Context/Hook
- [ ] Conditional Button Rendering
- [ ] Permission-based Navigation

---

## 🧪 Testing

### Test with Different Roles

1. **Admin Role** (all permissions)
   - Should see all buttons
   - Can perform all actions
   - No validation errors

2. **Member Role** (view only)
   - Should only see view buttons
   - Cannot create/edit/delete
   - Run/delete buttons hidden

3. **Developer Role** (all except delete)
   - Can create, edit, run
   - Cannot delete
   - Delete buttons hidden

### Test Validation Scenarios

1. **Valid Robot Run**
   - User has run_robot permission
   - User has template access
   - Team has package access
   - Result: isValid = true

2. **Invalid Robot Run - No Permission**
   - User doesn't have run_robot permission
   - Result: isValid = false, error message

3. **Invalid Robot Run - No Template Access**
   - User has run_robot permission
   - User doesn't have template access
   - Result: isValid = false, error message

4. **Valid Robot Delete**
   - User has delete_robot permission
   - Result: isValid = true

5. **Invalid Robot Delete - No Permission**
   - User doesn't have delete_robot permission
   - Result: isValid = false, error message

---

## 📞 Support

### Backend Issues
- Check server is running: `npm run start:dev`
- Check Swagger docs: `http://localhost:3000/api`
- Check logs in terminal

### API Questions
- Read full guide: `FE_TEAM_APIS_IMPLEMENTATION_GUIDE.md`
- Check implementation status: `TEAM_APIS_STATUS.md`

### Permission Issues
- Verify user is team member
- Check user's role permissions
- Verify team has package access

---

## 🎨 UI/UX Recommendations

### Error Messages
- ✅ Clear and specific
- ✅ Actionable (tell user what to do)
- ✅ User-friendly language

**Example:**
```
❌ Bad: "Forbidden"
✅ Good: "You don't have permission to run robots. Contact your team admin to update your role."
```

### Warnings
- ⚠️ Use warning color (yellow/orange)
- ⚠️ Don't block user action
- ⚠️ Provide context

**Example:**
```
⚠️ "This robot has no connections configured. It may not work as expected."
```

### Loading States
- Show spinner during validation
- Disable buttons during API calls
- Provide feedback on success/error

### Confirmation Dialogs
- Always confirm destructive actions (delete)
- Show what will be deleted
- Provide cancel option

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Processes   │  │   Robots     │  │Connections│ │
│  │     Page     │  │    Page      │  │   Page    │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                 │       │
│         └─────────────────┴─────────────────┘       │
│                           │                         │
└───────────────────────────┼─────────────────────────┘
                            │
                            │ HTTP/REST
                            │
┌───────────────────────────┼─────────────────────────┐
│                    Backend (NestJS)                 │
│  ┌─────────────────────────────────────────────┐   │
│  │         Team APIs Controllers               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │   │
│  │  │Processes │ │  Robots  │ │ Connections │ │   │
│  │  │Controller│ │Controller│ │  Controller │ │   │
│  │  └────┬─────┘ └────┬─────┘ └──────┬──────┘ │   │
│  └───────┼────────────┼───────────────┼────────┘   │
│          │            │               │            │
│  ┌───────┼────────────┼───────────────┼────────┐   │
│  │       │            │               │        │   │
│  │  ┌────▼─────┐ ┌────▼─────┐ ┌──────▼──────┐ │   │
│  │  │Processes │ │  Robots  │ │ Connections │ │   │
│  │  │ Service  │ │ Service  │ │   Service   │ │   │
│  │  └────┬─────┘ └────┬─────┘ └──────┬──────┘ │   │
│  │       │            │               │        │   │
│  │       └────────────┴───────────────┘        │   │
│  │                    │                        │   │
│  │       ┌────────────▼────────────┐           │   │
│  │       │  Team Permission        │           │   │
│  │       │      Service            │           │   │
│  │       │  - Check permissions    │           │   │
│  │       │  - Validate templates   │           │   │
│  │       │  - Validate packages    │           │   │
│  │       └─────────────────────────┘           │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │            Database Layer                   │   │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────┐  │   │
│  │  │  MySQL  │  │ MongoDB  │  │TypeORM/   │  │   │
│  │  │(Metadata│  │(Process  │  │Mongoose   │  │   │
│  │  │)        │  │Details)  │  │           │  │   │
│  │  └─────────┘  └──────────┘  └───────────┘  │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 📝 Change Log

### 2024-01-24
- ✅ Implemented Team Processes APIs
- ✅ Implemented Team Robots APIs
- ✅ Implemented Team Connections APIs
- ✅ Implemented Permission System
- ✅ **Added Robot Validation API** (run & delete)
- ✅ Created Frontend Documentation

---

## 🎉 Ready to Start!

1. Read [`FE_QUICK_START_TEAM_APIS.md`](./FE_QUICK_START_TEAM_APIS.md)
2. Check backend is running
3. Test APIs with Postman
4. Start implementing!

**Good luck! 🚀**
