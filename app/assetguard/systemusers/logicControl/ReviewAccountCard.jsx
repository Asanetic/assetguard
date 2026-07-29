
'use client';
import {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  mosyGetData
} from "../../../MosyUtils/hiveUtils";
// ReviewAccountCard — matches the "Assign role / Regions / Clusters /
// Reject / Approve & assign" mock exactly. Pure presentational + local
// pill-selection state; it does NOT call the API itself. It hands a
// clean payload up via onApprove/onReject so this same card can be
// dropped into a modal, a drawer, or an inline profile section without
// caring how the network call happens.
//
// Props:
//   row       — the system_user row being reviewed (name, email, phone,
//               company, reg_code, created_at, account_status...)
//   roles     — [{ value, label }] — defaults to a generic set
//   regions   — string[] — defaults to AssetGuard's region list
//   clusters  — string[] — defaults to AssetGuard's cluster list
//   busy      — true while a submit is in flight (disables buttons)
//   onApprove — ({ role, regions, clusters }) => void
//   onReject  — () => void
//   onCancel  — () => void   (optional — e.g. a modal's close button)
const DEFAULT_ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Site manager' },
  { value: 'technician', label: 'Field technician' },
  { value: 'viewer', label: 'Viewer' },
];

const DEFAULT_REGIONS = ['Nairobi', 'Central', 'Coast', 'Rift Valley', 'Western', 'Eastern', 'Nyanza', 'North Eastern'];
const DEFAULT_CLUSTERS = ['Nairobi CBD', 'Westlands', 'Industrial Area', 'Mombasa', 'Nakuru', 'Eldoret', 'Kisumu', 'Thika', 'Nyeri', 'Machakos'];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function timeAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// Toggle logic shared by both pill groups: clicking the "All ___" pill
// clears everything else and selects only "all"; clicking any specific
// pill drops "all" and toggles that one item.
function usePillGroup(initial = ['all']) {

  const [selected, setSelected] =
    useState(new Set(initial));


  const toggle = (value) => {

    setSelected((prev) => {

      const next = new Set(prev);

      if (value === 'all') {
        return new Set(['all']);
      }

      next.delete('all');

      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }

      if (next.size === 0) {
        return new Set(['all']);
      }

      return next;

    });

  };


  return [
    selected,
    toggle,
    setSelected
  ];

}

function parseCsvSelection(value) {

  if (!value) {
    return ['all'];
  }


  /*
  |--------------------------------------------------------------------------
  | Already an array
  |--------------------------------------------------------------------------
  */

  if (Array.isArray(value)) {

    return value.length
      ? value
      : ['all'];

  }


  /*
  |--------------------------------------------------------------------------
  | CSV string
  |--------------------------------------------------------------------------
  |
  | Nairobi,Central,Coast
  |
  */

  const values = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);


  if (
    values.length === 0 ||
    values.some(
      (item) =>
        item.toLowerCase() === 'all'
    )
  ) {

    return ['all'];

  }


  return values;

}

export default function ReviewAccountCard({
  row,
  busy = false,
  onApprove,
  onReject,
  onCancel,
  rejectLabel="Reject",
  approveLabel="Approve & Assign"
}) {
  const [role, setRole] = useState('');

  
/*
|--------------------------------------------------------------------------
| System roles
|--------------------------------------------------------------------------
*/

const [roles, setRoles] = useState([]);
const [loadingRoles, setLoadingRoles] = useState(false);
const [rolesError, setRolesError] = useState("");


/*
|--------------------------------------------------------------------------
| Load system roles
|--------------------------------------------------------------------------
*/

const loadRoles = async () => {

  try {

    setLoadingRoles(true);
    setRolesError("");


    const response = await mosyGetData({

      endpoint: "/api/assetguard/systemroles",

      params: {
        pageNo: 1,
        pageSize: 20,
      },

    });


    console.log(
      "System roles:",
      response
    );


    if (response?.status !== "success") {

      setRoles([]);

      setRolesError(
        response?.message ||
        "Unable to load roles."
      );

      return;
    }


    /*
    |--------------------------------------------------------------------------
    | Your API already returns:
    |
    | [
    |   {
    |     record_id: "X60ESYD",
    |     role_name: "Super Admin",
    |     permission_count: 31
    |   }
    | ]
    |--------------------------------------------------------------------------
    */

    const roleData =
      Array.isArray(response?.data)
        ? response.data
        : [];


    setRoles(roleData);


  } catch (error) {

    console.error(
      "Failed loading system roles:",
      error
    );


    setRoles([]);


    setRolesError(
      error?.message ||
      "Unable to load roles."
    );


  } finally {

    setLoadingRoles(false);

  }

};


/*
|--------------------------------------------------------------------------
| Initial role load
|--------------------------------------------------------------------------
*/

useEffect(() => {

  loadRoles();

  loadRegions();

  loadClusters();

}, []);


/*
|--------------------------------------------------------------------------
| Existing user scope
|--------------------------------------------------------------------------
|
| Example DB:
|
| regions  = "Nairobi,Central"
| clusters = "Nairobi CBD,Westlands"
|
*/

useEffect(() => {

  setRegionSel(
    new Set(
      parseCsvSelection(
        row?.regions
      )
    )
  );


  setClusterSel(
    new Set(
      parseCsvSelection(
        row?.clusters
      )
    )
  );

}, [
  row?.regions,
  row?.clusters
]);


/*
|--------------------------------------------------------------------------
| Regions / Clusters
|--------------------------------------------------------------------------
*/

  const [regions, setRegions] = useState([]);
  const [clusters, setClusters] = useState([]);

  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingClusters, setLoadingClusters] = useState(false);

  const [regionSel, toggleRegion, setRegionSel] =
    usePillGroup(['all']);

  const [clusterSel, toggleCluster, setClusterSel] =
    usePillGroup(['all']);

  const ago = useMemo(() => timeAgo(row?.created_at), [row?.created_at]);
  const canApprove = !!role && !busy;

  const buildPayload = () => {

    const selectedRoleData =
      roles.find(
        (item) =>
          item.record_id === role
      );
  
  
    const selectedRegions =
      regionSel.has("all")
        ? "all"
        : Array.from(regionSel)
            .join(",");
  
  
    const selectedClusters =
      clusterSel.has("all")
        ? "all"
        : Array.from(clusterSel)
            .join(",");
  
  
    return {
  
      role_id:
        selectedRoleData?.record_id || "",
  
      role_name:
        selectedRoleData?.role_name || "",
  
      regions:
        selectedRegions,
  
      clusters:
        selectedClusters,
  
    };
  
  };
  

  const loadRegions = async () => {

    try {
  
      setLoadingRegions(true);
  
  
      const response = await mosyGetData({
  
        endpoint:
          "/api/assetguard/regions",
  
        params: {
          pageNo: 1,
          pageSize: 100,
        },
  
      });
  
  
      if (response?.status !== "success") {
  
        setRegions([]);
  
        return;
  
      }
  
  
      const regionData =
        Array.isArray(response?.data)
          ? response.data
          : [];
  
  
      setRegions(regionData);
  
  
    } catch (error) {
  
      console.error(
        "Failed loading regions:",
        error
      );
  
      setRegions([]);
  
    } finally {
  
      setLoadingRegions(false);
  
    }
  
  };

  const loadClusters = async () => {

    try {
  
      setLoadingClusters(true);
  
  
      const response = await mosyGetData({
  
        endpoint:
          "/api/assetguard/clusters",
  
        params: {
          pageNo: 1,
          pageSize: 100,
        },
  
      });
  
  
      if (response?.status !== "success") {
  
        setClusters([]);
  
        return;
  
      }
  
  
      const clusterData =
        Array.isArray(response?.data)
          ? response.data
          : [];
  
  
      setClusters(clusterData);
  
  
    } catch (error) {
  
      console.error(
        "Failed loading clusters:",
        error
      );
  
      setClusters([]);
  
    } finally {
  
      setLoadingClusters(false);
  
    }
  
  };

  return (
    <div className="row justify-content-center m-0 p-0 col-md-12">
    <div className="rac-card ">
      <div className="rac-head">
        <div className="rac-avatar">{initials(row?.name)}</div>
        <div className="rac-head-text">
          <div className="rac-name-row">
            <span className="rac-name">{row?.name || 'Unknown user'}</span>
            {row?.reg_code && <span className="rac-badge">{row.reg_code}</span>}
            {ago && <span className="rac-ago">· {ago}</span>}
          </div>
          <div className="rac-contact-row">
            {row?.email && (
              <span className="rac-contact"><i className="fa fa-envelope-o" aria-hidden="true" />{row.email}</span>
            )}
            {row?.phone && (
              <span className="rac-contact"><i className="fa fa-phone" aria-hidden="true" />{row.phone}</span>
            )}
          </div>
          {row?.company && (
            <div className="rac-contact-row">
              <span className="rac-contact"><i className="fa fa-building-o" aria-hidden="true" />{row.company}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rac-divider" />

      <div className="rac-field">
        <div className=" h6"><span className="">Assign new role</span> | Current Role : {row.role_name || "Not assigned"}</div>    
        <select
          className="rac-select"
          value={role}
          disabled={loadingRoles || busy}
          onChange={(e) =>
            setRole(e.target.value)
          }
        >

          <option value="">

            {loadingRoles
              ? "Loading roles..."
              : "Select a role to assign"}

          </option>
          <option value={row.user_role}>Keep Current role : {row.role_name}</option>

          {roles.map((item) => (

            <option
              key={item.record_id}
              value={item.record_id}
            >

              {item.role_name}

              {item.permission_count > 0
                ? ` (${item.permission_count} permissions)`
                : ""}

            </option>

          ))}

        </select>
      </div>
      <hr/>
      <div className="rac-pill-columns">
        <div className="rac-pill-group">
          <div className="rac-label">Regions <span className="rac-label-sub">— one, many or all</span></div>
          <div className="rac-pills">
            <button type="button" className={`rac-pill ${regionSel.has('all') ? 'on' : ''}`} onClick={() => toggleRegion('all')}>All regions</button>
            {loadingRegions && (
            <span className="rac-label-sub">
              Loading regions...
            </span>
          )}


          {regions.map((region) => {

            const value =
              region.region_name;

            return (

              <button
                key={region.region_id}
                type="button"
                className={`rac-pill ${
                  regionSel.has(value)
                    ? 'on'
                    : ''
                }`}
                onClick={() =>
                  toggleRegion(value)
                }
              >
                {value}
              </button>

            );

          })}
          </div>
        </div>

        <div className="rac-pill-group">
          <div className="rac-label">Clusters <span className="rac-label-sub">— one, many or all</span></div>
          <div className="rac-pills">
            <button type="button" className={`rac-pill ${clusterSel.has('all') ? 'on' : ''}`} onClick={() => toggleCluster('all')}>All clusters</button>
            {loadingClusters && (
              <span className="rac-label-sub">
                Loading clusters...
              </span>
            )}


            {clusters.map((cluster) => {

              const value =
                cluster.cluster_name;

              return (

                <button
                  key={cluster.record_id}
                  type="button"
                  className={`rac-pill ${
                    clusterSel.has(value)
                      ? 'on'
                      : ''
                  }`}
                  onClick={() =>
                    toggleCluster(value)
                  }
                >
                  {value}
                </button>

              );

            })}
          </div>
        </div>
      </div>

      <div className="rac-actions">
        {onCancel && (
          <button type="button" className="rac-btn rac-btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        )}
        <button type="button" className="rac-btn rac-btn-reject" onClick={onReject} disabled={busy}>{rejectLabel}</button>
        <button
          type="button"
          className="rac-btn rac-btn-approve"
          disabled={!canApprove}
          onClick={() => onApprove?.(buildPayload())}
        >
          <i className="fa fa-check" aria-hidden="true" /> {busy ? 'Saving…' : `${approveLabel}`}
        </button>
      </div>
     </div>
      <style jsx>{`
        .rac-card { background: #fff; border: 0px solid #E2E8F0; border-radius: 14px; padding: 20px 22px; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 820px; }
        .rac-head { display: flex; gap: 14px; }
        .rac-avatar { width: 44px; height: 44px; border-radius: 50%; background: #14315D; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex: none; }
        .rac-head-text { flex: 1; min-width: 0; }
        .rac-name-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
        .rac-name { font-size: 15.5px; font-weight: 700; color: #0F274A; }
        .rac-badge { background: #F1F5F9; color: #475569; font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 8px; }
        .rac-ago { font-size: 12.5px; color: #94A3B8; }
        .rac-contact-row { display: flex; gap: 22px; margin-top: 4px; flex-wrap: wrap; }
        .rac-contact { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: #475569; }
        .rac-contact i { color: #94A3B8; font-size: 13px; width: 14px; text-align: center; }
        .rac-divider { height: 1px; background: #EEF2F7; margin: 16px 0; }
        .rac-field { margin-bottom: 18px; }
        .rac-label { font-size: 11.5px; font-weight: 700; letter-spacing: .5px; color: #64748B; text-transform: uppercase; margin-bottom: 8px; }
        .rac-label-sub { font-weight: 500; text-transform: none; letter-spacing: 0; color: #94A3B8; }
        .rac-select { width: 100%; max-width: 340px; height: 42px; border: 1px solid #E2E8F0; border-radius: 10px; padding: 0 12px; font-size: 14px; color: #0F274A; background: #fff; font-family: inherit; }
        .rac-select:focus { outline: none; border-color: #2E6CF5; box-shadow: 0 0 0 3px rgba(46,108,245,.14); }
        .rac-pill-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 20px; }
        .rac-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .rac-pill { border: 1px solid #E2E8F0; background: #fff; color: #475569; font-size: 12.5px; font-weight: 600; padding: 7px 14px; border-radius: 999px; cursor: pointer; font-family: inherit; transition: background .12s, color .12s, border-color .12s; }
        .rac-pill:hover { border-color: #BFD3FB; }
        .rac-pill.on { background: #2E6CF5; border-color: #2E6CF5; color: #fff; }
        .rac-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 14px; border-top: 1px solid #EEF2F7; }
        .rac-btn { height: 40px; border-radius: 9px; padding: 0 18px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 0; display: inline-flex; align-items: center; gap: 7px; }
        .rac-btn:disabled { opacity: .55; cursor: not-allowed; }
        .rac-btn-ghost { background: #fff; color: #334155; border: 1px solid #E2E8F0; }
        .rac-btn-reject { background: #fff; color: #DC2626; border: 1px solid #FECACA; }
        .rac-btn-reject:hover:not(:disabled) { background: #FEF2F2; }
        .rac-btn-approve { background: #2E6CF5; color: #fff; }
        .rac-btn-approve:hover:not(:disabled) { background: #1E56DB; }
        @media (max-width: 640px) {
          .rac-pill-columns { grid-template-columns: 1fr; gap: 18px; }
          .rac-actions { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}