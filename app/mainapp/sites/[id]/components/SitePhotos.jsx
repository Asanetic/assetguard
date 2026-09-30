// app/mainapp/sites/[id]/components/SitePhotos.jsx
// Site photos — what the mobile Capture screen uploaded for this site.
//
// Reads GET /api/mainapp/media?site_id=:id (metadata only, never the bytes) and
// renders each row as a thumbnail pointing at GET /api/mainapp/media/:photoId.
// Splitting it that way is the whole reason the grid is quick: the list is a
// few hundred bytes per photo, and the browser fetches the images itself, in
// parallel, and caches them (the byte route sends immutable).
//
// Download goes through ?download=1, which asks the server for a
// Content-Disposition filename built from the site code, photo type and date.
// A bare <a download> would save it as "378" — the id — which is useless the
// moment the file leaves this page, and these are evidence photos that get
// mailed to people.
"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./sitephotos.module.css";

const TYPE_COLOUR = {
  "before works": ["#fef3c7", "#92400e"],
  "after works": ["#d1fae5", "#065f46"],
  "device installation": ["#dbeafe", "#1e40af"],
};
const typeColour = (t) => TYPE_COLOUR[String(t || "").toLowerCase()] || ["#f1f5f9", "#475569"];

function fmtWhen(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (isNaN(d)) return String(v);
    return d.toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch { return String(v); }
}

const fmtSize = (b) => (!b ? "" : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);

const coords = (p) =>
  Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
    ? `${Number(p.lat).toFixed(4)}, ${Number(p.lng).toFixed(4)}`
    : null;

// Which stages belong to which page: SITE shows only before/after works;
// DEVICE shows only the installation shots.
const STAGE_ORDER_SITE = ["Before works", "After works"];
const STAGE_ORDER_DEVICE = ["Device installation"];
const byTakenDesc = (a, b) => new Date(b.taken_at || 0) - new Date(a.taken_at || 0); // taken_at, NOT created_at

export default function SitePhotos({ siteId, deviceId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null); // the photo shown full size

  useEffect(() => {
    // Query by device (human device_id) if given, else by site. The server filters
    // by device — never fetch a whole site and filter client-side.
    const qs = deviceId != null ? `device_id=${encodeURIComponent(deviceId)}`
             : siteId != null ? `site_id=${encodeURIComponent(siteId)}` : null;
    if (!qs) { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/mainapp/media?${qs}&limit=60`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          // 503 is the one worth naming: the route is fine, the table is not.
          setError(
            data.code === "SITE_PHOTOS_MISSING"
              ? "Photo storage isn’t set up on this server yet."
              : data.error || "Couldn’t load photos."
          );
        } else {
          setPhotos(Array.isArray(data.photos) ? data.photos : []);
        }
        setLoading(false);
      } catch {
        if (alive) { setError("Couldn’t load photos."); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [siteId, deviceId]);

  // Esc closes the viewer. Bound on document, not the overlay: the overlay is
  // not focused when it opens, so a keydown on it would never fire.
  const onKey = useCallback((e) => { if (e.key === "Escape") setOpen(null); }, []);
  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKey);
    // Stop the page behind the viewer from scrolling under it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onKey]);

  const stageOrder = deviceId != null ? STAGE_ORDER_DEVICE : STAGE_ORDER_SITE;
  const allowed = new Set(stageOrder);
  const visible = photos.filter((p) => allowed.has(String(p.photo_type || "")));

  if (loading) return <div className={styles.empty}>Loading photos…</div>;
  if (error) return <div className={styles.empty}>{error}</div>;
  if (!visible.length) return <div className={styles.empty}>No photos uploaded yet.</div>;

  // Group by the allowed stages only (before/after for a site), newest-first by
  // taken_at, so the before/after pair reads as the evidence of what changed.
  const groups = [];
  for (const st of stageOrder) {
    const g = visible.filter((p) => String(p.photo_type || "") === st).sort(byTakenDesc);
    if (g.length) groups.push([st, g]);
  }

  const Card = (p) => {
    const [bg, fg] = typeColour(p.photo_type);
    const gps = coords(p);
    // accuracy_m null ⇒ came from the site record, not a live GPS fix.
    const fromRecord = gps && (p.accuracy_m == null);
    return (
      <figure key={p.id} className={styles.card}>
        <button
          type="button"
          className={styles.thumbBtn}
          onClick={() => setOpen(p)}
          aria-label={`Open ${p.photo_type || "photo"} taken ${fmtWhen(p.taken_at)}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/mainapp/media/${p.id}`}
            alt={`${p.photo_type || "photo"}`}
            className={styles.thumb}
            loading="lazy"
          />
          <span className={styles.typeBadge} style={{ background: bg, color: fg }}>
            {p.photo_type || "Photo"}
          </span>
          {p.imprinted ? (
            <span className={styles.imprint} title="Provenance is burned into the image">
              <i className="ti ti-shield-check" />
            </span>
          ) : null}
        </button>

        <figcaption className={styles.meta}>
          {p.device_id ? <div className={styles.when} style={{ fontWeight: 700 }}>{p.device_id}</div> : null}
          <div className={styles.when}>{fmtWhen(p.taken_at)}</div>
          <div className={styles.who}>
            {p.captured_by || p.technician || "—"}
            {p.status ? <span className={styles.statusDot}> · {p.status}</span> : null}
          </div>
          {gps ? (
            <div className={styles.gps}>
              <i className="ti ti-current-location" />{gps}
              {fromRecord ? <span className={styles.acc}> · from site record</span>
                : p.accuracy_m ? <span className={styles.acc}> ±{Math.round(p.accuracy_m)} m</span> : null}
            </div>
          ) : null}
          <a
            className={styles.dl}
            href={`/api/mainapp/media/${p.id}?download=1`}
            download
          >
            <i className="ti ti-download" />Download{p.bytes ? ` · ${fmtSize(p.bytes)}` : ""}
          </a>
        </figcaption>
      </figure>
    );
  };

  return (
    <>
      {groups.map(([label, g]) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0 10px" }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".4px", color: "#334155" }}>{label.toUpperCase()}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>{g.length}</span>
          </div>
          <div className={styles.grid}>{g.map(Card)}</div>
        </div>
      ))}

      {open ? (
        <div
          className={styles.overlay}
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Site photo"
        >
          {/* stopPropagation so a click on the image itself doesn't close it */}
          <div className={styles.viewer} onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/mainapp/media/${open.id}`}
              alt={`${open.photo_type || "Site photo"} at ${open.site_code || open.site_name || "site"}`}
              className={styles.full}
            />
            <div className={styles.viewerBar}>
              <div className={styles.viewerMeta}>
                <strong>{open.photo_type || "Photo"}</strong>
                <span>{open.site_code || open.site_name}</span>
                <span>{fmtWhen(open.taken_at)}</span>
                {open.technician ? <span>{open.technician}</span> : null}
                {coords(open) ? <span>{coords(open)}</span> : null}
              </div>
              <a
                className={styles.viewerDl}
                href={`/api/mainapp/media/${open.id}?download=1`}
                download
              >
                <i className="ti ti-download" />Download
              </a>
              <button type="button" className={styles.close} onClick={() => setOpen(null)} aria-label="Close">
                <i className="ti ti-x" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
