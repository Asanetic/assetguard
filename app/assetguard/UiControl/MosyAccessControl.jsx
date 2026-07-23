"use client";

import AccessDenied from "./MosyAccessDenied";
import { mosyACTRLHasRole } from "../../auth/authAccesControl";


export function MosyAccessControl(role) {
    if (typeof window === "undefined") {
        return null;
    }

    const allowed = mosyACTRLHasRole(role, false);

    console.info("Access request for:", role , allowed);

    if (!allowed) {
        console.warn("Access denied for:", role);
        return false;//<AccessDenied />;
    }

    return true;
} 