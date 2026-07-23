import AccessDenied from "./MosyAccessDenied";

export function MosyAccessControl(dataControlNode="") {
    const allowed = true // Replace with your access control logic
    
    if (!allowed) {
        console.warn("Access denied for:", dataControlNode);
        return <AccessDenied />;
    }
}