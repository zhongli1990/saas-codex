# RBAC Design Document

## Enterprise SaaS Multi-Tenant Platform

**Version**: v0.6.4  
**Last Updated**: Feb 8, 2026  
**Status**: Implementation in Progress  
**Branch**: `feature/skills-hooks-ui-rbac`

---

## 1. Executive Summary

This document defines the Role-Based Access Control (RBAC) architecture for a mission-critical enterprise SaaS platform. The design implements a **3-tier user hierarchy** supporting multi-tenancy with granular permissions for Skills and Hooks management.

---

## 2. User Hierarchy (3 Tiers)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TIER 1: SUPER ADMIN                                 │
│  Platform Owner / System Administrator                                      │
│  - Full platform access across all tenants                                  │
│  - Manage Platform Skills and Hooks                                         │
│  - Manage all tenants, users, and system configuration                      │
│  - View audit logs and system metrics                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                         TIER 2: ORG ADMIN                                   │
│  Customer Organization Administrator                                        │
│  - Full access within their tenant/organization                             │
│  - Manage Tenant Skills and Hooks                                           │
│  - Manage users and groups within their organization                        │
│  - Manage workspaces and projects within their organization                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                         TIER 3: END USERS                                   │
│  Customer Organization Members                                              │
│  - Access based on group membership and workspace grants                    │
│  - Use available Skills (cannot manage)                                     │
│  - Work within assigned workspaces/projects                                 │
│  - Roles: Project Admin, Editor, Viewer                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 3.1 Existing Tables (v0.5.0)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),  -- NULL for Super Admin
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, active, inactive, rejected
    role VARCHAR(20) NOT NULL DEFAULT 'user',  -- admin, user (platform-level)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Tenants table (Customer Organizations)
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, inactive, suspended
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata_json JSONB
);

-- Groups table (User Groups within Tenant)
CREATE TABLE groups (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- User-Group Membership
CREATE TABLE user_groups (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',  -- member, admin
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, group_id)
);

-- Workspace Access Grants
CREATE TABLE workspace_access (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    grantee_type VARCHAR(20) NOT NULL,  -- user, group
    grantee_id UUID NOT NULL,
    access_level VARCHAR(20) NOT NULL,  -- owner, editor, viewer
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    UNIQUE(workspace_id, grantee_type, grantee_id)
);
```

### 3.2 Role Definitions

#### Platform-Level Roles (User.role)

| Role | Description | Criteria |
|------|-------------|----------|
| `admin` | Super Admin | `User.role = 'admin' AND User.tenant_id IS NULL` |
| `user` | Regular user | `User.role = 'user'` |

#### Tenant-Level Roles (Derived)

| Role | Description | Criteria |
|------|-------------|----------|
| Org Admin | Tenant administrator | `UserGroup.role = 'admin'` for tenant's admin group |
| Member | Regular tenant member | `UserGroup.role = 'member'` |

#### Workspace-Level Roles (WorkspaceAccess.access_level)

| Role | Description | Permissions |
|------|-------------|-------------|
| `owner` | Workspace owner | Full control, can delete |
| `editor` | Can edit | Read/write, cannot delete |
| `viewer` | Read-only | View only |

---

## 4. Permission Matrix

### 4.1 Platform Features

| Feature | Super Admin | Org Admin | Project Admin | Editor | Viewer |
|---------|-------------|-----------|---------------|--------|--------|
| **Tenant Management** |
| Create tenant | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit tenant | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete tenant | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| **User Management** |
| Create user (any tenant) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create user (own tenant) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve users | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| Assign roles | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| **Group Management** |
| Create group | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage group members | ✅ | ✅ | ❌ | ❌ | ❌ |

### 4.2 Skills Management

| Action | Super Admin | Org Admin | Project Admin | Editor | Viewer |
|--------|-------------|-----------|---------------|--------|--------|
| **Platform Skills** |
| View | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Tenant Skills** |
| View | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Project Skills** |
| View | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Use Skills** | ✅ | ✅ | ✅ | ✅ | ❌ |

### 4.3 Hooks Management

| Action | Super Admin | Org Admin | Project Admin | Editor | Viewer |
|--------|-------------|-----------|---------------|--------|--------|
| **Platform Hooks** |
| View | ✅ | ✅ (read-only) | ❌ | ❌ | ❌ |
| Configure | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Tenant Hooks** |
| View | ✅ | ✅ | ❌ | ❌ | ❌ |
| Configure | ✅ | ✅ | ❌ | ❌ | ❌ |

### 4.4 Workspace Management

| Action | Super Admin | Org Admin | Project Admin | Editor | Viewer |
|--------|-------------|-----------|---------------|--------|--------|
| Create workspace | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete workspace | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| Grant access | ✅ | ✅ | ✅ (own) | ❌ | ❌ |
| View files | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit files | ✅ | ✅ | ✅ | ✅ | ❌ |
| Run prompts | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 5. API Authorization

### 5.1 Authorization Middleware

```python
# backend/app/auth/rbac.py

from enum import Enum
from typing import Optional
from fastapi import Depends, HTTPException, status
from .dependencies import get_current_user
from ..models import User, UserGroup, WorkspaceAccess

class Permission(Enum):
    # Platform
    MANAGE_TENANTS = "manage_tenants"
    MANAGE_ALL_USERS = "manage_all_users"
    MANAGE_PLATFORM_SKILLS = "manage_platform_skills"
    MANAGE_PLATFORM_HOOKS = "manage_platform_hooks"
    
    # Tenant
    MANAGE_TENANT_USERS = "manage_tenant_users"
    MANAGE_TENANT_SKILLS = "manage_tenant_skills"
    MANAGE_TENANT_HOOKS = "manage_tenant_hooks"
    MANAGE_TENANT_GROUPS = "manage_tenant_groups"
    
    # Workspace
    MANAGE_PROJECT_SKILLS = "manage_project_skills"
    EDIT_WORKSPACE = "edit_workspace"
    VIEW_WORKSPACE = "view_workspace"
    RUN_PROMPTS = "run_prompts"


def is_super_admin(user: User) -> bool:
    """Check if user is a Super Admin."""
    return user.role == "admin" and user.tenant_id is None


def is_org_admin(user: User, tenant_id: str, db) -> bool:
    """Check if user is an Org Admin for the specified tenant."""
    if user.tenant_id != tenant_id:
        return False
    # Check if user is admin of any group in the tenant
    # (In practice, check for membership in "Administrators" group with admin role)
    return db.query(UserGroup).filter(
        UserGroup.user_id == user.id,
        UserGroup.role == "admin"
    ).first() is not None


def get_workspace_access_level(user: User, workspace_id: str, db) -> Optional[str]:
    """Get user's access level for a workspace."""
    # Direct user grant
    access = db.query(WorkspaceAccess).filter(
        WorkspaceAccess.workspace_id == workspace_id,
        WorkspaceAccess.grantee_type == "user",
        WorkspaceAccess.grantee_id == user.id
    ).first()
    if access:
        return access.access_level
    
    # Group-based grant
    user_groups = db.query(UserGroup).filter(UserGroup.user_id == user.id).all()
    for ug in user_groups:
        access = db.query(WorkspaceAccess).filter(
            WorkspaceAccess.workspace_id == workspace_id,
            WorkspaceAccess.grantee_type == "group",
            WorkspaceAccess.grantee_id == ug.group_id
        ).first()
        if access:
            return access.access_level
    
    return None


def require_permission(permission: Permission):
    """Dependency to require a specific permission."""
    async def check_permission(
        user: User = Depends(get_current_user),
        # Additional context passed via request state
    ):
        # Super Admin has all permissions
        if is_super_admin(user):
            return user
        
        # Check specific permissions based on context
        # (Implementation depends on the specific endpoint)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {permission.value}"
        )
    
    return check_permission
```

### 5.2 Endpoint Authorization Examples

```python
# Skills endpoints with RBAC

@router.get("/api/skills")
async def list_skills(
    user: User = Depends(get_current_user),
    scope: str = Query("platform"),
    tenant_id: Optional[str] = Query(None),
):
    """List skills - filtered by user's access."""
    skills = []
    
    # Platform skills - visible to all authenticated users
    if scope in [None, "platform"]:
        skills.extend(get_platform_skills())
    
    # Tenant skills - only visible to tenant members
    if scope in [None, "tenant"] and tenant_id:
        if is_super_admin(user) or user.tenant_id == tenant_id:
            skills.extend(get_tenant_skills(tenant_id))
    
    return skills


@router.post("/api/skills")
async def create_skill(
    request: CreateSkillRequest,
    user: User = Depends(get_current_user),
):
    """Create skill - requires appropriate permissions."""
    if request.scope == "platform":
        if not is_super_admin(user):
            raise HTTPException(403, "Only Super Admin can create platform skills")
    
    elif request.scope == "tenant":
        if not (is_super_admin(user) or is_org_admin(user, request.tenant_id)):
            raise HTTPException(403, "Only Org Admin can create tenant skills")
    
    elif request.scope == "project":
        access = get_workspace_access_level(user, request.project_id)
        if access != "owner" and not is_super_admin(user) and not is_org_admin(user, request.tenant_id):
            raise HTTPException(403, "Only Project Admin can create project skills")
    
    return create_skill_impl(request, user)
```

---

## 6. Frontend Authorization

### 6.1 User Context

```typescript
// contexts/AuthContext.tsx

interface User {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "user";
  tenantId: string | null;
  status: string;
}

interface AuthContextType {
  user: User | null;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  tenantId: string | null;
  permissions: Set<string>;
  hasPermission: (permission: string) => boolean;
}

export function useAuth(): AuthContextType {
  const { user } = useAppContext();
  
  const isSuperAdmin = user?.role === "admin" && user?.tenantId === null;
  const isOrgAdmin = user?.role === "admin" || /* check group admin */;
  
  const permissions = useMemo(() => {
    const perms = new Set<string>();
    
    if (isSuperAdmin) {
      // Super Admin has all permissions
      perms.add("manage_tenants");
      perms.add("manage_all_users");
      perms.add("manage_platform_skills");
      perms.add("manage_platform_hooks");
      perms.add("manage_tenant_skills");
      perms.add("manage_tenant_hooks");
      perms.add("manage_project_skills");
    } else if (isOrgAdmin) {
      perms.add("manage_tenant_users");
      perms.add("manage_tenant_skills");
      perms.add("manage_tenant_hooks");
      perms.add("manage_tenant_groups");
      perms.add("manage_project_skills");
    }
    
    return perms;
  }, [user, isSuperAdmin, isOrgAdmin]);
  
  return {
    user,
    isSuperAdmin,
    isOrgAdmin,
    tenantId: user?.tenantId || null,
    permissions,
    hasPermission: (p) => permissions.has(p),
  };
}
```

### 6.2 Protected Routes

```typescript
// components/ProtectedRoute.tsx

interface ProtectedRouteProps {
  permission?: string;
  requireSuperAdmin?: boolean;
  requireOrgAdmin?: boolean;
  children: React.ReactNode;
}

export function ProtectedRoute({
  permission,
  requireSuperAdmin,
  requireOrgAdmin,
  children,
}: ProtectedRouteProps) {
  const { user, isSuperAdmin, isOrgAdmin, hasPermission } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (requireSuperAdmin && !isSuperAdmin) {
    return <AccessDenied message="Super Admin access required" />;
  }
  
  if (requireOrgAdmin && !isOrgAdmin && !isSuperAdmin) {
    return <AccessDenied message="Organization Admin access required" />;
  }
  
  if (permission && !hasPermission(permission)) {
    return <AccessDenied message={`Permission required: ${permission}`} />;
  }
  
  return <>{children}</>;
}
```

### 6.3 Navigation Menu

```typescript
// components/Navigation.tsx

const navItems = [
  { path: "/codex", label: "Agent Console", permission: null },
  { path: "/workspaces", label: "Workspaces", permission: null },
  { path: "/admin/skills", label: "Skills", permission: "manage_platform_skills", orgAdminAlt: "manage_tenant_skills" },
  { path: "/admin/hooks", label: "Hooks", permission: "manage_platform_hooks", orgAdminAlt: "manage_tenant_hooks" },
  { path: "/admin/users", label: "Users", permission: "manage_all_users", orgAdminAlt: "manage_tenant_users" },
  { path: "/admin/tenants", label: "Tenants", permission: "manage_tenants" },
];

function Navigation() {
  const { hasPermission, isOrgAdmin } = useAuth();
  
  return (
    <nav>
      {navItems.map((item) => {
        // Check if user has permission
        const hasAccess = 
          item.permission === null ||
          hasPermission(item.permission) ||
          (item.orgAdminAlt && hasPermission(item.orgAdminAlt));
        
        if (!hasAccess) return null;
        
        return <NavLink key={item.path} to={item.path}>{item.label}</NavLink>;
      })}
    </nav>
  );
}
```

---

## 7. UI Routes

### 7.1 Route Structure

| Route | Component | Access |
|-------|-----------|--------|
| `/login` | LoginPage | Public |
| `/register` | RegisterPage | Public |
| `/codex` | AgentConsole | Authenticated |
| `/workspaces` | WorkspaceList | Authenticated |
| `/admin/skills` | SkillsManagement | Super Admin / Org Admin |
| `/admin/hooks` | HooksManagement | Super Admin / Org Admin |
| `/admin/users` | UserManagement | Super Admin / Org Admin |
| `/admin/tenants` | TenantManagement | Super Admin only |
| `/settings` | UserSettings | Authenticated |

### 7.2 Skills Management Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/admin/skills` | SkillsList | Super Admin / Org Admin |
| `/admin/skills/new` | SkillEditor | Super Admin / Org Admin |
| `/admin/skills/:name` | SkillEditor | Super Admin / Org Admin |
| `/admin/skills/:name/files` | SkillFiles | Super Admin / Org Admin |

---

## 8. Implementation Checklist

### Phase 1: Backend RBAC (Current)
- [x] User model with role and tenant_id
- [x] Tenant, Group, UserGroup models
- [x] WorkspaceAccess model
- [ ] RBAC middleware for permission checking
- [ ] Update Skills API with authorization
- [ ] Update Hooks API with authorization

### Phase 2: Frontend RBAC
- [ ] AuthContext with permission checking
- [ ] ProtectedRoute component
- [ ] Navigation with permission-based visibility
- [ ] Skills Management UI with RBAC
- [ ] Hooks Management UI with RBAC

### Phase 3: Testing
- [ ] Unit tests for RBAC middleware
- [ ] E2E tests for permission enforcement
- [ ] Manual testing with different user roles

---

## 9. Test Scenarios

### 9.1 Super Admin Tests

| Test | Expected Result |
|------|-----------------|
| Login as Super Admin | Full navigation visible |
| View all tenants | All tenants listed |
| Create platform skill | Success |
| Edit platform skill | Success |
| Delete platform skill | Success |
| View tenant skills | All tenant skills visible |
| Configure platform hooks | Success |

### 9.2 Org Admin Tests

| Test | Expected Result |
|------|-----------------|
| Login as Org Admin | Tenant-scoped navigation |
| View tenants | Only own tenant visible |
| Create platform skill | 403 Forbidden |
| Create tenant skill | Success |
| Edit tenant skill | Success |
| View other tenant skills | 403 Forbidden |
| Configure tenant hooks | Success |
| Configure platform hooks | 403 Forbidden |

### 9.3 End User Tests

| Test | Expected Result |
|------|-----------------|
| Login as End User | Limited navigation |
| View Skills admin | 403 / Not visible |
| Use skills in Agent Console | Success |
| Create any skill | 403 Forbidden |
| View Hooks admin | 403 / Not visible |

---

## 10. Security Considerations

### 10.1 Defense in Depth

1. **Frontend**: Hide unauthorized UI elements
2. **API**: Validate permissions on every request
3. **Database**: Row-level security where applicable

### 10.2 Audit Logging

All permission-sensitive actions should be logged:
- User authentication events
- Permission denials
- Skill/Hook modifications
- User role changes

### 10.3 Session Security

- JWT tokens with short expiry (1 hour)
- Refresh token rotation
- Session invalidation on role change

---

## Appendix A: Default Groups

Each tenant should have these default groups:

| Group | Description | Default Role |
|-------|-------------|--------------|
| Administrators | Org Admins | admin |
| Developers | Development team | member |
| QA | Quality Assurance | member |
| Viewers | Read-only access | member |

---

## Appendix B: Migration Path

For existing users without tenant assignment:

1. Create a "Default" tenant for legacy users
2. Assign legacy users to Default tenant
3. Create Administrators group in Default tenant
4. Assign existing admins to Administrators group
