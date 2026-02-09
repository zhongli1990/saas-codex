# RBAC v0.7.0 — Streamlined Resource-Based Access Control

**Version**: v0.7.0  
**Last Updated**: Feb 9, 2026  
**Status**: Proposed  
**Branch**: `feature/rbac-streaming-v07`

---

## 1. Design Philosophy

**Simple but effective.** Rather than a complex permission engine, we use a **resource ownership model** where every data record belongs to a tenant, and access is determined by the user's role + tenant membership. No separate permissions table needed — the role IS the permission set.

```
┌──────────────────────────────────────────────────────────────────┐
│                     RESOURCE OWNERSHIP MODEL                      │
│                                                                    │
│   Every resource has:  tenant_id  +  owner_id                     │
│   Every user has:      tenant_id  +  role                         │
│                                                                    │
│   Access = role_privileges ∩ tenant_scope                         │
│                                                                    │
│   tenant_id = NULL  →  Platform-level resource (Super Admin only) │
│   tenant_id = X     →  Org-level resource (visible to tenant X)   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Roles & Privileges (5 Roles, 3 Privilege Levels)

### 2.1 Privilege Levels

| Privilege | Symbol | Description |
|-----------|--------|-------------|
| **Read**  | `R`    | View/list the resource |
| **Write** | `W`    | Create new, edit own resources |
| **Manage**| `M`    | Edit/delete any resource in scope, assign access |

### 2.2 Role Definitions

| Role | Scope | Privileges | Description |
|------|-------|------------|-------------|
| `super_admin` | **All tenants** | `M` on everything | Platform owner. Sees all orgs, all resources, all users. No tenant_id restriction. |
| `org_admin` | **Own tenant** | `M` on tenant resources | Org administrator. Full control within their tenant. Can manage users, prompts, skills, hooks, workspaces belonging to their org. |
| `project_admin` | **Own tenant** | `W` + `R` on tenant resources, `M` on own resources | Team lead. Can create and edit resources, manage their own workspaces. |
| `editor` | **Own tenant** | `W` + `R` on tenant resources | Regular contributor. Can create prompts, run agents, use skills. Cannot delete others' resources. |
| `viewer` | **Own tenant** | `R` only | Read-only access. Can view dashboards, prompts, skills but cannot create or modify. |

### 2.3 Role Hierarchy

```
super_admin  ⊃  org_admin  ⊃  project_admin  ⊃  editor  ⊃  viewer
     M              M              W+M(own)         W+R         R
  (all orgs)    (own org)        (own org)       (own org)   (own org)
```

---

## 3. Resource Types & Ownership

### 3.1 All Resources in the System

| Resource Table | tenant_id | owner_id | Description |
|----------------|-----------|----------|-------------|
| `workspaces` | ✅ (exists) | ✅ (exists) | Code repositories / project folders |
| `sessions` | via workspace | via workspace | Agent sessions within a workspace |
| `runs` | via session | via session | Individual agent runs |
| `prompt_templates` | ✅ (exists) | ✅ (exists) | Prompt templates |
| `skills` | ✅ (exists) | ✅ (exists) | Agent skills |
| `users` | ✅ (exists) | N/A | User accounts |
| `groups` | via tenant_id | N/A | User groups within a tenant |

### 3.2 Resource Scoping Rules

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESOURCE VISIBILITY RULES                      │
│                                                                    │
│  Super Admin:                                                      │
│    → Sees ALL resources across ALL tenants                        │
│    → Can CRUD any resource                                        │
│                                                                    │
│  Org Admin / Project Admin / Editor / Viewer:                     │
│    → Sees resources WHERE:                                        │
│        resource.tenant_id = user.tenant_id   (own org)            │
│        OR resource.tenant_id IS NULL         (platform/shared)    │
│    → Write/Manage based on role level                             │
│                                                                    │
│  No tenant_id on user (unassigned):                               │
│    → Can only see platform-level resources (tenant_id IS NULL)    │
│    → Effectively read-only until assigned to a tenant             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Permission Matrix — All Resources

### 4.1 User & Tenant Management

| Action | super_admin | org_admin | project_admin | editor | viewer |
|--------|:-----------:|:---------:|:-------------:|:------:|:------:|
| View all tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create/edit tenant | ✅ | ❌ | ❌ | ❌ | ❌ |
| View users (all orgs) | ✅ | ❌ | ❌ | ❌ | ❌ |
| View users (own org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve/reject users | ✅ | ✅¹ | ❌ | ❌ | ❌ |
| Change user roles | ✅ | ✅² | ❌ | ❌ | ❌ |
| Assign user to tenant | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage groups | ✅ | ✅¹ | ❌ | ❌ | ❌ |

¹ Own tenant only  ² Cannot promote above own role

### 4.2 Prompts & Templates

| Action | super_admin | org_admin | project_admin | editor | viewer |
|--------|:-----------:|:---------:|:-------------:|:------:|:------:|
| View (own org + platform) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View (all orgs) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit own | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit any (own org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete own | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete any (own org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Publish | ✅ | ✅ | ✅ | ❌ | ❌ |
| Use/render | ✅ | ✅ | ✅ | ✅ | ❌ |

### 4.3 Skills

| Action | super_admin | org_admin | project_admin | editor | viewer |
|--------|:-----------:|:---------:|:-------------:|:------:|:------:|
| View (own org + platform) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View (all orgs) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit own | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit any (own org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Enable/disable | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ |

### 4.4 Hooks

| Action | super_admin | org_admin | project_admin | editor | viewer |
|--------|:-----------:|:---------:|:-------------:|:------:|:------:|
| View (own org + platform) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Configure (own org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure (platform) | ✅ | ❌ | ❌ | ❌ | ❌ |

### 4.5 Workspaces & Agent Console

| Action | super_admin | org_admin | project_admin | editor | viewer |
|--------|:-----------:|:---------:|:-------------:|:------:|:------:|
| View (own org + platform) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View (all orgs) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create workspace | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete own workspace | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete any (own org) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Run prompts | ✅ | ✅ | ✅ | ✅ | ❌ |
| View sessions/history | ✅ | ✅ | ✅ | ✅ | ✅ |

### 4.6 UI Navigation

| Page/Tab | super_admin | org_admin | project_admin | editor | viewer |
|----------|:-----------:|:---------:|:-------------:|:------:|:------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Agent Console | ✅ | ✅ | ✅ | ✅ | 👁️ |
| Chat | ✅ | ✅ | ✅ | ✅ | 👁️ |
| Prompts | ✅ | ✅ | ✅ | ✅ | 👁️ |
| Admin → Users | ✅ | ✅¹ | ❌ | ❌ | ❌ |
| Admin → Skills | ✅ | ✅ | ✅ | 👁️ | 👁️ |
| Admin → Hooks | ✅ | ✅ | ❌ | ❌ | ❌ |
| Settings & RBAC | ✅ | ✅ | ❌ | ❌ | ❌ |

👁️ = Read-only view  ¹ = Filtered to own tenant

---

## 5. Implementation Strategy

### 5.1 Backend: Tenant-Scoped Query Helper

The core pattern — a single reusable function that filters any query by tenant scope:

```python
# backend/app/auth/rbac.py

ROLE_HIERARCHY = {
    "super_admin": 5,
    "org_admin": 4,
    "project_admin": 3,
    "editor": 2,
    "viewer": 1,
}

def is_super_admin(user) -> bool:
    return user.role in ("admin", "super_admin")

def has_role_level(user, min_role: str) -> bool:
    return ROLE_HIERARCHY.get(user.role, 0) >= ROLE_HIERARCHY.get(min_role, 0)

def tenant_filter(query, model, user):
    """Apply tenant scoping to any SQLAlchemy query.
    
    - super_admin: no filter (sees everything)
    - others: filter to own tenant + platform resources (tenant_id IS NULL)
    """
    if is_super_admin(user):
        return query  # No filter
    
    return query.where(
        or_(
            model.tenant_id == user.tenant_id,
            model.tenant_id.is_(None)  # Platform/shared resources
        )
    )
```

### 5.2 Backend: Resource Creation Auto-Tags Tenant

```python
# When creating any resource, auto-set tenant_id from the current user
@router.post("/templates")
async def create_template(data: CreateTemplate, user = Depends(get_current_user)):
    if not has_role_level(user, "editor"):
        raise HTTPException(403, "Insufficient privileges")
    
    template = PromptTemplate(
        tenant_id=user.tenant_id,  # Auto-inherit from user
        owner_id=user.id,
        **data.dict()
    )
    ...
```

### 5.3 Frontend: Conditional UI Rendering

```typescript
// Shared role check utilities
const ROLE_LEVELS = { super_admin: 5, org_admin: 4, project_admin: 3, editor: 2, viewer: 1 };

function hasMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_LEVELS[userRole] || 0) >= (ROLE_LEVELS[minRole] || 0);
}

// Usage in components:
{hasMinRole(user.role, "editor") && <button>Create Template</button>}
{hasMinRole(user.role, "org_admin") && <button>Delete</button>}
```

---

## 6. What Changes Now (v0.7.0 Scope)

### Phase 1: Placeholder Tenant Binding (Current Sprint)

All resource tables already have `tenant_id` columns. The changes needed:

1. **Backend API filtering**: Add `tenant_filter()` to all list endpoints so org users only see their tenant's resources
2. **Auto-tag on create**: When a user creates a prompt/skill/workspace, auto-set `tenant_id` from their user record
3. **Super admin bypass**: Super admin sees all resources unfiltered
4. **Frontend role checks**: Hide create/edit/delete buttons based on role level
5. **Admin Users page**: Org admins see only their tenant's users

### Phase 2: Full RBAC Enforcement (Future)

- Workspace-level access grants (already have `workspace_access` table)
- Group-based permissions (already have `groups` + `user_groups` tables)
- Audit logging for all RBAC-sensitive operations
- Fine-grained permission overrides per resource

---

## 7. Database — No New Tables Needed

The existing schema already supports this design:

| Table | Status | Notes |
|-------|--------|-------|
| `users` (tenant_id, role) | ✅ Ready | Migration 005 expanded roles |
| `tenants` | ✅ Ready | 2 sample tenants seeded |
| `groups` | ✅ Ready | 8 sample groups seeded |
| `user_groups` | ✅ Ready | Join table exists |
| `workspaces` (tenant_id, owner_id) | ✅ Ready | Columns exist |
| `prompt_templates` (tenant_id, owner_id) | ✅ Ready | Columns exist |
| `skills` (tenant_id, owner_id) | ✅ Ready | Columns exist |
| `workspace_access` | ✅ Ready | For future fine-grained grants |

**No new migration needed** — just backend query filtering and frontend UI gating.

---

## 8. Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    RBAC v0.7.0 AT A GLANCE                       │
│                                                                    │
│  Model:     Resource Ownership (tenant_id + owner_id)             │
│  Roles:     5 (super_admin → org_admin → project_admin →         │
│                  editor → viewer)                                  │
│  Privileges: 3 (Read, Write, Manage)                              │
│  Scoping:   Tenant-based (user.tenant_id = resource.tenant_id)   │
│  Super:     Sees all, manages all, no tenant filter               │
│  New tables: None (all columns already exist)                     │
│  Pattern:   tenant_filter() on queries + auto-tag on create       │
└─────────────────────────────────────────────────────────────────┘
```
