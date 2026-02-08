"""RBAC (Role-Based Access Control) middleware and utilities."""

from enum import Enum
from typing import Optional, List
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User, UserGroup, WorkspaceAccess, Group
from .dependencies import get_current_user


class Permission(Enum):
    """Permission types for RBAC."""
    # Platform-level (Super Admin only)
    MANAGE_TENANTS = "manage_tenants"
    MANAGE_ALL_USERS = "manage_all_users"
    MANAGE_PLATFORM_SKILLS = "manage_platform_skills"
    MANAGE_PLATFORM_HOOKS = "manage_platform_hooks"
    VIEW_ALL_TENANTS = "view_all_tenants"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    
    # Tenant-level (Org Admin)
    MANAGE_TENANT_USERS = "manage_tenant_users"
    MANAGE_TENANT_SKILLS = "manage_tenant_skills"
    MANAGE_TENANT_HOOKS = "manage_tenant_hooks"
    MANAGE_TENANT_GROUPS = "manage_tenant_groups"
    VIEW_TENANT_USERS = "view_tenant_users"
    
    # Workspace-level
    MANAGE_PROJECT_SKILLS = "manage_project_skills"
    MANAGE_WORKSPACE = "manage_workspace"
    EDIT_WORKSPACE = "edit_workspace"
    VIEW_WORKSPACE = "view_workspace"
    RUN_PROMPTS = "run_prompts"


class UserRole(Enum):
    """User role hierarchy."""
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    PROJECT_ADMIN = "project_admin"
    EDITOR = "editor"
    VIEWER = "viewer"
    MEMBER = "member"


def is_super_admin(user: User) -> bool:
    """Check if user is a Super Admin (platform owner)."""
    return user.role == "admin" and user.tenant_id is None


async def is_org_admin(user: User, db: AsyncSession, tenant_id: Optional[UUID] = None) -> bool:
    """Check if user is an Org Admin for their tenant or specified tenant."""
    # Super Admin is also considered Org Admin for any tenant
    if is_super_admin(user):
        return True
    
    # User must belong to the tenant
    target_tenant = tenant_id or user.tenant_id
    if user.tenant_id != target_tenant:
        return False
    
    # Check if user has admin role in any group within the tenant
    result = await db.execute(
        select(UserGroup)
        .join(Group, UserGroup.group_id == Group.id)
        .where(
            UserGroup.user_id == user.id,
            UserGroup.role == "admin",
            Group.tenant_id == target_tenant
        )
    )
    return result.scalar_one_or_none() is not None


async def get_workspace_access_level(
    user: User, 
    workspace_id: UUID, 
    db: AsyncSession
) -> Optional[str]:
    """Get user's access level for a workspace."""
    # Super Admin has owner access to all workspaces
    if is_super_admin(user):
        return "owner"
    
    # Check direct user grant
    result = await db.execute(
        select(WorkspaceAccess).where(
            WorkspaceAccess.workspace_id == workspace_id,
            WorkspaceAccess.grantee_type == "user",
            WorkspaceAccess.grantee_id == user.id
        )
    )
    access = result.scalar_one_or_none()
    if access:
        return access.access_level
    
    # Check group-based grants
    user_groups_result = await db.execute(
        select(UserGroup).where(UserGroup.user_id == user.id)
    )
    user_groups = user_groups_result.scalars().all()
    
    for ug in user_groups:
        result = await db.execute(
            select(WorkspaceAccess).where(
                WorkspaceAccess.workspace_id == workspace_id,
                WorkspaceAccess.grantee_type == "group",
                WorkspaceAccess.grantee_id == ug.group_id
            )
        )
        access = result.scalar_one_or_none()
        if access:
            return access.access_level
    
    return None


def get_user_permissions(user: User, is_org_admin_flag: bool = False) -> set:
    """Get all permissions for a user based on their role."""
    permissions = set()
    
    if is_super_admin(user):
        # Super Admin has all permissions
        permissions.update([p.value for p in Permission])
    elif is_org_admin_flag:
        # Org Admin permissions
        permissions.update([
            Permission.MANAGE_TENANT_USERS.value,
            Permission.MANAGE_TENANT_SKILLS.value,
            Permission.MANAGE_TENANT_HOOKS.value,
            Permission.MANAGE_TENANT_GROUPS.value,
            Permission.VIEW_TENANT_USERS.value,
            Permission.MANAGE_PROJECT_SKILLS.value,
            Permission.MANAGE_WORKSPACE.value,
            Permission.EDIT_WORKSPACE.value,
            Permission.VIEW_WORKSPACE.value,
            Permission.RUN_PROMPTS.value,
        ])
    else:
        # Regular user - basic permissions
        permissions.update([
            Permission.VIEW_WORKSPACE.value,
            Permission.RUN_PROMPTS.value,
        ])
    
    return permissions


async def require_super_admin(
    user: User = Depends(get_current_user)
) -> User:
    """Dependency that requires Super Admin role."""
    if not is_super_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )
    return user


async def require_org_admin(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency that requires Org Admin role (or Super Admin)."""
    if is_super_admin(user):
        return user
    
    if not await is_org_admin(user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization Admin access required"
        )
    return user


async def require_workspace_access(
    workspace_id: UUID,
    min_level: str = "viewer",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency that requires minimum workspace access level."""
    access_level = await get_workspace_access_level(user, workspace_id, db)
    
    if access_level is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access to this workspace"
        )
    
    # Access level hierarchy: owner > editor > viewer
    level_hierarchy = {"owner": 3, "editor": 2, "viewer": 1}
    if level_hierarchy.get(access_level, 0) < level_hierarchy.get(min_level, 0):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires {min_level} access or higher"
        )
    
    return user


class PermissionChecker:
    """Dependency class for checking specific permissions."""
    
    def __init__(self, permission: Permission):
        self.permission = permission
    
    async def __call__(
        self,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        # Super Admin has all permissions
        if is_super_admin(user):
            return user
        
        # Check if user is Org Admin
        org_admin = await is_org_admin(user, db)
        permissions = get_user_permissions(user, org_admin)
        
        if self.permission.value not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.permission.value}"
            )
        
        return user


# Convenience dependencies for common permission checks
require_manage_platform_skills = PermissionChecker(Permission.MANAGE_PLATFORM_SKILLS)
require_manage_tenant_skills = PermissionChecker(Permission.MANAGE_TENANT_SKILLS)
require_manage_project_skills = PermissionChecker(Permission.MANAGE_PROJECT_SKILLS)
require_manage_platform_hooks = PermissionChecker(Permission.MANAGE_PLATFORM_HOOKS)
require_manage_tenant_hooks = PermissionChecker(Permission.MANAGE_TENANT_HOOKS)
