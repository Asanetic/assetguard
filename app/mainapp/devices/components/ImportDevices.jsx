// app/mainapp/devices/components/ImportDevices.jsx
// "Import devices from Excel" — the prototype flow wired for real, but the sheet
// carries Site ID + IMEI (required) and optional Orientation + SIM number. Everything else
// (the display id, battery, data, status) is derived/telemetry, so the template
// stays deliberately small.  pick -> parse (SheetJS) -> preview -> confirm ->
// POST /api/mainapp/devices/import.
"use client";

import { useRef, useState } from "react";
import styles from "./import.module.css";

// key -> display label. Site ID + IMEI are required; Orientation + SIM optional.
const COLS = [
  ["site", "Site ID"],
  ["imei", "IMEI"],
  ["ori", "Orientation"],
  ["sim", "SIM number"],
];

// Accept common header spellings -> our internal key.
const HEADER_ALIASES = {
  siteid: "site", site: "site", sitecode: "site", code: "site", siteno: "site",
  imei: "imei", serial: "imei",
  orientation: "ori", ori: "ori", mount: "ori", mounting: "ori",
  sim: "sim", simnumber: "sim", simno: "sim", msisdn: "sim", simcard: "sim",
};

function normHeader(h) { return String(h || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

export default function ImportDevices({ onClose, onImported }) {
  const [step, setStep] = useState("pick"); // pick | preview | done
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [skipped, setSkipped] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [templated, setTemplated] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setErr("");
    setFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
      if (!matrix.length) { setErr("The spreadsheet appears to be empty."); return; }

      const header = matrix[0].map(normHeader);
      const keyByCol = header.map((h) => HEADER_ALIASES[h] || null);
      if (!keyByCol.includes("site") || !keyByCol.includes("imei")) {
        setErr("Could not find the required 'Site ID' and 'IMEI' columns in the header row.");
        return;
      }

      const parsed = [];
      let bad = 0;
      for (let i = 1; i < matrix.length; i++) {
        const arr = matrix[i];
        if (!arr || !arr.length) continue;
        const row = {};
        keyByCol.forEach((k, c) => { if (k) row[k] = arr[c] != null ? String(arr[c]).trim() : ""; });
        if (!Object.values(row).some((v) => v)) continue;
        if (!row.site || !row.imei) { bad++; continue; }
        parsed.push(row);
      }

      if (!parsed.length) { setErr("No valid rows found — every row needs a Site ID and IMEI."); return; }
      setRows(parsed);
      setSkipped(bad);
      setStep("preview");
    } catch (e) {
      console.error(e);
      setErr("Could not read that file. Make sure it's a valid .xlsx, .xls, or .csv.");
    }
  }

  function onPick(e) { const f = e.target.files && e.target.files[0]; handleFile(f); e.target.value = ""; }
  function onDrop(e) { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files && e.dataTransfer.files[0]; handleFile(f); }

  async function downloadTemplate() {
    try {
      const XLSX = await import("xlsx");
      const header = COLS.map((c) => c[1]);
      const example = ["001", "352093100034561", "Vertical", "0712345678"];
      const ws = XLSX.utils.aoa_to_sheet([header, example]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Devices");
      XLSX.writeFile(wb, "assetguard-devices-template.xlsx");
      setTemplated(true);
      setTimeout(() => setTemplated(false), 1600);
    } catch (e) { console.error(e); }
  }

  async function confirmImport() {
    setBusy(true); setErr("");
    const payload = rows.map((r) => ({ site: r.site, imei: r.imei, ori: r.ori, sim: r.sim }));
    try {
      const res = await fetch("/api/mainapp/devices/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || "Import failed"); setBusy(false); return; }
      setResult(d);
      setStep("done");
      setBusy(false);
    } catch { setErr("Network error during import"); setBusy(false); }
  }

  return (
    <div className={styles.scrim} onClick={() => !busy && onClose()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headLeft}>
            <span className={styles.headIcon}><i className="ti ti-file-spreadsheet" aria-hidden="true" /></span>
            <div>
              <div className={styles.headTitle}>Import devices from Excel</div>
              <div className={styles.headSub}>Upload a spreadsheet with the device columns</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={() => !busy && onClose()} aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>

        <div className={styles.body}>
          {step === "pick" && (
            <>
              <div
                className={`${styles.drop} ${dragOver ? styles.dropOver : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <span className={styles.dropIcon}><i className="ti ti-cloud-upload" aria-hidden="true" /></span>
                <div className={styles.dropTitle}>Choose an Excel file to import</div>
                <div className={styles.dropHint}>
                  Supported formats: .xlsx, .xls, .csv<br />
                  The sheet should have a header row with the device columns.
                </div>
                <button className={styles.chooseBtn} onClick={() => inputRef.current?.click()}>
                  <i className="ti ti-file-spreadsheet" aria-hidden="true" />Select spreadsheet
                </button>
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onPick} />
              </div>

              {err && <div className={styles.warnLine}><i className="ti ti-alert-triangle" aria-hidden="true" />{err}</div>}

              <div className={styles.expect}>
                <div className={styles.expectHead}><i className="ti ti-info-circle" aria-hidden="true" />Expected columns</div>
                <div className={styles.chips}>{COLS.map((c) => <span key={c[0]} className={styles.chip}>{c[1]}</span>)}</div>
                <button className={styles.templateBtn} onClick={downloadTemplate}>
                  <i className={templated ? "ti ti-check" : "ti ti-download"} aria-hidden="true" />
                  {templated ? "Template downloaded" : "Download blank template"}
                </button>
              </div>
            </>
          )}

          {step === "preview" && (
            <>
              <div className={styles.previewTop}>
                <span className={styles.fileChip}><i className="ti ti-file-spreadsheet" aria-hidden="true" />{fileName}</span>
                <span className={styles.foundTxt}>{rows.length} device{rows.length === 1 ? "" : "s"} found · {COLS.length} columns</span>
                <button className={styles.replaceBtn} onClick={() => { setStep("pick"); setRows([]); setErr(""); }}>
                  <i className="ti ti-refresh" aria-hidden="true" />Choose a different file
                </button>
              </div>

              <div className={styles.previewWrap}>
                <table className={styles.previewTable}>
                  <thead><tr>{COLS.map((c) => <th key={c[0]}>{c[1].toUpperCase()}</th>)}</tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>{COLS.map((c) => <td key={c[0]} className={c[0] === "imei" ? styles.cellName : ""}>{r[c[0]] || "—"}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {skipped > 0 ? (
                <div className={styles.warnLine}><i className="ti ti-alert-triangle" aria-hidden="true" />{skipped} row{skipped === 1 ? "" : "s"} skipped — missing Site ID or IMEI.</div>
              ) : (
                <div className={styles.validLine}><i className="ti ti-circle-check" aria-hidden="true" />All rows validated — no missing required fields.</div>
              )}
              {err && <div className={styles.warnLine} style={{ color: "#dc2626" }}><i className="ti ti-alert-triangle" aria-hidden="true" />{err}</div>}
            </>
          )}

          {step === "done" && (
            <div className={styles.done}>
              <span className={styles.doneIcon}><i className="ti ti-check" aria-hidden="true" /></span>
              <div className={styles.doneTitle}>{result?.total || rows.length} device{(result?.total || rows.length) === 1 ? "" : "s"} imported</div>
              <div className={styles.doneSub}>
                They&rsquo;ve been registered against their sites.
                {result && (result.updated > 0 ? ` (${result.imported} new, ${result.updated} updated.)` : "")}
                {result && result.skipped > 0 ? ` ${result.skipped} skipped (unknown site).` : ""}
              </div>
            </div>
          )}
        </div>

        <div className={styles.foot}>
          {step === "pick" && (<><span className={styles.footNote}>Nothing is imported until you confirm.</span><button className={styles.btnGhost} onClick={onClose}>Cancel</button></>)}
          {step === "preview" && (
            <>
              <button className={styles.btnGhost} onClick={() => { setStep("pick"); setErr(""); }}>Back</button>
              <button className={styles.btnPrimary} onClick={confirmImport} disabled={busy}>
                <i className="ti ti-check" aria-hidden="true" />{busy ? "Importing…" : `Import ${rows.length} device${rows.length === 1 ? "" : "s"}`}
              </button>
            </>
          )}
          {step === "done" && (<><span /><button className={styles.btnPrimary} onClick={() => { onImported && onImported(); }}>Done</button></>)}
        </div>
      </div>
    </div>
  );
}
