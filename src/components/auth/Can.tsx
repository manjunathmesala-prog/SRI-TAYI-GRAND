'use client';

/**
 * ==============================================================================
 * SRI TAYI GRAND - DECLARATIVE RBAC AUTHORIZATION COMPONENT (<Can />)
 * Dynamically hides, disables, or reveals UI buttons, actions, and sections.
 * ==============================================================================
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  RoleEnum,
  Permission,
  Resource,
  normalizeRole,
  hasPermission,
  isRoleAtLeast,
} from '@/lib/rbac/types';

interface RBACContextValue {
  role: RoleEnum;
  userRoleString: string;
  isSuperAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  can: (action: string, resource: Resource) => boolean;
  canPermission: (permission: Permission) => boolean;
  hasRole: (minRole: RoleEnum) => boolean;
}

const RBACContext = createContext<RBACContextValue>({
  role: 'STAFF',
  userRoleString: 'Staff',
  isSuperAdmin: false,
  isManager: false,
  isStaff: true,
  can: () => false,
  canPermission: () => false,
  hasRole: () => false,
});

/**
 * Context Provider that tracks active authenticated role from localStorage
 */
export function RBACProvider({
  children,
  initialRole,
}: {
  children: React.ReactNode;
  initialRole?: string;
}) {
  const [roleStr, setRoleStr] = useState<string>(initialRole || 'Super Admin');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('stg_role');
      if (stored) {
        setRoleStr(stored);
      }
    }
  }, []);

  const normalized = normalizeRole(roleStr);
  const isSuperAdmin = normalized === 'SUPER_ADMIN';
  const isManager = normalized === 'MANAGER';
  const isStaff = normalized === 'STAFF';

  const can = (action: string, resource: Resource): boolean => {
    const permString = `${resource}:${action}` as Permission;
    return hasPermission(normalized, permString);
  };

  const canPermission = (permission: Permission): boolean => {
    return hasPermission(normalized, permission);
  };

  const hasRole = (minRole: RoleEnum): boolean => {
    return isRoleAtLeast(normalized, minRole);
  };

  return (
    <RBACContext.Provider
      value={{
        role: normalized,
        userRoleString: roleStr,
        isSuperAdmin,
        isManager,
        isStaff,
        can,
        canPermission,
        hasRole,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
}

/**
 * Hook to consume RBAC authorization state in any client component
 */
export function useRBAC() {
  return useContext(RBACContext);
}

export interface CanProps {
  action?: string;
  resource?: Resource;
  permission?: Permission;
  minRole?: RoleEnum;
  fallback?: React.ReactNode;
  disabledMode?: boolean;
  children: React.ReactNode;
}

/**
 * Declarative component that gates UI action elements (e.g. Delete, Export, Settings buttons)
 */
export function Can({
  action,
  resource,
  permission,
  minRole,
  fallback = null,
  disabledMode = false,
  children,
}: CanProps) {
  const { role, can, canPermission, hasRole } = useRBAC();

  let isAllowed = false;

  if (minRole) {
    isAllowed = hasRole(minRole);
  } else if (permission) {
    isAllowed = canPermission(permission);
  } else if (action && resource) {
    isAllowed = can(action, resource);
  } else {
    isAllowed = false;
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  // Disabled mode: Clones single React element child with disabled and lock attributes
  if (disabledMode && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      disabled: true,
      'aria-disabled': 'true',
      title: 'Restricted: Your role does not have permission to perform this action.',
      className: `${(children as any).props.className || ''} opacity-40 cursor-not-allowed pointer-events-none filter grayscale`,
    });
  }

  return <>{fallback}</>;
}

export default Can;
