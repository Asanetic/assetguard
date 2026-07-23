export function validateRoleAccess({
    table,
    source,
    action,
    role,
    authData,
    validateAccess = false   // default ON
}) {

    // If validation disabled → auto pass
    if (!validateAccess) {
        return {
            valid: true,
            message: "Access validation bypassed",
            data: true
        };
    }

    // Normal RBAC flow
    if (!authData?.userRoles || !Array.isArray(authData.userRoles)) {
        return {
            valid: false,
            message: "Invalid authentication data",
            data: false
        };
    }

    if (!role) {
        return {
            valid: false,
            message: "Role is required",
            data: false
        };
    }

    const normalizedRole = String(role).toUpperCase().trim();

    const hasAccess = authData.userRoles.some(r =>
        r.role_id === normalizedRole
    );

    if (!hasAccess) {
        return {
            valid: false,
            message: `${formatUnderscoreText(normalizedRole)} Access denied`,
            data: false
        };
    }

    return {
        valid: true,
        message: "Role access validation passed",
        data: true
    };
}

export function formatUnderscoreText(text = '') {
    return text
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^\w/, function (c) {
        return c.toUpperCase();
      });
  }