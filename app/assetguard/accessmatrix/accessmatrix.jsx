"use client";

import React, { useEffect, useMemo, useState } from "react";

import {
  Grid3X3,
  BriefcaseBusiness,
  Map,
  MonitorSmartphone,
} from "lucide-react";

 import {
    mosyGetData,
    mosyPostData,
  } from "../../MosyUtils/hiveUtils";
import { MosyNotify, MosySnackWidget } from "../../MosyUtils/ActionModals";
import { useRouter } from "next/navigation";
import { mosySnack } from "../../MosyUtils/MosySnackWidget";
import { closeMosyCard } from "../../components/MosyCard";


  export default function RolePermissionMatrix({
    roleId = "",
  }) {
  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */
  let relativepath ="./"
  if(roleId!==""){
    relativepath = `../`
  }

  const [activeTab, setActiveTab] = useState("permissions");

  const [roles, setRoles] = useState([]);

  const [selectedRole, setSelectedRole] = useState(
    roleId || ""
  );

  const [groups, setGroups] = useState([]);

  const [loadingRoles, setLoadingRoles] = useState(false);

  const [loadingMatrix, setLoadingMatrix] = useState(false);

  const [loadError, setLoadError] = useState("");

  const router = useRouter();

  /*
  |--------------------------------------------------------------------------
  | Regions
  |--------------------------------------------------------------------------
  */

  const [regions, setRegions] = useState([
    { id: "all", name: "All regions", active: true },
    { id: "nairobi", name: "Nairobi", active: true },
    { id: "central", name: "Central", active: true },
    { id: "coast", name: "Coast", active: true },
    { id: "rift", name: "Rift Valley", active: true },
    { id: "western", name: "Western", active: true },
    { id: "eastern", name: "Eastern", active: true },
    { id: "nyanza", name: "Nyanza", active: true },
    { id: "north-eastern", name: "North Eastern", active: true },
  ]);


  /*
  |--------------------------------------------------------------------------
  | Permission columns
  |--------------------------------------------------------------------------
  */

  const permissionColumns = [
    { key: "view", label: "View" },
    { key: "add", label: "Add" },
    { key: "edit", label: "Edit" },
    { key: "delete", label: "Delete" },
    { key: "approve", label: "Approve" },
    { key: "export", label: "Export" },
    { key: "reports", label: "Reports" },
    { key: "dashboard", label: "Dashboard" },
  ];


  /*
  |--------------------------------------------------------------------------
  | Load roles
  |--------------------------------------------------------------------------
  |
  | GET:
  |
  | /api/assetguard/systemroles?pageNo=1&pageSize=20
  |
  */

  const loadRoles = async () => {

    try {

      setLoadingRoles(true);
      setLoadError("");


      const response = await mosyGetData({
        endpoint: "/api/assetguard/systemroles",

        params: {
          pageNo: 1,
          pageSize: 20,
        },
      });


      console.log(
        "System roles response:",
        response
      );


      if (response?.status !== "success") {

        setRoles([]);

        setLoadError(
          response?.message ||
          "Unable to load system roles."
        );

        return;
      }


      const roleData = Array.isArray(response?.data)
        ? response.data
        : [];


      setRoles(roleData);


      /*
      |--------------------------------------------------------------------------
      | Select first role automatically
      |--------------------------------------------------------------------------
      |
      | This triggers the matrix useEffect below.
      |
      */

        /*
        |--------------------------------------------------------------------------
        | Determine initial role
        |--------------------------------------------------------------------------
        |
        | Priority:
        |
        | 1. roleId passed to component
        | 2. Existing selectedRole
        | 3. First role returned by API
        |
        */

        if (roleData.length > 0) {

            /*
            |--------------------------------------------------------------------------
            | Component was called with roleId
            |--------------------------------------------------------------------------
            */
        
            if (roleId) {
        
            const roleExists = roleData.some(
                (role) =>
                role.record_id === roleId
            );
        
        
            if (roleExists) {
        
                setSelectedRole(roleId);
        
            } else {
        
                console.warn(
                `Role ${roleId} was not found in loaded roles`
                );
        
        
                /*
                |--------------------------------------------------------------------------
                | Fallback to first role
                |--------------------------------------------------------------------------
                */
        
                setSelectedRole(
                roleData[0].record_id
                );
        
            }
        
            }
        
            /*
            |--------------------------------------------------------------------------
            | No roleId supplied
            |--------------------------------------------------------------------------
            */
        
            else if (!selectedRole) {
        
            setSelectedRole(
                roleData[0].record_id
            );
        
            }
        
        }


    } catch (error) {

      console.error(
        "Failed loading roles:",
        error
      );


      setRoles([]);


      setLoadError(
        error?.message ||
        "Unable to load system roles."
      );

    } finally {

      setLoadingRoles(false);

    }

  };


  /*
  |--------------------------------------------------------------------------
  | Load permission matrix
  |--------------------------------------------------------------------------
  */

  const loadPermissionMatrix = async (
    roleId
  ) => {

    if (!roleId) {
      setGroups([]);
      return;
    }


    try {

      setLoadingMatrix(true);

      setLoadError("");


      const response = await mosyGetData({

        endpoint:
          "/api/assetguard/accessmatrix",

        params: {
          roleId,
        },

      });


      console.log(
        "Permission matrix response:",
        response
      );


      if (response?.status !== "success") {

        setGroups([]);

        setLoadError(
          response?.message ||
          "Unable to load permission matrix."
        );

        return;
      }


      const matrixData =
        response?.data || {};


      const apiGroups =
        Array.isArray(matrixData?.groups)
          ? matrixData.groups
          : [];


      /*
      |--------------------------------------------------------------------------
      | Map API structure to UI structure
      |--------------------------------------------------------------------------
      */

      const formattedGroups =
        apiGroups.map(
          (group, groupIndex) => {

            const groupName =
              group.group ||
              group.name ||
              `GROUP ${groupIndex + 1}`;


            return {

              id: groupName
                .toLowerCase()
                .replace(/\s+/g, "-"),

              name: groupName,

              icon:
                groupName
                  .toLowerCase()
                  .includes("device")
                  ? "device"
                  : "map",


              modules:
                Array.isArray(
                  group.modules
                )
                  ? group.modules.map(
                      (
                        module,
                        moduleIndex
                      ) => ({

                        id:
                          module.record_id ||
                          module.module_id ||
                          `${groupIndex}-${moduleIndex}`,

                        record_id:
                          module.record_id ||
                          module.module_id ||
                          "",

                        permission_record_id:
                          module.permission_record_id ||
                          null,

                        name:
                          module.module_name ||
                          "Unnamed Module",

                        key:
                          module.module_key ||
                          "",

                        type:
                          module.module_type ||
                          "Page",

                        status:
                          module.module_status ||
                          "",

                        permissions: {

                          view:
                            Boolean(
                              module
                                .permissions
                                ?.view
                            ),

                          add:
                            Boolean(
                              module
                                .permissions
                                ?.add
                            ),

                          edit:
                            Boolean(
                              module
                                .permissions
                                ?.edit
                            ),

                          delete:
                            Boolean(
                              module
                                .permissions
                                ?.delete
                            ),

                          approve:
                            Boolean(
                              module
                                .permissions
                                ?.approve
                            ),

                          export:
                            Boolean(
                              module
                                .permissions
                                ?.export
                            ),

                          reports:
                            Boolean(
                              module
                                .permissions
                                ?.reports
                            ),

                          dashboard:
                            Boolean(
                              module
                                .permissions
                                ?.dashboard
                            ),

                        },

                      })
                    )
                  : [],

            };

          }
        );


      setGroups(
        formattedGroups
      );

    } catch (error) {

      console.error(
        "Failed loading permission matrix:",
        error
      );


      setGroups([]);


      setLoadError(
        error?.message ||
        "Unable to load permission matrix."
      );

    } finally {

      setLoadingMatrix(false);

    }

  };


  /*
  |--------------------------------------------------------------------------
  | Initial load
  |--------------------------------------------------------------------------
  |
  | Load roles only once.
  |
  */

  useEffect(() => {

    loadRoles();

  }, []);


  /*
  |--------------------------------------------------------------------------
  | Role changed
  |--------------------------------------------------------------------------
  |
  | Every time the dropdown changes:
  |
  | selectedRole
  |      ↓
  | accessmatrix?roleId=XXXX
  |
  */

  useEffect(() => {

    if (!selectedRole) {
      return;
    }


    loadPermissionMatrix(
      selectedRole
    );

  }, [selectedRole]);


  /*
|--------------------------------------------------------------------------
| Sync external roleId
|--------------------------------------------------------------------------
|
| Allows parent components to change the active role after mount.
|
*/

useEffect(() => {

    if (!roleId) {
      return;
    }
  
  
    if (roleId === selectedRole) {
      return;
    }
  
  
    setSelectedRole(roleId);
  
  }, [roleId]);

  /*
  |--------------------------------------------------------------------------
  | Current role object
  |--------------------------------------------------------------------------
  */

  const selectedRoleData =
    useMemo(() => {

      return roles.find(
        (role) =>
          role.record_id ===
          selectedRole
      ) || null;

    }, [
      roles,
      selectedRole,
    ]);


  /*
  |--------------------------------------------------------------------------
  | Permission stats
  |--------------------------------------------------------------------------
  */

  const permissionStats =
    useMemo(() => {

      let total = 0;

      let granted = 0;


      groups.forEach(
        (group) => {

          group.modules.forEach(
            (module) => {

              permissionColumns.forEach(
                (column) => {

                  total++;


                  if (
                    module.permissions[
                      column.key
                    ]
                  ) {
                    granted++;
                  }

                }
              );

            }
          );

        }
      );


      return {
        granted,
        total,
      };

    }, [groups]);


  /*
  |--------------------------------------------------------------------------
  | Local permission toggle
  |--------------------------------------------------------------------------
  |
  | API update comes later.
  |
  */
/*
|--------------------------------------------------------------------------
| Send permission updates to backend
|--------------------------------------------------------------------------
*/

const savePermissionChanges = async (changes) => {

    if (!selectedRole) {
      console.warn("No role selected");
      return {
        status: "error",
        message: "No role selected",
      };
    }
  
    if (!Array.isArray(changes) || changes.length === 0) {
      return {
        status: "error",
        message: "No permission changes supplied",
      };
    }
  
  
    MosyNotify({
      message: "Saving permission changes...",
      icon: "spinner",
      addTimer: false,
    });

    const response = await mosyPostData({
  
      url: "/api/assetguard/accessmatrix/update",
  
      data: {
        role_id: selectedRole,
        changes,
      },
  
    });

    closeMosyCard()

    // MosyNotify({
    //     message: response.message,
    //     icon: response.status === "success" ? "check-circle" : "times-circle",
    //     iconColor: response.status === "success" ? "text-success" : "text-danger",
    //     addTimer: true,
    // })
  
    mosySnack({
        content: response.message,
        duration: 4000
      })

    console.log(
      "Permission update response:",
      response
    );
  
  
    return response;
  };


 /*
|--------------------------------------------------------------------------
| Toggle ONE permission
|--------------------------------------------------------------------------
*/

const togglePermission = async (
    groupId,
    moduleId,
    permission
  ) => {
  
    /*
    |--------------------------------------------------------------------------
    | Find current module
    |--------------------------------------------------------------------------
    */
  
    const group = groups.find(
      (item) => item.id === groupId
    );
  
  
    const module = group?.modules.find(
      (item) => item.id === moduleId
    );
  
  
    if (!module) {
      return;
    }
  
  
    /*
    |--------------------------------------------------------------------------
    | Calculate new value
    |--------------------------------------------------------------------------
    */
  
    const newValue =
      !module.permissions[permission];
  
  
    /*
    |--------------------------------------------------------------------------
    | Optimistic UI update
    |--------------------------------------------------------------------------
    */
  
    setGroups((currentGroups) =>
  
      currentGroups.map((group) => {
  
        if (group.id !== groupId) {
          return group;
        }
  
  
        return {
  
          ...group,
  
          modules: group.modules.map(
            (module) => {
  
              if (module.id !== moduleId) {
                return module;
              }
  
  
              return {
  
                ...module,
  
                permissions: {
  
                  ...module.permissions,
  
                  [permission]:
                    newValue,
  
                },
  
              };
  
            }
          ),
  
        };
  
      })
  
    );
  
  
    /*
    |--------------------------------------------------------------------------
    | Save
    |--------------------------------------------------------------------------
    |
    | Frontend:
    |
    | edit
    |
    | Backend:
    |
    | can_edit
    |
    */
  
    const response =
      await savePermissionChanges([
        {
          module_id:
            module.record_id || module.id,
  
          permissions: {
            [`can_${permission}`]:
              newValue ? 1 : 0,
          },
        },
      ]);
  
  
    /*
    |--------------------------------------------------------------------------
    | Roll back UI if API failed
    |--------------------------------------------------------------------------
    */
  
    if (response?.status !== "success") {
  
      setGroups((currentGroups) =>
  
        currentGroups.map((group) => {
  
          if (group.id !== groupId) {
            return group;
          }
  
  
          return {
  
            ...group,
  
            modules: group.modules.map(
              (module) => {
  
                if (module.id !== moduleId) {
                  return module;
                }
  
  
                return {
  
                  ...module,
  
                  permissions: {
  
                    ...module.permissions,
  
                    [permission]:
                      !newValue,
  
                  },
  
                };
  
              }
            ),
  
          };
  
        })
  
      );
  
  
      console.error(
        response?.message ||
        "Permission update failed"
      );
  
    }
  
  };


  /*
  |--------------------------------------------------------------------------
  | Toggle all permissions for one module
  |--------------------------------------------------------------------------
  */
/*
|--------------------------------------------------------------------------
| Toggle entire module row
|--------------------------------------------------------------------------
*/

const toggleModule = async (
    groupId,
    moduleId
  ) => {
  
    const group = groups.find(
      (item) => item.id === groupId
    );
  
  
    const module = group?.modules.find(
      (item) => item.id === moduleId
    );
  
  
    if (!module) {
      return;
    }
  
  
    /*
    |--------------------------------------------------------------------------
    | If ANY permission is OFF -> turn everything ON
    |
    | Otherwise -> turn everything OFF
    |--------------------------------------------------------------------------
    */
  
    const shouldEnable =
      permissionColumns.some(
        (column) =>
          !module.permissions[column.key]
      );
  
  
    /*
    |--------------------------------------------------------------------------
    | Build frontend permissions
    |--------------------------------------------------------------------------
    */
  
    const newPermissions = {};
  
  
    permissionColumns.forEach(
      (column) => {
  
        newPermissions[column.key] =
          shouldEnable;
  
      }
    );
  
  
    /*
    |--------------------------------------------------------------------------
    | Optimistic UI
    |--------------------------------------------------------------------------
    */
  
    setGroups((currentGroups) =>
  
      currentGroups.map((group) => {
  
        if (group.id !== groupId) {
          return group;
        }
  
  
        return {
  
          ...group,
  
          modules: group.modules.map(
            (module) => {
  
              if (module.id !== moduleId) {
                return module;
              }
  
  
              return {
  
                ...module,
  
                permissions:
                  newPermissions,
  
              };
  
            }
          ),
  
        };
  
      })
  
    );
  
  
    /*
    |--------------------------------------------------------------------------
    | Convert to backend permission names
    |--------------------------------------------------------------------------
    */
  
    const backendPermissions = {};
  
  
    permissionColumns.forEach(
      (column) => {
  
        backendPermissions[
          `can_${column.key}`
        ] =
          shouldEnable ? 1 : 0;
  
      }
    );
  
  
    /*
    |--------------------------------------------------------------------------
    | Save entire row
    |--------------------------------------------------------------------------
    */
  
    const response =
      await savePermissionChanges([
        {
          module_id:
            module.record_id || module.id,
  
          permissions:
            backendPermissions,
        },
      ]);
  
  
    /*
    |--------------------------------------------------------------------------
    | Reload authoritative DB state if failed
    |--------------------------------------------------------------------------
    */
  
    if (response?.status !== "success") {
  
      console.error(
        response?.message ||
        "Unable to update module permissions"
      );
  
  
      await loadPermissionMatrix(
        selectedRole
      );
  
    }
  
  };


  /*
  |--------------------------------------------------------------------------
  | Grant / revoke group
  |--------------------------------------------------------------------------
  */

/*
|--------------------------------------------------------------------------
| Grant / Revoke entire group
|--------------------------------------------------------------------------
*/

const updateGroupPermissions = async (
    groupId,
    value
  ) => {
  
    const targetGroup =
      groups.find(
        (group) =>
          group.id === groupId
      );
  
  
    if (!targetGroup) {
      return;
    }
  
  
    /*
    |--------------------------------------------------------------------------
    | Build frontend permissions
    |--------------------------------------------------------------------------
    */
  
    const newPermissions = {};
  
  
    permissionColumns.forEach(
      (column) => {
  
        newPermissions[column.key] =
          value;
  
      }
    );
  
  
    /*
    |--------------------------------------------------------------------------
    | Optimistic UI
    |--------------------------------------------------------------------------
    */
  
    setGroups((currentGroups) =>
  
      currentGroups.map((group) => {
  
        if (group.id !== groupId) {
          return group;
        }
  
  
        return {
  
          ...group,
  
          modules: group.modules.map(
            (module) => ({
  
              ...module,
  
              permissions: {
                ...newPermissions,
              },
  
            })
          ),
  
        };
  
      })
  
    );
  
  
    /*
    |--------------------------------------------------------------------------
    | Build changes array
    |--------------------------------------------------------------------------
    */
  
    const changes =
      targetGroup.modules.map(
        (module) => {
  
          const backendPermissions = {};
  
  
          permissionColumns.forEach(
            (column) => {
  
              backendPermissions[
                `can_${column.key}`
              ] =
                value ? 1 : 0;
  
            }
          );
  
  
          return {
  
            module_id:
              module.record_id ||
              module.id,
  
            permissions:
              backendPermissions,
  
          };
  
        }
      );
  
  
    /*
    |--------------------------------------------------------------------------
    | ONE request for entire group
    |--------------------------------------------------------------------------
    */
  
    const response =
      await savePermissionChanges(
        changes
      );
  
  
    /*
    |--------------------------------------------------------------------------
    | Recover if failed
    |--------------------------------------------------------------------------
    */
  
    if (response?.status !== "success") {
  
      console.error(
        response?.message ||
        "Unable to update group permissions"
      );
  
  
      await loadPermissionMatrix(
        selectedRole
      );
  
    }
  
  };

  /*
  |--------------------------------------------------------------------------
  | Region toggle
  |--------------------------------------------------------------------------
  */

  const toggleRegion = (
    regionId
  ) => {

    if (regionId === "all") {

      const allActive =
        regions.every(
          (region) =>
            region.active
        );


      setRegions(
        (currentRegions) =>

          currentRegions.map(
            (region) => ({

              ...region,

              active:
                !allActive,

            })
          )
      );


      return;

    }


    setRegions(
      (currentRegions) => {

        const updated =
          currentRegions.map(
            (region) =>

              region.id ===
              regionId
                ? {
                    ...region,

                    active:
                      !region.active,
                  }
                : region
          );


        const normalRegions =
          updated.filter(
            (region) =>
              region.id !==
              "all"
          );


        const allEnabled =
          normalRegions.every(
            (region) =>
              region.active
          );


        return updated.map(
          (region) =>

            region.id ===
            "all"
              ? {
                  ...region,

                  active:
                    allEnabled,
                }
              : region
        );

      }
    );

  };


  /*
  |--------------------------------------------------------------------------
  | Module type class
  |--------------------------------------------------------------------------
  */

  const getTypeClass = (
    type
  ) => {

    switch (type) {

      case "Button":
        return "type-button";

      case "Data Point":
        return "type-data";

      default:
        return "type-page";

    }

  };


  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <>

      <div className="permission-page ">

        {/* TOP NAVIGATION */}

        <div className="permission-tabs text-left ">

                {/* PERMISSION MATRIX */}

                <button
                type="button"
                className="permission-tab active"
                >
                <Grid3X3 size={13} />

                Permission Matrix
                </button>


                {/* ROLES */}

                <button
                type="button"
                className="permission-tab"
                onClick={() =>{
                    closeMosyCard("modal2");
                    router.push(`${relativepath}/systemroles/list`)
                }
                }
                >
                <BriefcaseBusiness size={13} />

                Roles
                </button>


                {/* MODULES */}

                <button
                type="button"
                className="permission-tab"
                onClick={() =>{
                    closeMosyCard("modal2");
                    router.push(`${relativepath}/systemmodules/list`)
                }}
                >
                <Grid3X3 size={13} />

                Modules
                </button>

                </div>

        {/* MAIN CARD */}

        <div className="permission-card  text-left ">

          <div className="permission-card-header">

            <div className="title-icon">

              <Grid3X3
                size={19}
              />

            </div>


            <div>

              <h1>
                Role Permission Matrix
              </h1>

              <p>
                Toggle each permission
                per module for the
                selected role.
              </p>

            </div>

          </div>


          {/* ROLE SELECT */}

          <div className="role-section">

            <label>
              Select Role
            </label>


            <div className="role-control-row">

              <select
                className="form-select role-select"
                value={selectedRole}
                disabled={loadingRoles}
                onChange={(e) =>
                  setSelectedRole(
                    e.target.value
                  )
                }
              >

                {loadingRoles && (

                  <option value="">
                    Loading roles...
                  </option>

                )}


                {!loadingRoles &&
                  roles.length ===
                    0 && (

                    <option value="">
                      No roles found
                    </option>

                  )}


                {!loadingRoles &&
                  roles.map(
                    (role) => (

                      <option
                        key={
                          role.record_id
                        }
                        value={
                          role.record_id
                        }
                      >

                        {role.role_name}

                      </option>

                    )
                  )}

              </select>


              <span className="permission-count">

                {
                  permissionStats.granted
                }

                {" of "}

                {
                  permissionStats.total
                }

                {" permissions granted"}

              </span>

            </div>


            {selectedRoleData
              ?.role_description && (

              <div className="small text-muted mt-1">

                {
                  selectedRoleData
                    .role_description
                }

              </div>

            )}

          </div>


          {/* REGION SCOPE */}

          <div className="region-panel d-none">

            <div className="region-heading">

              <Map size={14} />


              <div>

                <strong>
                  Region scope
                </strong>

                <p>
                  The regions these
                  permissions apply to
                  for this role.
                </p>

              </div>

            </div>


            <div className="region-list">

              {regions.map(
                (region) => (

                  <button
                    key={region.id}
                    type="button"
                    className={`region-pill ${
                      region.active
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      toggleRegion(
                        region.id
                      )
                    }
                  >

                    {region.name}

                  </button>

                )
              )}

            </div>

          </div>


          {/* ERROR */}

          {loadError && (

            <div
              className="alert alert-danger"
              role="alert"
            >

              {loadError}

            </div>

          )}


          {/* MATRIX LOADING */}

          {loadingMatrix && (

            <div className="p-4 text-center text-muted">

              Loading permissions...

            </div>

          )}


          {/* EMPTY MATRIX */}

          {!loadingMatrix &&
            !loadError &&
            selectedRole &&
            groups.length === 0 && (

              <div className="p-4 text-center text-muted">

                No permission modules
                found for this role.

              </div>

            )}


          {/* MATRIX */}

          {!loadingMatrix &&
            groups.length > 0 && (

              <div className="matrix-wrapper">

                <table className="permission-table">

                  <thead>

                    <tr>

                      <th className="module-column">
                        Module
                      </th>


                      {permissionColumns.map(
                        (column) => (

                          <th
                            key={
                              column.key
                            }
                          >

                            {
                              column.label
                            }

                          </th>

                        )
                      )}


                      <th>
                        All
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {groups.map(
                      (group) => (

                        <React.Fragment
                          key={
                            group.id
                          }
                        >

                          {/* GROUP */}

                          <tr className="group-row">

                            <td
                              colSpan={
                                permissionColumns.length +
                                2
                              }
                            >

                              <div className="group-header">

                                <div className="group-title">

                                  {group.icon ===
                                  "device" ? (

                                    <MonitorSmartphone
                                      size={
                                        12
                                      }
                                    />

                                  ) : (

                                    <Map
                                      size={
                                        12
                                      }
                                    />

                                  )}


                                  <strong>

                                    {
                                      group.name
                                    }

                                  </strong>


                                  <span>

                                    {
                                      group
                                        .modules
                                        .length
                                    }

                                    {
                                      " modules"
                                    }

                                  </span>

                                </div>


                                <div className="group-actions">

                                  <button
                                    className="grant-btn"
                                    onClick={() =>
                                      updateGroupPermissions(
                                        group.id,
                                        true
                                      )
                                    }
                                  >

                                    Grant all

                                  </button>


                                  <button
                                    className="revoke-btn"
                                    onClick={() =>
                                      updateGroupPermissions(
                                        group.id,
                                        false
                                      )
                                    }
                                  >

                                    Revoke all

                                  </button>

                                </div>

                              </div>

                            </td>

                          </tr>


                          {/* MODULES */}

                          {group.modules.map(
                            (module) => (

                              <tr
                                className="module-row"
                                key={
                                  module.id
                                }
                              >

                                <td className="module-cell">

                                  <div className="module-info">

                                    <strong>

                                      {
                                        module.name
                                      }

                                    </strong>


                                    <span
                                      className={`module-type ${getTypeClass(
                                        module.type
                                      )}`}
                                    >

                                      {
                                        module.type
                                      }

                                    </span>

                                  </div>

                                </td>


                                {permissionColumns.map(
                                  (
                                    column
                                  ) => (

                                    <td
                                      key={
                                        column.key
                                      }
                                      className="permission-cell"
                                    >

                                      <button
                                        type="button"
                                        className={`permission-state ${
                                          module
                                            .permissions[
                                            column
                                              .key
                                          ]
                                            ? "permission-on"
                                            : "permission-off"
                                        }`}
                                        onClick={() =>
                                          togglePermission(
                                            group.id,
                                            module.id,
                                            column.key
                                          )
                                        }
                                      >

                                        {module
                                          .permissions[
                                          column
                                            .key
                                        ]
                                          ? "ON"
                                          : "OFF"}

                                      </button>

                                    </td>

                                  )
                                )}


                                <td className="permission-cell">

                                  <button
                                    type="button"
                                    className="toggle-all-btn"
                                    onClick={() =>
                                      toggleModule(
                                        group.id,
                                        module.id
                                      )
                                    }
                                  >

                                    Toggle

                                  </button>

                                </td>

                              </tr>

                            )
                          )}

                        </React.Fragment>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

        </div>

      </div>

    </>
  );
}