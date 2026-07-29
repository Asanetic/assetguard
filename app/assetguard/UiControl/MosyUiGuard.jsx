"use client";

import AccessDenied from "./MosyAccessDenied";

export function MosyUIGuard({ moduleName, reason }) {
    return <AccessDenied moduleName={moduleName} reason={reason} />;
}