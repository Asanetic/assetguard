// app/api/mainapp/permissions/mine/route.js
// GET -> the SIGNED-IN user's page access: { all, pages:[module_key], role }
//   all:true      => admin, opens everything (no page list needed)
//   pages:[...]   => the page module_keys this user's role may open
// Drives nav visibility (AppShell) and the client route guard. Unlike the
// admin-only /api/mainapp/permissions (which edits a role's matrix), this is
// readable by any signed-in user and only ever reports THEIR own access.
import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { getRolePermissions } from "../../../apiUtils/dataControl/permissions.js";

const ADMIN = new Set(["superadmin", "admin"]);

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ all: false, pages: [], role: null }, { status: 401 });
  const role = String(me.role || "").toLowerCase();
  if (ADMIN.has(role)) return NextResponse.json({ all: true, pages: [], role });
  try {
    const grants = await getRolePermissions(me.role);
    // Page access is a single "view" grant per page module. (The old add/edit/…
    // and button/data-point grants are no longer part of this model.)
    const pages = [...new Set(
      (grants || []).filter((g) => g.perm_key === "view").map((g) => g.module_key)
    )];
    return NextResponse.json({ all: false, pages, role });
  } catch (e) {
    // Fail OPEN, matching regionScope: a lookup error must not lock the whole UI
    // away. Sensitive actions stay protected by the APIs' own hard-coded gates.
    console.error("[permissions/mine]", e?.message || e);
    return NextResponse.json({ all: true, pages: [], role });
  }
}
