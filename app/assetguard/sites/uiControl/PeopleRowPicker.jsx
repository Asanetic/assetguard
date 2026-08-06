"use client";
import { useState } from 'react';
import { magicRandomStr } from '../../../MosyUtils/hiveUtils'; // adjust relative path to your project structure
import { LiveSearchDropdown } from '../../UiControl/componentControl';
import { getApiRoutes } from '../../AppRoutes/apiRoutesHandler';

const apiRoutes = getApiRoutes();

/**
 * SitePeopleRows
 * Dynamic "add user / role" rows for the site_people table.
 * table: site_people
 * columns: primkey, record_id, site_id, company_id, role_name, username, userid, userphone, useremail, created_at
 *
 * Fully self-contained + reusable (drop-in anywhere, no page coupling).
 * Parent owns saving — this component just keeps `rows` in sync via onChange.
 * Name/phone/email are live-searched straight from system_users, so there's
 * no pre-fetched contacts list to pass in.
 *
 * Props:
 *  - value: array of existing site_people rows (edit mode). Optional.
 *  - onChange(rows): fires on every change with the full current rows array
 *  - disabled: bool
 */
export default function SitePeopleRows({ value = null, onChange, disabled = false }) {
  const [rows, setRows] = useState(
    value && value.length
      ? value
      : [{ _key: magicRandomStr(6), role_name: '', username: '', userid: '', userphone: '', useremail: '' }]
  );

  function pushChange(next) {
    setRows(next);
    onChange && onChange(next);
  }

  function updateRow(key, patch) {
    const next = rows.map((r) => (r._key === key || r.primkey === key ? { ...r, ...patch } : r));
    pushChange(next);
  }

  function handlePersonSelect(key, person) {
    updateRow(key, {
      userid: person?.record_id || '',
      username: person?.name || '',
      userphone: person?.tel || '',
      useremail: person?.email || '',
    });
  }

  function addRow() {
    pushChange([
      ...rows,
      { _key: magicRandomStr(6), role_name: '', username: '', userid: '', userphone: '', useremail: '' },
    ]);
  }

  function removeRow(key) {
    if (rows.length === 1) {
      // keep at least one blank row instead of collapsing to nothing
      pushChange([{ _key: magicRandomStr(6), role_name: '', username: '', userid: '', userphone: '', useremail: '' }]);
      return;
    }
    pushChange(rows.filter((r) => r._key !== key && r.primkey !== key));
  }

  return (
    <div className="col-md-12 p-0">
      {rows.map((row) => {
        const rowKey = row._key || row.primkey;
        return (
          <div className="row align-items-end mb-3" key={rowKey}>
            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1">Role</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Country manager"
                value={row.role_name || ''}
                disabled={disabled}
                onChange={(e) => updateRow(rowKey, { role_name: e.target.value })}
              />
            </div>

            <div className="col-md-3">
              <LiveSearchDropdown
                apiEndpoint={apiRoutes.systemusers.base}
                tblName="system_users"
                inputName="userid"
                hiddenInputName="record_id"
                parentTable="site_people"
                valueField="name"
                label='Name'
                displayField="name"
                defaultValue={row.username || ''}
                onSelectFull={(person) => handlePersonSelect(rowKey, person)}
                defaultColSize="col-md-12"
                disabled={disabled}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small fw-semibold mb-1">
                Phone <span className="text-muted fw-normal">(auto-filled)</span>
              </label>
              <input type="text" className="form-control bg-light" readOnly value={row.userphone || ''} />
            </div>

            <div className="col-md-2">
              <label className="form-label small fw-semibold mb-1">
                Email <span className="text-muted fw-normal">(auto-filled)</span>
              </label>
              <input type="text" className="form-control bg-light" readOnly value={row.useremail || ''} />
            </div>

            <div className="col-md-1 text-end">
              <button
                type="button"
                className="btn btn-sm btn-outline-danger px-3"
                disabled={disabled}
                onClick={() => removeRow(rowKey)}
                aria-label="Remove row"
              >
                <i className="fa fa-trash" />
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        className="btn btn-sm"
        style={{ color: '#2E6CF5', border: '1px solid #BFD3FB', background: '#fff' }}
        disabled={disabled}
        onClick={addRow}
      >
        <i className="ti ti-plus me-1" />
        Add user / role
      </button>
    </div>
  );
}