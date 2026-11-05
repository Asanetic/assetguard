// app/api/apiUtils/export/brandedWorkbook.js
// -----------------------------------------------------------------------------
// Every generated spreadsheet in the app is built here, so they all carry the
// same company branding — the logo and name stamped across the top of the sheet,
// the Excel equivalent of the watermark the reports already have.
//
// The client hands us the data as the CSV it already builds (or structured
// sheets); we parse it, lay it out, add the branding header, and return a real
// .xlsx. Branding comes from the live config, not the client, so it can never be
// stale or spoofed.
// -----------------------------------------------------------------------------
import ExcelJS from "exceljs";
import { getBranding } from "../dataControl/appConfig.js";

/** A minimal, correct CSV parser (quotes, escaped quotes, commas, CRLF). */
export function parseCsv(text) {
  const s = String(text || "").replace(/^﻿/, "");
  const rows = [];
  let row = [], field = "", inQ = false, i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (inQ) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQ = true; i++; continue; }
    if (ch === ",") { row.push(field); field = ""; i++; continue; }
    if (ch === "\r") { i++; continue; }
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// Only raster images embed in xlsx. SVG/WebP logos fall back to the name-only
// header rather than failing the whole export.
function parseLogo(dataUrl) {
  const m = /^data:image\/(png|jpe?g|gif);base64,([A-Za-z0-9+/=\s]+)$/i.exec(String(dataUrl || ""));
  if (!m) return null;
  let ext = m[1].toLowerCase();
  if (ext === "jpg" || ext === "jpeg") ext = "jpeg";
  return { extension: ext, base64: m[2].replace(/\s+/g, "") };
}

const NAVY = "FF14315D", INK = "FF0F274A", SLATE = "FF64748B";

function cleanSheetName(n, used) {
  let name = String(n || "Sheet1").replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "Sheet1";
  let base = name, k = 2;
  while (used.has(name.toLowerCase())) { name = `${base.slice(0, 28)}_${k++}`; }
  used.add(name.toLowerCase());
  return name;
}

/**
 * Build a branded .xlsx Buffer.
 * @param {{ sheets: Array<{ name?, title?, header?: string[], rows: any[][] }> }} args
 *   Each sheet's `rows` is an array of arrays. If `header` is given it is the
 *   header row and `rows` is the data; otherwise `rows[0]` is treated as the header.
 */
export async function buildBrandedXlsx({ sheets }) {
  const branding = await getBranding().catch(() => ({}));
  const companyName = String(branding.companyName || "").trim() || "AssetGuard";
  const useMark = branding.watermark !== false;
  const logo = useMark ? parseLogo(branding.logoDataUrl) : null;

  const wb = new ExcelJS.Workbook();
  wb.creator = companyName;
  wb.created = new Date();

  let imageId = null;
  if (logo) {
    try { imageId = wb.addImage({ base64: logo.base64, extension: logo.extension }); }
    catch { imageId = null; }
  }

  const genStr = new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" });
  const usedNames = new Set();
  const list = Array.isArray(sheets) && sheets.length ? sheets : [{ name: "Export", rows: [] }];

  for (const sheet of list) {
    const ws = wb.addWorksheet(cleanSheetName(sheet.name, usedNames));
    const allRows = Array.isArray(sheet.rows) ? sheet.rows : [];
    const hasHeaderField = Array.isArray(sheet.header) && sheet.header.length > 0;
    const header = hasHeaderField ? sheet.header : (allRows[0] || []);
    const dataRows = hasHeaderField ? allRows : allRows.slice(1);
    const colCount = Math.max(header.length, 1);

    const TITLE_ROWS = 3; // company name, subtitle, spacer

    ws.mergeCells(1, 1, 1, colCount);
    const title = ws.getCell(1, 1);
    title.value = companyName;
    title.font = { bold: true, size: 16, color: { argb: INK } };
    title.alignment = { vertical: "middle" };
    ws.getRow(1).height = 34;

    ws.mergeCells(2, 1, 2, colCount);
    const sub = ws.getCell(2, 1);
    sub.value = `${sheet.title || sheet.name || "Export"}  ·  Generated ${genStr} EAT`;
    sub.font = { size: 10, color: { argb: SLATE } };

    // The logo floats over the top-right of the header band.
    if (imageId != null) {
      ws.addImage(imageId, {
        tl: { col: Math.max(colCount - 2, 0), row: 0.08 },
        ext: { width: 150, height: 46 },
        editAs: "oneCell",
      });
    }

    // Header row.
    let r = TITLE_ROWS + 1;
    const hr = ws.getRow(r);
    header.forEach((h, i) => {
      const c = hr.getCell(i + 1);
      c.value = String(h == null ? "" : h);
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      c.alignment = { vertical: "middle" };
    });
    hr.height = 20;
    r++;

    // Data.
    for (const dr of dataRows) {
      const vr = ws.getRow(r);
      (Array.isArray(dr) ? dr : []).forEach((v, i) => {
        vr.getCell(i + 1).value = v == null ? "" : (typeof v === "object" ? String(v) : v);
      });
      r++;
    }

    // Column widths from content.
    for (let i = 1; i <= colCount; i++) {
      let max = String(header[i - 1] || "").length;
      for (const dr of dataRows) {
        const v = dr && dr[i - 1];
        const L = String(v == null ? "" : v).length;
        if (L > max) max = L;
      }
      ws.getColumn(i).width = Math.min(Math.max(max + 2, 10), 50);
    }

    ws.views = [{ state: "frozen", ySplit: TITLE_ROWS + 1 }];
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
