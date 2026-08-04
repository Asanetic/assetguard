"use client";

import saAuthConfigs from './featureConfig/saAuthConfigs'; 

const sessionPrefix = saAuthConfigs.sessionPrefix;


export function mosyACTRLSaveSession(loginResponse) {

    const { accessToken, user } = loginResponse;

    const sessionData = {
        accessToken,
        user,
        roles: user?.userRoles?.map(r =>
            String(r.role_id).toUpperCase()
        ) || []
    };

    localStorage.setItem(
        `${sessionPrefix}_mosyactrl_session`,
        JSON.stringify(sessionData)
    );

    return true;
}


export function mosyACTRLGetSession() {

    if (typeof window === "undefined") {
        return null; // Prevent SSR crash
    }

    const raw = localStorage.getItem(
        `${sessionPrefix}_mosyactrl_session`
    );

    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function mosyACTRLHasRole(role, validateAccess = false) {

    // Global bypass
    if (!validateAccess) {
        return true;
    }

    const session = mosyACTRLGetSession();

    console.log("mosyACTRLHasRole session", session, role);
    if (!session?.roles) return false;

    const normalizedRole = String(role).toUpperCase().trim();

    return session.roles.includes(normalizedRole);
}


export function mosyACTRLValidate({
    role,
    validateAccess = true
}) {

    // If validation disabled → allow
    if (!validateAccess) {
        return true;
    }

    if (!role) {
        return false;
    }

    return mosyACTRLHasRole(role);
}
export function userHasBundle(bundleId) {

    try {

        const storedBundleId = localStorage.getItem(
            `${sessionPrefix}_sa_authsess_user_role_val`
        );

        console.log(
            "Bundle Compare:",
            `[${storedBundleId}]`,
            `[${bundleId}]`
        );

        if (!storedBundleId) {
            return false;
        }

        return JSON.parse(storedBundleId) === bundleId;
    } catch (error) {

        console.error("Bundle check failed:", error);
        return false;

    }

}