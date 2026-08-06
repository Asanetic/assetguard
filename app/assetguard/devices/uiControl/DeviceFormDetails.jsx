"use client";
import { useEffect, useState } from 'react';


/**
 * DeviceFormSections
 * Reusable "Add / edit device" section block — matches html58's Add device
 * screen (adw-* web / ada4-* mobile) field-for-field: Site, Orientation,
 * Device details, Geofence, Sensor & reporting, Installation photo,
 * Mounting notes.
 *
 * Same pattern as SitePeopleRows / SiteLocationMap: single json `row` in,
 * onChange(row) out. Parent owns saving/uploading. `row` may be
 * null/undefined for a blank "add" form.
 *
 * row shape (all optional unless noted):
 * {
 *   site_id: string,                  // record_id of selected site
 *   site_name: string,                // display name of selected site
 *   orientation: 'vertical' | 'horizontal',  // default 'vertical'
 *   device_id: string,                // auto-generated, read-only display
 *   imei: string,                     // required
 *   sim_number: string,
 *   initial_status: string,           // default 'Testing'
 *   geofence_enabled: bool,           // default true
 *   geofence_radius_m: number,        // 25 | 50 | 100 | 250 | 500, default 100
 *   motion_sensitivity: number,       // 1-100, default 50
 *   upload_interval: string,          // default '1 minute'
 *   installation_photo_url: string,   // existing photo (edit mode)
 *   mounting_notes: string,
 * }
 *
 * Props:
 *  - row: json object described above (may be null)
 *  - onChange(row): fires with the full merged row on every field change
 *  - onPhotoSelect(file): fires with the raw File when a new photo is chosen
 *    (kept separate from `row` since a File isn't JSON-serializable)
 *  - disabled: bool
 *  - showActions: bool — render Save/Cancel buttons (default false, parent
 *    usually owns its own save button)
 *  - onSave(), onCancel(): only used when showActions is true
 */

const STATUS_OPTIONS = ['Testing', 'Live', 'Maintenance', 'Offline', 'Inactive'];
const RADIUS_OPTIONS = [25, 50, 100, 250, 500];
const UPLOAD_INTERVAL_OPTIONS = ['30 seconds', '1 minute', '5 minutes', '15 minutes', '1 hour'];

const DEFAULTS = {
  site_id: '',
  site_name: '',
  orientation: 'vertical',
  device_id: '',
  imei: '',
  sim_number: '',
  initial_status: 'Testing',
  geofence_enabled: true,
  geofence_radius_m: 100,
  motion_sensitivity: 50,
  upload_interval: '1 minute',
  installation_photo_url: '',
  mounting_notes: '',
};

function SectionCard({ icon, iconBg, iconColor, title, hint, right, children }) {
  return (
    <div className="border rounded-3 p-3 mb-3 bg-white">
      <div className="d-flex align-items-center gap-2 mb-3">
        <span
          className="d-inline-flex align-items-center justify-content-center rounded-2"
          style={{ width: 28, height: 28, background: iconBg, color: iconColor, flex: 'none' }}
        >
          <i className={`ti ${icon}`} style={{ fontSize: 15 }} />
        </span>
        <span className="fw-bold" style={{ color: '#0F274A', fontSize: 14.5 }}>
          {title}
        </span>
        {hint && (
          <span className="small text-muted" style={{ fontSize: 12 }}>
            {hint}
          </span>
        )}
        {right && <span className="ms-auto">{right}</span>}
      </div>
      {children}
    </div>
  );
}

// Dashed geofence ring — decorative preview, scales with the selected radius
function GeofencePreview({ radius, disabled }) {
  const maxRadius = RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1];
  const minPx = 20;
  const maxPx = 38;
  const ringPx = minPx + (radius / maxRadius) * (maxPx - minPx);

  return (
    <div
      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
      style={{ width: 150, height: 110, background: '#EAF1E6', position: 'relative', overflow: 'hidden', opacity: disabled ? 0.5 : 1 }}
    >
      <div
        className="rounded-circle"
        style={{
          width: ringPx * 2,
          height: ringPx * 2,
          border: '2px dashed #2E6CF5',
          background: 'rgba(46,108,245,.08)',
          position: 'absolute',
        }}
      />
      <span
        className="d-inline-flex align-items-center justify-content-center rounded-2"
        style={{ width: 22, height: 22, background: '#2E6CF5', color: '#fff', zIndex: 1 }}
      >
        <i className="ti ti-gps" style={{ fontSize: 12 }} />
      </span>
    </div>
  );
}

export default function DeviceFormSections({
  row,
  onChange,
  onPhotoSelect,
  disabled = false,
  showActions = false,
  onSave,
  onCancel,
}) {
  const merged = { ...DEFAULTS, ...(row || {}) };
  const [photoPreview, setPhotoPreview] = useState(merged.installation_photo_url || '');

  useEffect(() => {
    setPhotoPreview(merged.installation_photo_url || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merged.installation_photo_url]);

  function patch(fields) {
    onChange && onChange({ ...merged, ...fields });
  }

  function handleSiteSelect(site) {
    patch({ site_id: site?.record_id || '', site_name: site?.site_name || '' });
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    onPhotoSelect && onPhotoSelect(file);
  }

  function removePhoto() {
    setPhotoPreview('');
    patch({ installation_photo_url: '' });
    onPhotoSelect && onPhotoSelect(null);
  }

  return (
    <div>
      {/* Site */}
      {/* <SectionCard icon="ti-map-pin" iconBg="#DBE7FE" iconColor="#2E6CF5" title="Site">
        <label className="form-label small fw-semibold mb-1">
          Site <span className="text-danger">*</span>
        </label>
        <LiveSearchDropdown
          apiEndpoint={apiRoutes.sites.base}
          tblName="sites"
          inputName="site_id"
          hiddenInputName="record_id"
          parentTable="devices"
          valueField="site_name"
          displayField="site_name"
          defaultValue={merged.site_name || ''}
          onSelectFull={handleSiteSelect}
          defaultColSize="col-md-12"
          disabled={disabled}
        />
      </SectionCard> */}

      {/* Orientation */}
      <SectionCard icon="ti-gps" iconBg="#FEF3C7" iconColor="#B45309" title="Orientation">
        <div className="row g-2">
          {['vertical', 'horizontal'].map((opt) => {
            const active = merged.orientation === opt;
            return (
              <div className="col-6" key={opt}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => patch({ orientation: opt })}
                  className="w-100 py-3 rounded-3 border text-center"
                  style={{
                    background: active ? '#EFF4FE' : '#fff',
                    borderColor: active ? '#2E6CF5' : '#E2E8F0',
                    borderWidth: active ? 2 : 1,
                    color: '#0F274A',
                    fontWeight: 700,
                  }}
                >
                  <i
                    className={`ti ${opt === 'vertical' ? 'ti-arrow-bar-to-up' : 'ti-arrow-bar-to-right'} d-block mb-1`}
                    style={{ fontSize: 20, color: '#2E6CF5' }}
                  />
                  <span style={{ textTransform: 'capitalize', fontSize: 13 }}>{opt}</span>
                </button>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Device details */}
      <SectionCard icon="ti-cpu" iconBg="#D1FAE5" iconColor="#047857" title="Device details">
        <div className="mb-3">
          <label className="form-label small fw-semibold mb-1">
            Device ID <span className="text-muted fw-normal">(auto-generated)</span>
          </label>
          <input type="text" className="form-control bg-light" readOnly value={merged.device_id || ''} />
          <div className="small text-muted mt-1" style={{ fontSize: 11 }}>
            Generated as <b>{'{site no.}_{site name}_{V or H}'}</b>, e.g.{' '}
            <code style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 4, padding: '1px 5px' }}>
              001_NairobiHeadquarters_V
            </code>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label small fw-semibold mb-1">
            IMEI <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. 352093100034561"
            value={merged.imei || ''}
            disabled={disabled}
            onChange={(e) => patch({ imei: e.target.value })}
          />
        </div>

        <div className="mb-3">
          <label className="form-label small fw-semibold mb-1">
            SIM number <span className="text-muted fw-normal">(optional)</span>
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. 0712 345 678"
            value={merged.sim_number || ''}
            disabled={disabled}
            onChange={(e) => patch({ sim_number: e.target.value })}
          />
        </div>

        <div>
          <label className="form-label small fw-semibold mb-1">Initial status</label>
          <select
            className="form-select"
            value={merged.initial_status || 'Testing'}
            disabled={disabled}
            onChange={(e) => patch({ initial_status: e.target.value })}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      {/* Geofence */}
      <SectionCard
        icon="ti-map-pin-cog"
        iconBg="#FEE2E2"
        iconColor="#DC2626"
        title="Geofence"
        right={
          <div className="form-check form-switch m-0">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={!!merged.geofence_enabled}
              disabled={disabled}
              onChange={(e) => patch({ geofence_enabled: e.target.checked })}
              aria-label="Toggle geofence"
            />
          </div>
        }
      >
        <div className="d-flex gap-3 align-items-start flex-wrap">
          <div className="flex-grow-1" style={{ minWidth: 180 }}>
            <label className="form-label small fw-semibold mb-1">Alert radius</label>
            <select
              className="form-select"
              value={merged.geofence_radius_m}
              disabled={disabled || !merged.geofence_enabled}
              onChange={(e) => patch({ geofence_radius_m: Number(e.target.value) })}
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} m
                </option>
              ))}
            </select>
            <div className="small text-muted mt-2" style={{ fontSize: 11 }}>
              An alarm fires if this device moves beyond the radius from its installed point.
            </div>
          </div>
          <GeofencePreview radius={merged.geofence_radius_m} disabled={!merged.geofence_enabled} />
        </div>
      </SectionCard>

      {/* Sensor & reporting */}
      <SectionCard icon="ti-adjustments" iconBg="#EDE9FE" iconColor="#7C3AED" title="Sensor & reporting">
        <div className="mb-3">
          <label className="form-label small fw-semibold mb-1">
            Motion sensitivity <span style={{ color: '#2E6CF5', fontWeight: 800 }}>{merged.motion_sensitivity}</span> / 100
          </label>
          <input
            type="range"
            className="form-range"
            min={1}
            max={100}
            value={merged.motion_sensitivity}
            disabled={disabled}
            onChange={(e) => patch({ motion_sensitivity: Number(e.target.value) })}
          />
          <div className="d-flex justify-content-between small text-muted" style={{ fontSize: 10 }}>
            <span>1 · saves battery</span>
            <span>100 · detects smallest movement</span>
          </div>
        </div>

        <div>
          <label className="form-label small fw-semibold mb-1">Upload interval</label>
          <select
            className="form-select"
            value={merged.upload_interval}
            disabled={disabled}
            onChange={(e) => patch({ upload_interval: e.target.value })}
          >
            {UPLOAD_INTERVAL_OPTIONS.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      {/* Installation photo */}
      <SectionCard icon="ti-camera" iconBg="#DBE7FE" iconColor="#2E6CF5" title="Installation photo" hint="— one per device">
        {!photoPreview ? (
          <label
            htmlFor="deviceInstallPhotoInput"
            className="d-flex flex-column align-items-center justify-content-center rounded-3 text-center py-4"
            style={{ border: '2px dashed #E2E8F0', cursor: disabled ? 'not-allowed' : 'pointer' }}
          >
            <i className="ti ti-upload mb-2" style={{ fontSize: 22, color: '#94A3B8' }} />
            <span className="fw-semibold" style={{ color: '#334155', fontSize: 13 }}>
              Import installation photo
            </span>
            <span className="small text-muted mt-1" style={{ fontSize: 11 }}>
              Choose an image from your computer
            </span>
            <input
              id="deviceInstallPhotoInput"
              type="file"
              accept="image/*"
              className="d-none"
              disabled={disabled}
              onChange={handlePhotoChange}
            />
          </label>
        ) : (
          <div className="position-relative rounded-3 overflow-hidden border">
            <img src={photoPreview} alt="Installation" style={{ width: '100%', display: 'block', maxHeight: 180, objectFit: 'cover' }} />
            <button
              type="button"
              className="btn btn-sm position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center p-0"
              style={{ width: 28, height: 28, background: 'rgba(15,23,42,.55)', color: '#fff', border: 0 }}
              disabled={disabled}
              onClick={removePhoto}
              aria-label="Remove photo"
            >
              <i className="ti ti-x" style={{ fontSize: 13 }} />
            </button>
          </div>
        )}
      </SectionCard>

      {/* Mounting notes */}
      <div className="mb-3">
        <label className="form-label small fw-semibold mb-1">
          Mounting notes <span className="text-muted fw-normal">(optional)</span>
        </label>
        <textarea
          className="form-control"
          rows={2}
          placeholder="e.g. Mounted on north perimeter pole, 3m up"
          value={merged.mounting_notes || ''}
          disabled={disabled}
          onChange={(e) => patch({ mounting_notes: e.target.value })}
        />
      </div>

      {showActions && (
        <div className="d-flex flex-column gap-2">
          <button type="button" className="btn text-white" style={{ background: '#2E6CF5' }} disabled={disabled} onClick={onSave}>
            Save device
          </button>
          <button type="button" className="btn btn-outline-secondary" disabled={disabled} onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}