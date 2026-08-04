import { connectDB, activeDB } from "../../../apiUtils/dataControl/conn";
import { processAuthToken } from "../../../auth/authManager";
import { validateRoleAccess } from "../../validateRoleAccess";


const ALLOWED_PERMISSIONS = [
  "can_view",
  "can_add",
  "can_edit",
  "can_delete",
  "can_approve",
  "can_export",
  "can_reports",
  "can_dashboard",
];


function generateRecordId() {
  return (
    "PERM_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase()
  );
}


/*
|--------------------------------------------------------------------------
| POST PERMISSION CHANGES
|--------------------------------------------------------------------------
|
| Supports:
|
| 1. Single permission
| 2. Entire module row
| 3. Multiple modules
| 4. Grant all
| 5. Revoke all
|
| Payload:
|
| {
|   role_id: "...",
|   changes: [
|     {
|       module_id: "...",
|       permissions: {
|         can_view: 1,
|         can_edit: 0
|       }
|     }
|   ]
| }
|
*/

export async function POST(request) {

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
    | Access validation
    |--------------------------------------------------------------------------
    */

    const canUpdate = validateRoleAccess({
      table: "system_role_permissions",
      source: "system_role_permissions",
      action: "update",
      role: "update_system_role_permissions",
      authData,
    });


    if (!canUpdate.valid) {

      return Response.json(
        {
          status: "error",
          message: canUpdate.message,
          data: null,
        },
        {
          status: 403,
        }
      );

    }


    /*
    |--------------------------------------------------------------------------
    | Payload
    |--------------------------------------------------------------------------
    */

    const body = await request.json();

    const roleId = body?.role_id;

    const changes = body?.changes;


    /*
    |--------------------------------------------------------------------------
    | Validate role
    |--------------------------------------------------------------------------
    */

    if (!roleId) {

      return Response.json(
        {
          status: "error",
          message: "role_id is required",
          data: null,
        },
        {
          status: 400,
        }
      );

    }


    /*
    |--------------------------------------------------------------------------
    | Validate changes
    |--------------------------------------------------------------------------
    */

    if (
      !Array.isArray(changes) ||
      changes.length === 0
    ) {

      return Response.json(
        {
          status: "error",
          message: "changes must be a non-empty array",
          data: null,
        },
        {
          status: 400,
        }
      );

    }


    /*
    |--------------------------------------------------------------------------
    | Validate every change before touching DB
    |--------------------------------------------------------------------------
    */

    for (const change of changes) {

      if (!change?.module_id) {

        return Response.json(
          {
            status: "error",
            message: "Every change requires module_id",
            data: null,
          },
          {
            status: 400,
          }
        );

      }


      if (
        !change.permissions ||
        typeof change.permissions !== "object"
      ) {

        return Response.json(
          {
            status: "error",
            message:
              `permissions are required for module ${change.module_id}`,
            data: null,
          },
          {
            status: 400,
          }
        );

      }


      const permissionNames =
        Object.keys(change.permissions);


      if (permissionNames.length === 0) {

        return Response.json(
          {
            status: "error",
            message:
              `No permissions supplied for module ${change.module_id}`,
            data: null,
          },
          {
            status: 400,
          }
        );

      }


      /*
      |--------------------------------------------------------------------------
      | Permission whitelist
      |--------------------------------------------------------------------------
      */

      for (const permission of permissionNames) {

        if (
          !ALLOWED_PERMISSIONS.includes(
            permission
          )
        ) {

          return Response.json(
            {
              status: "error",
              message:
                `Invalid permission: ${permission}`,
              data: null,
            },
            {
              status: 400,
            }
          );

        }


        /*
        |--------------------------------------------------------------------------
        | Only allow 0 / 1 / true / false
        |--------------------------------------------------------------------------
        */

        const value =
          change.permissions[permission];


        if (
          value !== 0 &&
          value !== 1 &&
          value !== true &&
          value !== false
        ) {

          return Response.json(
            {
              status: "error",
              message:
                `Invalid value for ${permission}. Use 0 or 1.`,
              data: null,
            },
            {
              status: 400,
            }
          );

        }

      }

    }


    /*
    |--------------------------------------------------------------------------
    | Connect
    |--------------------------------------------------------------------------
    */

    conn = await connectDB();


    const hiveSiteId =
      authData?.hive_site_id || null;


    const hiveSiteName =
      authData?.hive_site_name || null;


    /*
    |--------------------------------------------------------------------------
    | Transaction
    |--------------------------------------------------------------------------
    |
    | Very important for Grant All / Revoke All.
    |
    | Either ALL requested modules update successfully or NONE do.
    |
    */

    await conn.beginTransaction();


    /*
    |--------------------------------------------------------------------------
    | Validate role exists
    |--------------------------------------------------------------------------
    */

    let roleSql = `

      SELECT
        record_id,
        role_name

      FROM
        \`${activeDB}\`.\`system_roles\`

      WHERE
        record_id = ?

    `;


    const roleValues = [
      roleId,
    ];


    if (hiveSiteId) {

      roleSql += `
        AND hive_site_id = ?
      `;

      roleValues.push(
        hiveSiteId
      );

    }


    roleSql += `
      LIMIT 1
    `;


    const [roleRows] =
      await conn.execute(
        roleSql,
        roleValues
      );


    if (!roleRows.length) {

      await conn.rollback();


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


    /*
    |--------------------------------------------------------------------------
    | Results
    |--------------------------------------------------------------------------
    */

    const results = [];


    /*
    |--------------------------------------------------------------------------
    | Process modules
    |--------------------------------------------------------------------------
    */

    for (const change of changes) {

      const moduleId =
        change.module_id;


      const requestedPermissions =
        change.permissions;


      /*
      |--------------------------------------------------------------------------
      | Validate module
      |--------------------------------------------------------------------------
      */

      let moduleSql = `

        SELECT
          record_id,
          module_name,
          module_key

        FROM
          \`${activeDB}\`.\`system_modules\`

        WHERE
          record_id = ?

      `;


      const moduleValues = [
        moduleId,
      ];


      if (hiveSiteId) {

        moduleSql += `
          AND hive_site_id = ?
        `;

        moduleValues.push(
          hiveSiteId
        );

      }


      moduleSql += `
        LIMIT 1
      `;


      const [moduleRows] =
        await conn.execute(
          moduleSql,
          moduleValues
        );


      if (!moduleRows.length) {

        throw new Error(
          `Module not found: ${moduleId}`
        );

      }


      const moduleData =
        moduleRows[0];


      /*
      |--------------------------------------------------------------------------
      | Find permission record
      |--------------------------------------------------------------------------
      */

      let existingSql = `

        SELECT
          primkey,
          record_id

        FROM
          \`${activeDB}\`.\`system_role_permissions\`

        WHERE
          role_id = ?

        AND
          module_id = ?

      `;


      const existingValues = [
        roleId,
        moduleId,
      ];


      if (hiveSiteId) {

        existingSql += `
          AND hive_site_id = ?
        `;

        existingValues.push(
          hiveSiteId
        );

      } else {

        existingSql += `
          AND hive_site_id IS NULL
        `;

      }


      existingSql += `
        LIMIT 1
      `;


      const [existingRows] =
        await conn.execute(
          existingSql,
          existingValues
        );


      let permissionRecordId;


      /*
      |--------------------------------------------------------------------------
      | Existing row
      |--------------------------------------------------------------------------
      */

      if (existingRows.length) {

        const existing =
          existingRows[0];


        permissionRecordId =
          existing.record_id;


        /*
        |--------------------------------------------------------------------------
        | Dynamic SET
        |--------------------------------------------------------------------------
        |
        | Safe because every key was checked against ALLOWED_PERMISSIONS.
        |
        */

        const setParts = [];

        const updateValues = [];


        for (
          const [permission, rawValue]
          of Object.entries(
            requestedPermissions
          )
        ) {

          setParts.push(
            `\`${permission}\` = ?`
          );


          updateValues.push(
            rawValue === true ||
            Number(rawValue) === 1
              ? 1
              : 0
          );

        }


        setParts.push(
          `date_updated = CURRENT_TIMESTAMP`
        );


        updateValues.push(
          existing.primkey
        );


        const updateSql = `

          UPDATE
            \`${activeDB}\`.\`system_role_permissions\`

          SET
            ${setParts.join(", ")}

          WHERE
            primkey = ?

        `;


        await conn.execute(
          updateSql,
          updateValues
        );

      }


      /*
      |--------------------------------------------------------------------------
      | New row
      |--------------------------------------------------------------------------
      */

      else {

        permissionRecordId =
          generateRecordId();


        /*
        |--------------------------------------------------------------------------
        | Defaults
        |--------------------------------------------------------------------------
        */

        const permissions = {

          can_view: 0,
          can_add: 0,
          can_edit: 0,
          can_delete: 0,
          can_approve: 0,
          can_export: 0,
          can_reports: 0,
          can_dashboard: 0,

        };


        /*
        |--------------------------------------------------------------------------
        | Apply requested changes
        |--------------------------------------------------------------------------
        */

        for (
          const [permission, rawValue]
          of Object.entries(
            requestedPermissions
          )
        ) {

          permissions[permission] =
            rawValue === true ||
            Number(rawValue) === 1
              ? 1
              : 0;

        }


        /*
        |--------------------------------------------------------------------------
        | Insert
        |--------------------------------------------------------------------------
        */

        const insertSql = `

          INSERT INTO
            \`${activeDB}\`.\`system_role_permissions\`

          (

            record_id,

            role_id,

            module_id,

            can_view,

            can_add,

            can_edit,

            can_delete,

            can_approve,

            can_export,

            can_reports,

            can_dashboard,

            hive_site_id,

            hive_site_name,

            date_created,

            date_updated

          )

          VALUES

          (
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )

        `;


        await conn.execute(
          insertSql,
          [

            permissionRecordId,

            roleId,

            moduleId,

            permissions.can_view,

            permissions.can_add,

            permissions.can_edit,

            permissions.can_delete,

            permissions.can_approve,

            permissions.can_export,

            permissions.can_reports,

            permissions.can_dashboard,

            hiveSiteId,

            hiveSiteName,

          ]
        );

      }


      /*
      |--------------------------------------------------------------------------
      | Result
      |--------------------------------------------------------------------------
      */

      results.push({

        permission_record_id:
          permissionRecordId,

        module_id:
          moduleId,

        module_name:
          moduleData.module_name,

        module_key:
          moduleData.module_key,

        permissions:
          requestedPermissions,

      });

    }


    /*
    |--------------------------------------------------------------------------
    | Commit everything
    |--------------------------------------------------------------------------
    */

    await conn.commit();


    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return Response.json({

      status: "success",

      message:
        "Permissions updated successfully",

      data: {

        role_id:
          roleId,

        role_name:
          roleRows[0].role_name,

        modules_updated:
          results.length,

        changes:
          results,

      },

    });


  } catch (err) {

    /*
    |--------------------------------------------------------------------------
    | Rollback
    |--------------------------------------------------------------------------
    */

    if (conn) {

      try {

        await conn.rollback();

      } catch (rollbackError) {

        console.error(
          "Permission rollback failed:",
          rollbackError
        );

      }

    }


    console.error(
      "Permission update failed:",
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