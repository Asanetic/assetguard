import MosyColumnFactory from "./MosyColumnFactory";
import {deleteUrlParam, mosyAtob, mosyBtoa, mosyUpdateUrlParam} from '../../MosyUtils/hiveUtils';

export function MosyWhereBuilder(cols = [], keyword = "") {
  const term = keyword.trim();
  if (!term) return "";

  const escaped = ClientMMres(term);
  const conditions = cols.map((col) => `${col} LIKE '%${escaped}%'`);
  return `(${conditions.join(" OR ")})`;
}

export function ClientMMres(str) {
  if (typeof str !== 'string') return str;

  return str
    .replace(/\\/g, '\\\\')   // Escape backslashes
    .replace(/\0/g, '\\0')     // Null byte
    .replace(/\n/g, '\\n')     // Newline
    .replace(/\r/g, '\\r')     // Carriage return
    .replace(/'/g, "\\'")      // Single quotes
    .replace(/"/g, '\\"')      // Double quotes
    .replace(/\x1a/g, '\\Z');  // Substitute char (Ctrl+Z)
}

export function MosyFilterEngine(tableName, full = false, passedParams = null) {

  let queryParams = passedParams;

  // Auto-fetch from URL if not passed (only in browser)
  if (!queryParams && typeof window !== "undefined") {
    const urlSearch = new URLSearchParams(window.location.search);
    queryParams = {};
    for (const [key, value] of urlSearch.entries()) {
      queryParams[key] = value;
    }
  }

  if (!queryParams) return ""; // SSR-safe fallback

  const colFilterKey = `${tableName}_mosyfilter`;
  const smartFilterKey = `q${tableName}`;

  const colFilterEncoded = queryParams[colFilterKey];
  const smartFilterEncoded = queryParams[smartFilterKey];

  const colFilterDecoded = mosyAtob(colFilterEncoded || "");
  const smartFilterDecoded = mosyAtob(smartFilterEncoded || "");

  const columns = MosyColumnFactory[tableName] || [];
  const smartQuery = MosyWhereBuilder(columns, smartFilterDecoded);

  let finalQuery = "";

  if (colFilterDecoded && !smartFilterDecoded) {
    finalQuery = colFilterDecoded;
  } else if (!colFilterDecoded && smartFilterDecoded) {
    finalQuery = smartQuery;
  } else if (colFilterDecoded && smartFilterDecoded) {
    finalQuery = `(${smartQuery}) AND (${colFilterDecoded})`;
  }

  if (finalQuery && full) {
    return `WHERE ${finalQuery}`;
  }

  //console.log(`MosyFilterEngine ${finalQuery}`)
  return finalQuery;
}

export function MosySecureFilterEngine(tableName, passedParams = null) {

  let queryParams = passedParams;

  // 1️⃣ Auto-fetch from URL if nothing passed
  if (!queryParams && typeof window !== "undefined") {
    const urlSearch = new URLSearchParams(window.location.search);
    queryParams = Object.fromEntries(urlSearch.entries());
  }

  if (!queryParams || Object.keys(queryParams).length === 0) {
    return {};
  }

  const colFilterKey = `${tableName}_mosyfilter`;
  const smartFilterKey = `q${tableName}`;

  const colFilterEncoded = queryParams[colFilterKey];
  const smartFilterEncoded = queryParams[smartFilterKey];

  let finalParams = {};

  // 2️⃣ Smart search (already encoded)
  if (smartFilterEncoded) {
    finalParams.searchAny = smartFilterEncoded;
  }

  // 3️⃣ Column filter (decode safely)
  if (colFilterEncoded) {
    try {
      const decoded = mosyAtob(colFilterEncoded);
      const filterParams = new URLSearchParams(decoded);

      for (const [key, value] of filterParams.entries()) {
        finalParams[key] = value;
      }
    } catch (err) {
      console.warn("Invalid filter encoding", err);
    }
  }

  // 4️⃣ Merge any additional custom params safely
  for (const key in queryParams) {
    if (!key.startsWith(`q${tableName}`) && key !== colFilterKey) {
      finalParams[key] = queryParams[key];
    }
  }

  console.log("🧩 MosySecureFilterEngine", finalParams);
  return finalParams;
}



export function mosyFilterUrl({tableName, qstr="", keyword="", parentUrl="", reload=true})
{
  if(qstr!=""){
   mosyUpdateUrlParam(`${tableName}_mosyfilter`, btoa(qstr))
   deleteUrlParam(`q${tableName}`)
  }

  if(keyword!=""){
    mosyUpdateUrlParam(`q${tableName}`, btoa(keyword))

  }

  if(reload){
   window.location.reload()
  }
}
