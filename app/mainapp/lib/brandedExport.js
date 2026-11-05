// app/mainapp/lib/brandedExport.js
// Client helpers for the ONE branded-spreadsheet path. Every "export to
// spreadsheet" in the app goes through here, so each file comes out as a real
// .xlsx with the company logo + name across the top (built server-side from the
// live branding — see app/api/mainapp/export/xlsx).
//
// The data is sent as the CSV the caller already builds; no caller has to
// re-shape its rows.

async function fetchXlsxBlob({ filename, csv, sheets, title, sheetName }) {
  const res = await fetch("/api/mainapp/export/xlsx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, csv, sheets, title, sheetName }),
  });
  if (!res.ok) {
    let msg = "Export failed";
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.blob();
}

function withXlsx(name) {
  return /\.xlsx$/i.test(name) ? name : `${String(name || "export").replace(/\.csv$/i, "")}.xlsx`;
}

/** Build a branded .xlsx from CSV text and download it. */
export async function downloadBrandedXlsx(filename, csv, opts = {}) {
  const blob = await fetchXlsxBlob({ filename, csv, title: opts.title, sheetName: opts.sheetName });
  const name = withXlsx(filename);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 15000);
  return { url, name };
}

/**
 * Build a branded .xlsx from CSV text and return { url, name } WITHOUT
 * downloading — for stores that keep the file for later (e.g. playback exports).
 * The caller owns the object URL and should revoke it when done.
 */
export async function brandedXlsxObjectUrl(filename, csv, opts = {}) {
  const blob = await fetchXlsxBlob({ filename, csv, title: opts.title, sheetName: opts.sheetName });
  return { url: URL.createObjectURL(blob), name: withXlsx(filename), blob };
}
