import { connectDB, activeDB } from "../../apiUtils/dataControl/conn";
import { processAuthToken } from "../../auth/authManager";
import { validateRoleAccess } from "../validateRoleAccess";


/*
|--------------------------------------------------------------------------
| Permission columns
|--------------------------------------------------------------------------
|
| Keeping these here gives us one definition for:
|
| - SQL normalization
| - permission totals
| - response generation
|
*/

const PERMISSION_COLUMNS = [
  "can_view",
  "can_add",
  "can_edit",
  "can_delete",
  "can_approve",
  "can_export",
  "can_reports",
  "can_dashboard",
];


/*
|--------------------------------------------------------------------------
| Convert DB permission row into frontend permissions
|--------------------------------------------------------------------------
*/

function buildPermissions(row = {}) {
  return {
    view: Number(row.can_view || 0) === 1,
    add: Number(row.can_add || 0) === 1,
    edit: Number(row.can_edit || 0) === 1,
    delete: Number(row.can_delete || 0) === 1,
    approve: Number(row.can_approve || 0) === 1,
    export: Number(row.can_export || 0) === 1,
    reports: Number(row.can_reports || 0) === 1,
    dashboard: Number(row.can_dashboard || 0) === 1,
  };
}


/*
|--------------------------------------------------------------------------
| Count granted permissions
|--------------------------------------------------------------------------
*/

function countGrantedPermissions(rows = []) {
  let granted = 0;

  for (const row of rows) {
    for (const permission of PERMISSION_COLUMNS) {
      if (Number(row[permission] || 0) === 1) {
        granted++;
      }
    }
  }

  return granted;
}


/*
|--------------------------------------------------------------------------
| Group modules for UI
|--------------------------------------------------------------------------
|
| Converts:
|
| [
|   { module_group: "SITES", ... },
|   { module_group: "SITES", ... },
|   { module_group: "DEVICES", ... }
| ]
|
| Into:
|
| [
|   {
|       group: "SITES",
|       modules: [...]
|   },
|   {
|       group: "DEVICES",
|       modules: [...]
|   }
| ]
|
*/

function groupModules(rows = []) {
  const groups = {};

  for (const row of rows) {
    const groupName = row.module_group || "OTHER";

    if (!groups[groupName]) {
      groups[groupName] = {
        group: groupName,
        modules: [],
      };
    }

    groups[groupName].modules.push({
      record_id: row.module_id,

      module_name: row.module_name,
      module_key: row.module_key,
      module_group: row.module_group,
      module_type: row.module_type,
      module_status: row.module_status,

      permission_record_id: row.permission_record_id || null,

      permissions: buildPermissions(row),
    });
  }

  return Object.values(groups);
}


/*
|--------------------------------------------------------------------------
| GET PERMISSION MATRIX
|--------------------------------------------------------------------------
|
| Example:
|
| /api/system/permission-matrix?roleId=ABC123
|
*/

export async function GET(request) {
  let conn;

  try {
    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    const {
      valid,
      reason,
      data: authData,
    } = processAuthToken(request);

    if (!valid) {
      return Response.json(
        {
          status: "unauthorized",
          message: reason,
          data: null,
        },
        {
          status: 403,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Permission check
    |--------------------------------------------------------------------------
    */

    const canSelect = validateRoleAccess({
      table: "system_role_permissions",
      source: "system_role_permissions",
      action: "select",
      role: "view_system_role_permissions",
      authData,
    });

    if (!canSelect.valid) {
      return Response.json(
        {
          status: "error",
          message: canSelect.message,
          data: null,
        },
        {
          status: 403,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Read parameters
    |--------------------------------------------------------------------------
    */

    const { searchParams } = new URL(request.url);

    const roleId = searchParams.get("roleId");

    if (!roleId) {
      return Response.json(
        {
          status: "error",
          message: "roleId is required",
          data: null,
        },
        {
          status: 400,
        }
      );
    }


    /*
    |--------------------------------------------------------------------------
    | Tenant
    |--------------------------------------------------------------------------
    */

    const hiveSiteId = authData?.hive_site_id || null;


    /*
    |--------------------------------------------------------------------------
    | Connect
    |--------------------------------------------------------------------------
    */

    conn = await connectDB();


    /*
    |--------------------------------------------------------------------------
    | Fetch role
    |--------------------------------------------------------------------------
    */

    let roleSql = `
      SELECT
        primkey,
        record_id,
        role_name,
        role_description,
        hive_site_id,
        hive_site_name

      FROM \`${activeDB}\`.\`system_roles\`

      WHERE record_id = ?
    `;

    const roleValues = [roleId];


    /*
    |--------------------------------------------------------------------------
    | Tenant enforcement
    |--------------------------------------------------------------------------
    */

    if (hiveSiteId) {
      roleSql += ` AND hive_site_id = ?`;
      roleValues.push(hiveSiteId);
    }

    roleSql += ` LIMIT 1`;


    const [roleRows] = await conn.execute(
      roleSql,
      roleValues
    );


    /*
    |--------------------------------------------------------------------------
    | Role not found
    |--------------------------------------------------------------------------
    */

    if (!roleRows.length) {
      return Response.json(
        {
          status: "error",
          message: "Role not found",
          data: null,
        },
        {
          status: 404,
        }
      );
    }


    const role = roleRows[0];


    /*
    |--------------------------------------------------------------------------
    | Fetch modules + role permissions
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | system_modules is the LEFT side of the join.
    |
    | This means EVERY module comes back even if the role doesn't have
    | a permission record yet.
    |
    | New module:
    |
    | system_modules
    |       ↓
    | automatically appears
    |       ↓
    | permission values = 0
    |
    |--------------------------------------------------------------------------
    */

    let matrixSql = `

      SELECT

        m.primkey AS module_primkey,

        m.record_id AS module_id,

        m.module_name,
        m.module_key,
        m.module_group,
        m.module_type,
        m.module_status,

        rp.record_id AS permission_record_id,

        COALESCE(rp.can_view, 0) AS can_view,
        COALESCE(rp.can_add, 0) AS can_add,
        COALESCE(rp.can_edit, 0) AS can_edit,
        COALESCE(rp.can_delete, 0) AS can_delete,
        COALESCE(rp.can_approve, 0) AS can_approve,
        COALESCE(rp.can_export, 0) AS can_export,
        COALESCE(rp.can_reports, 0) AS can_reports,
        COALESCE(rp.can_dashboard, 0) AS can_dashboard

      FROM \`${activeDB}\`.\`system_modules\` m

      LEFT JOIN \`${activeDB}\`.\`system_role_permissions\` rp

        ON rp.module_id = m.record_id

        AND rp.role_id = ?

    `;


    const matrixValues = [
      roleId,
    ];


    /*
    |--------------------------------------------------------------------------
    | Tenant-safe permission join
    |--------------------------------------------------------------------------
    */

    if (hiveSiteId) {
      matrixSql += `
        AND rp.hive_site_id = ?
      `;

      matrixValues.push(hiveSiteId);
    }


    /*
    |--------------------------------------------------------------------------
    | Module filtering
    |--------------------------------------------------------------------------
    */

    matrixSql += `
      WHERE 1 = 1
    `;


    /*
    |--------------------------------------------------------------------------
    | Tenant module filtering
    |--------------------------------------------------------------------------
    */

    if (hiveSiteId) {
      matrixSql += `
        AND m.hive_site_id = ?
      `;

      matrixValues.push(hiveSiteId);
    }


    /*
    |--------------------------------------------------------------------------
    | Only active modules
    |--------------------------------------------------------------------------
    |
    | Adjust these values if your module_status uses something different.
    |
    */

    matrixSql += `

      AND (
        m.module_status IS NULL
        OR m.module_status = ''
        OR LOWER(m.module_status) IN (
          'active',
          'enabled',
          '1'
        )
      )

      ORDER BY

        m.module_group ASC,

        m.primkey ASC

    `;


    /*
    |--------------------------------------------------------------------------
    | Execute matrix query
    |--------------------------------------------------------------------------
    */

    const [matrixRows] = await conn.execute(
      matrixSql,
      matrixValues
    );


    /*
    |--------------------------------------------------------------------------
    | Statistics
    |--------------------------------------------------------------------------
    */

    const moduleCount = matrixRows.length;

    const permissionsPerModule =
      PERMISSION_COLUMNS.length;

    const totalPermissions =
      moduleCount * permissionsPerModule;

    const grantedPermissions =
      countGrantedPermissions(matrixRows);

    const revokedPermissions =
      totalPermissions - grantedPermissions;


    /*
    |--------------------------------------------------------------------------
    | Group for frontend
    |--------------------------------------------------------------------------
    */

    const groups = groupModules(matrixRows);


    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return Response.json({
      status: "success",

      message: "Permission matrix retrieved successfully",

      data: {
        role: {
          record_id: role.record_id,
          role_name: role.role_name,
          role_description: role.role_description,
        },

        stats: {
          modules: moduleCount,

          permissions_per_module:
            permissionsPerModule,

          total_permissions:
            totalPermissions,

          granted_permissions:
            grantedPermissions,

          revoked_permissions:
            revokedPermissions,
        },

        groups,
      },
    });

  } catch (err) {
    console.error(
      "GET permission matrix failed:",
      err
    );

    return Response.json(
      {
        status: "error",
        message: err.message,
        data: null,
      },
      {
        status: 500,
      }
    );

  } finally {
    if (conn) {
      await conn.end();
    }
  }
}