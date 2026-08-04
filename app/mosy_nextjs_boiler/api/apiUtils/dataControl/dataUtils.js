import { connectDB, activeDB } from './conn';
import path from 'path';
import { writeFile, mkdir, unlink } from 'fs/promises';
import fs from 'fs';

export async function mosySecureSelect({
  table,
  recordIdColumn=`record_id`,
  dictionary = {},
  searchParams = new URLSearchParams(),   //default
  authData,
  searchableColumns = null,
  defaultOrderColumn = "primkey",
  batchMutations = null   
}) {

  const RESERVED_PARAMS = new Set([
    "searchAny",
    "groupBy",
    "orderBy",
    "orderType",
    "pageNo",
    "pageSize"
  ]);

  // =============================
// 0️⃣ NORMALIZE searchParams
// =============================
if (!searchParams || !(searchParams instanceof URLSearchParams)) {
  searchParams = new URLSearchParams(searchParams || {});
}


  // =============================
  // 1️⃣ CONTROL PARAMS
  // =============================
  const searchAnyRaw = searchParams.get("searchAny");
  const groupByRaw = searchParams.get("groupBy");
  const orderByRaw = searchParams.get("orderBy");

  const pageSize = Math.min(parseInt(searchParams.get("pageSize")) || 20, 100);
  const pageNo = Math.max(parseInt(searchParams.get("pageNo")) || 1, 1);

  const orderType =
    searchParams.get("orderType")?.toUpperCase() === "ASC"
      ? "ASC"
      : "DESC";

  const whereParts = [];
  const values = [];

  // =============================
  // 2️⃣ SEARCH ANY (OR block)
  // =============================
  if (searchAnyRaw) {
    const searchAny = base64Decode(searchAnyRaw);

    const keysToSearch =
      searchableColumns && searchableColumns.length > 0
        ? searchableColumns
        : Object.keys(dictionary);

    const searchConditions = [];

    for (const key of keysToSearch) {
      if (!dictionary[key]) continue;

      searchConditions.push(`\`${dictionary[key]}\` LIKE ?`);
      values.push(`%${searchAny}%`);
    }

    if (searchConditions.length > 0) {
      whereParts.push(`(${searchConditions.join(" OR ")})`);
    }
  }

  // =============================
  // 3️⃣ COLUMN FILTERS (SAFE)
  // =============================
  for (const [rawKey, rawValue] of searchParams.entries()) {

    if (!rawValue) continue;
    if (RESERVED_PARAMS.has(rawKey)) continue;

    let operator = "=";
    let key = rawKey;

    if (rawKey.endsWith("_start")) {
      operator = ">=";
      key = rawKey.replace("_start", "");
    }
    else if (rawKey.endsWith("_end")) {
      operator = "<=";
      key = rawKey.replace("_end", "");
    }
    else if (rawKey.endsWith("_above")) {
      operator = ">";
      key = rawKey.replace("_above", "");
    }
    else if (rawKey.endsWith("_below")) {
      operator = "<";
      key = rawKey.replace("_below", "");
    }
    else if (rawKey.endsWith("_like")) {
      operator = "LIKE";
      key = rawKey.replace("_like", "");
    }    
    else if (rawKey.endsWith("_not")) {
      operator = "!=";
      key = rawKey.replace("_not", "");
    }

    if (!dictionary[key]) continue;

    const value = base64Decode(rawValue);

    if (operator === "LIKE") {
      whereParts.push(`\`${dictionary[key]}\` LIKE ?`);
      values.push(`%${value}%`);
    } else {
      whereParts.push(`\`${dictionary[key]}\` ${operator} ?`);
      values.push(value);
    }
  }

  // =============================
  // 4️⃣ TENANT ENFORCEMENT
  // =============================
  if (authData?.hive_site_id) {
    whereParts.push("`hive_site_id` = ?");
    values.push(authData.hive_site_id);
  }

  const whereClause =
    whereParts.length > 0
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";

  // =============================
  // 5️⃣ GROUPING (STRICT)
  // =============================
  let groupColumns = [];
  let groupByClause = "";

  if (groupByRaw) {
    const decodedGroup = base64Decode(groupByRaw);
    const requestedGroups = decodedGroup.split(",");

    for (const key of requestedGroups) {
      const trimmed = key.trim();
      if (dictionary[trimmed]) {
        groupColumns.push(`\`${dictionary[trimmed]}\``);
      }
    }

    if (groupColumns.length > 0) {
      groupByClause = `GROUP BY ${groupColumns.join(", ")}`;
    }
  }

  // =============================
  // 6️⃣ SELECT CLAUSE
  // =============================
  let selectClause;

  if (groupByClause) {
    selectClause = `${groupColumns.join(", ")}, COUNT(*) as total_count`;
  } else {
    selectClause = Object.values(dictionary)
      .map(col => `\`${col}\``)
      .join(", ");
  }

  // =============================
  // 7️⃣ ORDERING (SAFE)
  // =============================
  let orderColumn;

  if (groupByClause) {
    if (
      orderByRaw &&
      dictionary[orderByRaw] &&
      groupColumns.includes(`\`${dictionary[orderByRaw]}\``)
    ) {
      orderColumn = dictionary[orderByRaw];
    } else {
      orderColumn = groupColumns[0]?.replace(/`/g, "") || defaultOrderColumn;
    }
  } else {
    if (orderByRaw && dictionary[orderByRaw]) {
      orderColumn = dictionary[orderByRaw];
    } else {
      orderColumn = defaultOrderColumn;
    }
  }

  const orderClause = `ORDER BY \`${orderColumn}\` ${orderType}`;

  const conn = await connectDB();

  try {

    // =============================
    // 8️⃣ COUNT
    // =============================
    let totalRecords;

    if (groupByClause) {
      const countSql = `
        SELECT COUNT(*) as total FROM (
          SELECT 1
          FROM \`${activeDB}\`.\`${table}\`
          ${whereClause}
          ${groupByClause}
        ) grouped
      `;

      const [countRows] = await conn.execute(countSql, values);
      totalRecords = countRows[0]?.total || 0;

    } else {
      const countSql = `
        SELECT COUNT(*) AS total
        FROM \`${activeDB}\`.\`${table}\`
        ${whereClause}
      `;

      const [countRows] = await conn.execute(countSql, values);
      totalRecords = countRows[0]?.total || 0;
    }


    const safePageSize = Math.max(Number(pageSize) || 20, 1);
    
    const pageCount = Math.max(Math.ceil(totalRecords / safePageSize), 1);
    const safePageNo = Math.min(Math.max(Number(pageNo) || 1, 1), pageCount);
    const offset = (safePageNo - 1) * safePageSize;

    // =============================
    // 9️⃣ DATA QUERY
    // =============================
    const dataSql = `
      SELECT ${selectClause}
      FROM \`${activeDB}\`.\`${table}\`
      ${whereClause}
      ${groupByClause}
      ${orderClause}
      LIMIT ${offset}, ${safePageSize}
    `;

    console.log("dataSql", dataSql, values);

    const [rows] = await conn.execute(dataSql, values);

        
      // add row_count first
      const rowsWithCount = rows.map((row, index) => ({
        row_count: offset + index + 1,
        ...row
      }));

      let enrichedRows = rowsWithCount;

      if (!groupByClause) {
      // now enrich
       enrichedRows = await mosyEnrichFinalResponse({
        batchMutations,
        rows: rowsWithCount,
        authData,
        conn,
        recordIdColumn
      });
    }

    
    return {
      data: enrichedRows,
      pagination: {
        total_records: totalRecords,
        page_count: pageCount,
        current_page: safePageNo,
        page_size: pageSize,
        first_row: offset + 1,
        last_row: offset + rows.length,
        has_next: safePageNo < pageCount,
        has_prev: safePageNo > 1
      }
    };

  } finally {
    await conn.end();
  }
}



export async function mosySqlInsert(tbl, fieldsAndValuesJson, formBody, prefix="") {
  const conn = await connectDB();
  let magicColumns = [];
  let magicValues = [];
  
  let hive_site_id = null;
  let hive_site_name = null;
  
  for (let key in fieldsAndValuesJson) {
    const value = fieldsAndValuesJson[key];
  
    let finalValue = null;
  
    if (value === "?") {
      const formKey = `${prefix}${key}`;
      const formValue = formBody[formKey];
  
      if (formValue !== undefined) {
        magicColumns.push(`\`${key}\``);
        magicValues.push(formValue);
        finalValue = formValue;
      }
    } else {
      magicColumns.push(`\`${key}\``);
      magicValues.push(value);
      finalValue = value;
    }
  
    //AUTO-CAPTURE HIVE VALUES
    if (key === "hive_site_id") {
      hive_site_id = finalValue;
    }
  
    if (key === "hive_site_name") {
      hive_site_name = finalValue;
    }
  }

  const preparedCols = magicColumns.join(", ");
  const placeholders = magicValues.map(() => '?').join(", ");
  const query = `INSERT INTO \`${activeDB}\`.\`${tbl}\` (${preparedCols}) VALUES (${placeholders})`;

  //console.log(query, magicValues, tbl, fieldsAndValuesJson, formBody);

  try {
    const [result] = await conn.execute(query, magicValues);

    return { message: 'Record added successfully', record_id: result.insertId };

  } catch (err) {
    throw new Error(`Insert failed: ${err.message}`);
  } finally {
    await conn.end();
  }
}

export async function mosySqlUpdate(tbl, fieldsAndValuesJson, formBody, whereStr = "", prefix="") {
  const conn = await connectDB();

  if (!whereStr || whereStr.trim() === "") {
    throw new Error(`Unsafe update blocked: Missing WHERE clause while updating '${tbl}'`);
  }

  let updatePairs = [];
  let magicValues = [];
  let hive_site_id = null;
  let hive_site_name = null;

  for (let key in fieldsAndValuesJson) {
    const value = fieldsAndValuesJson[key];
    let finalValue = null;

    if (value === "?") {
      const formKey = `${prefix}${key}`;
      const formValue = formBody[formKey];

      if (formValue !== undefined) {
        updatePairs.push(`\`${key}\` = ?`);
        magicValues.push(formValue);
        finalValue = formValue;

      }
    } else {
      updatePairs.push(`\`${key}\` = ?`);
      magicValues.push(value);
      finalValue = value;

    }

      //AUTO-CAPTURE HIVE VALUES
      if (key === "hive_site_id") {
        hive_site_id = finalValue;
      }

      if (key === "hive_site_name") {
        hive_site_name = finalValue;
      }

  }

  const updateStr = updatePairs.join(", ");
  const whereClause = `WHERE ${whereStr}`;

  const query = `UPDATE \`${activeDB}\`.\`${tbl}\` SET ${updateStr} ${whereClause}`;

  //console.log(`update queriiieee ${query}`)

  try {

    await mosySafeAuditLog({
      table_name: tbl,
      where_str: whereStr,
      roll_type: "UPDATE"
    });

    const [result] = await conn.execute(query, magicValues);

    return {
      message: 'Record updated successfully',
      affectedRows: result.affectedRows,
    };
  } catch (err) {
    throw new Error(`Update failed: ${err.message}`);
  } finally {
    await conn.end();
  }
}

// Base64 encode in Node.js with error handling
export function base64Encode(str) {
  try {
    return Buffer.from(str).toString('base64');
  } catch (error) {
    console.error('Error encoding to Base64:', error.message);
    return "";
  }
}

// Base64 decode in Node.js with error handling
export function base64Decode(encodedStr) {
  try {
    return Buffer.from(encodedStr, 'base64').toString('utf-8');
  } catch (error) {
    console.error('Error decoding from Base64:', error.message);
    return "";
  }
}



export async function mosyUploadFile(fileObj, subDir = 'uploads/users') 
{
  try {
    // Base upload path inside your app folder (NOT public)
    //const baseUploadDir = path.join(process.cwd(), subDir);
    const baseUploadDir = path.join(process.cwd(), 'storage', subDir);

    // Ensure the folder exists
    if (!fs.existsSync(baseUploadDir)) {
      await mkdir(baseUploadDir, { recursive: true });
    }

    // Save the file
    const buffer = Buffer.from(await fileObj.arrayBuffer());
    const fileName = `${Date.now()}_${fileObj.name}`;
    const filePath = path.join(baseUploadDir, fileName);

    await writeFile(filePath, buffer);

    const relativePath =path.join(subDir, fileName);

    return `${subDir}/${fileName}`;  // ✅ proper URL/path

  } catch (err) {
    console.error('[UPLOAD ERROR]', err);
    throw new Error('File upload failed');
  }
}

export async function mosyDeleteFile(relativePath) {
  try {
    const fullPath = path.join(process.cwd(), 'storage', relativePath);

    await unlink(fullPath);

    console.log(`[DELETE] File deleted: ${relativePath}`);
    return true;
  } catch (err) {
    console.error(`[DELETE ERROR] Could not delete file: ${relativePath}`, err);
    throw new Error(`Failed to delete file: ${err.message}`);
  }
}



async function mosyMutateRow(row, mutations = {}, mutationClass) {
  const enrichedRow = { ...row };

  //console.log("mosyMutateRow mutationClass keys:", Object.keys(mutationClass));
  //console.log("mosyMutateRow functionCols keys:", Object.keys(mutations));

  for (const [key, argList] of Object.entries(mutations)) {
    try {
      const func = mutationClass[key];

      if (typeof func === 'function') {
        // Use enrichedRow in case earlier mutations added fields we need
        const result = await func(enrichedRow, ...(argList || []));
        enrichedRow[key] = result ?? ''; // Safe default
       /// console.log(`✅ Added mutation column "${key}":`, result);
      } else {
        enrichedRow[key] = ''; // Function missing
        console.warn(`⚠️ No mutation function found for "${key}". Key added as empty string.`);
      }

    } catch (err) {
      enrichedRow[key] = ''; // Error safety fallback
      console.error(`❌ Error running mutation for "${key}". Setting empty:`, err);
    }
  }

  return enrichedRow;
}



export async function mosySmartSelect(sql, mutations = {}, mutationClass, source="default") 
{
  
  //console.log("mosySmartSelect source ", source);
  //console.log("🔍 mutationClass keys:", Object.keys(mutationClass || {}));
  //console.log("🧩 mutations keys:", Object.keys(mutations || {}));

  const conn = await connectDB();
  
  try {
    const [rows] = await conn.execute(sql);

    const numberedRows = rows.map((row, index) => ({
      row_count: index + 1,
      ...row,
    }));

    // Apply mutations if provided
    if (mutations && mutationClass) {
      //console.log("under mutatioooooooooon", mutations)
      const enrichedRows = await Promise.all(
        numberedRows.map(row =>
          mosyMutateRow(row, mutations, mutationClass)
        )
      );
    //console.log("enrichedRows dlfklkklkdl", numberedRows)
      
      return enrichedRows;
    }
    
    //console.log("numberedRows row", numberedRows)

    return numberedRows;

  } finally {
    conn.end();
  }
}

// Pagination helper
export function mosyPaginate(totalRows, requestedPage, recordsPerPage) {
  const pageCount = Math.ceil(totalRows / recordsPerPage);
  const firstRow = (requestedPage - 1) * recordsPerPage;
  return [firstRow, pageCount];
}

// Main function with default-safe handling
export async function mosyFlexSelect(queryParams = {}, mutations = {}, mutationClass={}) {
  // Set default fallback values
  const defaultTbl = 'tablesample';
  const defaultPagination = 'j:default_page_no:15:1';
  const defaultColStr = 'Kg=='; // "*"
  const defaultWhereStr = '';

  const {
    tbl = defaultTbl,
    colstr = defaultColStr,
    q = defaultWhereStr,
    pagination = defaultPagination,
    function_cols = '',
    [pagination?.split(':')[1]]: pageToken = '1'
  } = queryParams;

  let sql = '';
  let dataLimit = 10;
  let finalResult = {};
  let loopOrRowType = 'l';
  let pageNumber = parseInt(pageToken) || 1;

  // Decode base64 and URI
  const decodedColStr = base64Decode(colstr || defaultColStr);
  const decodedWhereStr = (base64Decode(q || ''));

  //console.log("mosyFlexSelect mutationClass keys:", Object.keys(mutationClass));
  //console.log("mosyFlexSelect functionCols keys:", Object.keys(mutations));  
  //console.log("mosyFlexSelect where str keys:", decodedWhereStr);  
  
  // Handle pagination
  if (pagination && pagination.includes(':')) {
    const [type, token, limit, forcePage] = pagination.split(':');
    loopOrRowType = type || 'j';
    dataLimit = parseInt(limit) || 10;
    pageNumber = parseInt(forcePage || pageToken) || 1;

    const paginationSql = `SELECT ${decodedColStr} FROM \`${activeDB}\`.\`${tbl}\` ${decodedWhereStr}`;
    const totalRecords = await mosySmartSelect(paginationSql);
    const [firstRow, pageCount] = mosyPaginate(totalRecords.length, pageNumber, dataLimit);

    sql = `SELECT ${decodedColStr} FROM \`${activeDB}\`.\`${tbl}\` ${decodedWhereStr} LIMIT ${firstRow}, ${dataLimit}`;
    const pagedData = await mosySmartSelect(sql, mutations, mutationClass, "pagedData");

    finalResult = {
      data: pagedData,
      first_row: firstRow,
      page_count: pageCount,
      //query_string: sql,
      //pagination_sql: paginationSql
    };
  } else {
    sql = `SELECT ${decodedColStr} FROM \`${activeDB}\`.\`${tbl}\` ${decodedWhereStr}`;
    const results = await mosySmartSelect(sql, mutations, mutationClass, "nopageed_data ");
    finalResult = {
      data: results,
      first_row: '',
      page_count: '',
      //query_string: sql,
      //pagination_sql: ''
    };
  }

  return finalResult;
}


// ==========================================
// Helper: SUM query on a column with WHERE
// ==========================================
export async function mosySumRows(table, columnToSum, whereStr = '') {
  const sql = `SELECT SUM(${columnToSum}) AS total FROM \`${activeDB}\`.\`${table}\` ${whereStr}`;
  const results = await mosySmartSelect(sql);
  return results[0]?.total ?? 0;
}

// ==========================================
// Helper: COUNT records in a table with WHERE
// ==========================================
export async function mosyCountRows(table, whereStr = '') {
  const sql = `SELECT COUNT(*) AS total FROM \`${activeDB}\`.\`${table}\` ${whereStr}`;
  
  const results = await mosySmartSelect(sql);
  //console.log(`mosyCountRows ${sql}` , results)

  return results[0]?.total ?? 0;
}

// ==========================================
// Helper: Get one record by column = value
// ==========================================
export async function mosyQddata(table, column, value) {
  const sql = `SELECT * FROM \`${activeDB}\`.\`${table}\` WHERE \`${column}\` = '${value}' LIMIT 1`;
  const results = await mosySmartSelect(sql);
  //console.log("mosyQddata results ", results)
  //console.log("mosyQddata sql ", sql)
    
  return results[0] || null;
}

// ==========================================
// Helper: Flexible select with where/group/order
// ==========================================
export async function mosyQuickSel(table, whereStr = '', returnType = 'l') {
  const sql = `SELECT * FROM \`${activeDB}\`.\`${table}\` ${whereStr}`;
  const results = await mosySmartSelect(sql);

  if (returnType === 'r') {
    return results[0] || null;
  }
  return results;
}

export async function mosyFlexQuickSel(table, cols="*", whereStr = '', returnType = 'l') {
  const sql = `SELECT ${cols} FROM \`${activeDB}\`.\`${table}\` ${whereStr}`;

  //console.log(`quick sel sql: ${sql}`)

  const results = await mosySmartSelect(sql);

  if (returnType === 'r') {
    return results[0] || null;
  }
  return results;
}

export async function mosySqlDelete(table, whereStr) {
  try {
    
    const conn = await connectDB();
    const sql = `DELETE FROM \`${activeDB}\`.\`${table}\` ${whereStr}`;
      
    // fire-and-forget
      await mosySafeAuditLog({
        table_name: table,
        where_str: `${whereStr}`,
        roll_type: "DELETE"
      });

    const [result] = await conn.execute(sql);
    return { status: 'success', affectedRows: result.affectedRows };
  } catch (error) {
    console.error("❌ Delete error:", error.message);
    return { status: 'error', message: error.message };
  }
}


export function mmres(str) {
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


export function BuildFilterQuery(cols = [], keyword = "") {
  const term = keyword.trim();
  if (!term) return "";

  const escaped = mmres(term);
  const conditions = cols.map((col) => `${col} LIKE '%${escaped}%'`);
  return `(${conditions.join(" OR ")})`;
}

export function toNum(value, decimalPlaces = 0) {
  if (isNaN(value)) return '0';

  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
}


// ------------------------- begin generateRandomStr -------- //

export function magicRandomStr(length=10) {
  const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randomString = '';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    randomString += characters[randomIndex];
  }

  return randomString;
}

// ------------------------- end generateRandomStr -------- //

export function mosyNl2br(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/(?:\r\n|\r|\n)/g, '<br>');
}

export function mosyFormartDate(dateInput, format = 'dmy') {
  if (!dateInput) return '';

  const date = new Date(dateInput);
  if (isNaN(date)) return 'Invalid date';

  const day = date.getDate();
  const dayPadded = String(day).padStart(2, '0');
  const month = date.getMonth();
  const monthPadded = String(month + 1).padStart(2, '0');
  const year = date.getFullYear();
  const shortYear = String(year).slice(-2);
  const dayName = date.toLocaleString('en-US', { weekday: 'long' });
  const monthName = date.toLocaleString('en-US', { month: 'long' });
  const shortMonth = date.toLocaleString('en-US', { month: 'short' });

  const suffix = getOrdinalSuffix(day);

  switch (format.toLowerCase()) {
    case 'dmy':
      return `${dayPadded}/${monthPadded}/${year}`;
    case 'ymd':
      return `${year}-${monthPadded}-${dayPadded}`;
    case 'mdy':
      return `${monthPadded}/${dayPadded}/${year}`;
    case 'short':
      return `${dayPadded} ${shortMonth} ${year}`;
    case 'dot':
      return `${dayPadded}.${monthPadded}.${shortYear}`;
    case 'verbose':
      return `${dayName}, ${day}${suffix} ${monthName} ${year}`;
    case 'short-ordinal':
      return `${day}${suffix} ${shortMonth} ${year}`;
    default:
      return date.toDateString();
  }
}

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function mosyToday() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // "YYYY-MM-DD"
}


export function mosyRightNow() {
  const now = new Date();
  const nairobi = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const year = nairobi.getUTCFullYear();
  const month = String(nairobi.getUTCMonth() + 1).padStart(2, '0');
  const day = String(nairobi.getUTCDate()).padStart(2, '0');
  const hour = String(nairobi.getUTCHours()).padStart(2, '0');
  const minute = String(nairobi.getUTCMinutes()).padStart(2, '0');
  const second = String(nairobi.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

//==================================================== new secure row enrichment

export async function mosySecureSum({
  key,
  config,
  rows,
  enrichedMap,
  authData,
  conn,
  recordIdColumn
}) {

  //console.log(`💰 mosySecureSum START: ${key}`);

  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("⚠️ mosySecureSum: No rows supplied.");
    return;
  }

  if (!config?.table || !config?.column || !config?.link) {
    console.error("❌ mosySecureSum: Invalid config", config);
    return;
  }

  const linkParts = config.link.split(":");
  if (linkParts.length !== 2) {
    console.error("❌ mosySecureSum: Invalid link format", config.link);
    return;
  }

  const [childColumn, parentColumn] = linkParts;

  // 🔥 Extract parent values dynamically
  const parentValues = [
    ...new Set(
      rows
        .map(r => r?.[parentColumn])
        .filter(v => v !== undefined && v !== null && v !== "")
    )
  ];

  ///console.log("🔎 Extracted parentValues:", parentValues);

  if (parentValues.length === 0) {

    //console.warn(`⚠️ No valid parent values for ${parentColumn}`);

    // Normalize all parents to 0
    for (const row of rows) {
      
      const parentRecordId = row[recordIdColumn];
      if (!enrichedMap[parentRecordId])
        enrichedMap[parentRecordId] = {};
      enrichedMap[parentRecordId][key] = 0;
    }

    return;
  }

  const placeholders = parentValues.map(() => "?").join(",");

  let whereParts = [`\`${childColumn}\` IN (${placeholders})`];
  let values = [...parentValues];

  // Optional filters
  if (config.where) {
    for (const rawKey in config.where) {

      let operator = "=";
      let column = rawKey;

      if (rawKey.endsWith("<")) {
        operator = "<";
        column = rawKey.slice(0, -1);
      }
      else if (rawKey.endsWith(">")) {
        operator = ">";
        column = rawKey.slice(0, -1);
      }

      whereParts.push(`\`${column}\` ${operator} ?`);
      values.push(config.where[rawKey]);
    }
  }

  // Tenant enforcement
  if (authData?.hive_site_id) {
    whereParts.push("`hive_site_id` = ?");
    values.push(authData.hive_site_id);
  }

  const sql = `
    SELECT \`${childColumn}\` as ref_id,
           SUM(\`${config.column}\`) as total
    FROM \`${activeDB}\`.\`${config.table}\`
    WHERE ${whereParts.join(" AND ")}
    GROUP BY \`${childColumn}\`
  `;

  const placeholderCount = (sql.match(/\?/g) || []).length;

  //console.log("🧾 SQL:", sql.trim());
  //console.log("📊 Placeholder count:", placeholderCount);
  //console.log("📊 Values count:", values.length);

  if (placeholderCount !== values.length) {
    console.error("❌ mosySecureSum: Placeholder mismatch");
    console.error("SQL:", sql);
    console.error("Values:", values);
    return;
  }

  let results = [];

  try {
    results = await mosyBatchSelect({
      sql,
      values,
      conn
    });

    //console.log(`✅ mosySecureSum fetched ${results.length} rows`);
  }
  catch (err) {
    console.error("❌ mosySecureSum DB error:", err);
    throw err;
  }

  const resultMap = {};
  for (const row of results) {
    resultMap[row.ref_id] = row.total ?? 0;
  }

  // Attach back to enrichedMap
  for (const row of rows) {

    const parentRecordId = row[recordIdColumn];
    const lookupValue    = row[parentColumn];

    if (!enrichedMap[parentRecordId])
      enrichedMap[parentRecordId] = {};

    enrichedMap[parentRecordId][key] =
      resultMap[lookupValue] ?? 0;
  }

 // console.log(`💰 mosySecureSum END: ${key}`);
}

export async function mosySecureMini({
  key,
  config,
  rows,
  enrichedMap,
  authData,
  conn,
  recordIdColumn
}) {

  if (!rows || rows.length === 0) {
    console.log("⚠️ mosySecureMini: No rows supplied.");
    return;
  }

  if (!config?.table || !config?.link || !config?.columns) {
    console.error("❌ mosySecureMini: Invalid config", config);
    return;
  }

  const linkParts = config.link.split(":");
  if (linkParts.length !== 2) {
    console.error("❌ mosySecureMini: Invalid link format", config.link);
    return;
  }

  const [childColumn, parentColumn] = linkParts;

  //  Extract parent values dynamically
  const parentValues = [
    ...new Set(
      rows
        .map(r => r[parentColumn])
        .filter(v => v !== undefined && v !== null)
    )
  ];

  if (parentValues.length === 0) {
    console.log("⚠️ mosySecureMini: No parent values found for", parentColumn);
    return;
  }

  const placeholders = parentValues.map(() => "?").join(",");

  let whereParts = [`\`${childColumn}\` IN (${placeholders})`];
  let values = [...parentValues];

  // extra conditions
  if (config.where) {
    for (const rawKey in config.where) {

      let operator = "=";
      let column = rawKey;

      if (rawKey.endsWith("<")) {
        operator = "<";
        column = rawKey.slice(0, -1);
      }
      else if (rawKey.endsWith(">")) {
        operator = ">";
        column = rawKey.slice(0, -1);
      }

      whereParts.push(`\`${column}\` ${operator} ?`);
      values.push(config.where[rawKey]);
    }
  }

  // tenant enforcement
  if (authData?.hive_site_id) {
    whereParts.push("`hive_site_id` = ?");
    values.push(authData.hive_site_id);
  }

  // order handling
  const orderCol = config.order?.split(":")[0] || "primkey";
  const orderType = config.order?.split(":")[1] || "DESC";

  const sql = `
    SELECT \`${childColumn}\`, ${config.columns}
    FROM \`${activeDB}\`.\`${config.table}\`
    WHERE ${whereParts.join(" AND ")}
    ORDER BY \`${orderCol}\` ${orderType}
  `;

  const placeholderCount = (sql.match(/\?/g) || []).length;
  if (placeholderCount !== values.length) {
    console.error("❌ mosySecureMini: Placeholder mismatch");
    console.error("SQL:", sql);
    console.error("Values:", values);
    return;
  }

  const results = await mosyBatchSelect({
    sql,
    values,
    conn
  });

  // Build grouped results
  const grouped = {};

  for (const row of results) {

    const refValue = row[childColumn];

    if (!grouped[refValue])
      grouped[refValue] = [];

    const limit = config.limit ?? Infinity;

    if (grouped[refValue].length < limit) {

      grouped[refValue].push({
        row_count: grouped[refValue].length + 1,
        ...row
      });
    }
  }

  // Attach back to enrichedMap
  for (const parentRow of rows) {

    const parentRecordId = parentRow[recordIdColumn];
    const lookupValue    = parentRow[parentColumn];

    if (!enrichedMap[parentRecordId])
      enrichedMap[parentRecordId] = {};

    enrichedMap[parentRecordId][key] =
      grouped[lookupValue] ?? [];
  }
}


export async function mosySecureJoin({
  key,
  config,
  parentRows,
  enrichedMap,
  authData,
  conn,
  recordIdColumn
}) {

  //console.log("🧩 mosySecureJoin START:", key);

  if (!parentRows || parentRows.length === 0) {
    console.log("⚠️ No parentRows supplied.");
    return;
  }

  if (!config?.table || !config?.link || !config?.select) {
    console.error("❌ Invalid join config:", config);
    throw new Error("mosySecureJoin: Invalid config supplied.");
  }

  const linkParts = config.link.split(":");
  if (linkParts.length !== 2) {
    console.error("❌ Invalid link format:", config.link);
    throw new Error("mosySecureJoin: link must be parentColumn:childColumn");
  }

  const parentColumn = linkParts[0];
  const childColumn  = linkParts[1];

  // console.log("🔗 Join Mapping:", {
  //   parentColumn,
  //   childColumn,
  //   table: config.table
  // });

  // Extract values from parent rows
  const parentValues = [
    ...new Set(
      parentRows
        .map(row => row[parentColumn])
        .filter(v => v !== undefined && v !== null && v !== "")
    )
  ];

  //console.log("📦 Extracted parentValues:", parentValues);

  if (parentValues.length === 0) {
    console.warn("⚠️ No valid parent values found for column:", parentColumn);
    return;
  }

  const placeholders = parentValues.map(() => "?").join(",");

  let whereParts = [`\`${childColumn}\` IN (${placeholders})`];
  let values = [...parentValues];

  if (authData?.hive_site_id) {
    whereParts.push("`hive_site_id` = ?");
    values.push(authData.hive_site_id);
  }

  const selectParts = [`\`${childColumn}\` as ref_id`];

  for (const alias in config.select) {
    const column = config.select[alias];

    if (!column) {
      console.warn("⚠️ Empty column in select config:", alias);
      continue;
    }

    selectParts.push(`\`${column}\` as \`${alias}\``);
  }

  const sql = `
    SELECT ${selectParts.join(", ")}
    FROM \`${activeDB}\`.\`${config.table}\`
    WHERE ${whereParts.join(" AND ")}
  `;

  const placeholderCount = (sql.match(/\?/g) || []).length;

  //console.log("🧾 SQL Preview:", sql.trim());
  //console.log("🧮 Placeholder Count:", placeholderCount);
  //console.log("📊 Values Count:", values.length);
  //console.log("📊 Values:", values);

  if (placeholderCount !== values.length) {
    console.error("❌ Placeholder mismatch detected!");
    throw new Error("mosySecureJoin: SQL placeholder mismatch.");
  }

  let results = [];

  try {
    results = await mosyBatchSelect({
      sql,
      values,
      conn
    });

    //console.log(`✅ Join fetched ${results.length} rows`);
  }
  catch (err) {
    console.error("❌ mosyBatchSelect failed:", err);
    console.error("SQL:", sql);
    console.error("Values:", values);
    throw err; // rethrow so upstream sees it
  }

  // Build lookup map
  const resultMap = {};
  for (const row of results) {
    resultMap[row.ref_id] = row;
  }

  // Map back to enrichedMap
  for (const parentRow of parentRows) {

    const parentRecordId = parentRow[recordIdColumn];
    const lookupValue    = parentRow[parentColumn];

    if (!enrichedMap[parentRecordId])
      enrichedMap[parentRecordId] = {};

    const match = resultMap[lookupValue];

    for (const alias in config.select) {
      enrichedMap[parentRecordId][alias] =
        match ? (match[alias] ?? null) : null;
    }
  }

 // console.log("🧩 mosySecureJoin END:", key);
}


export function mosySecureCompute({
  key,
  config,
  rows,
  enrichedMap,
  recordIdColumn
}) {

  for (const row of rows) {

    const recordId = row[recordIdColumn];

    const context = {
      ...row,
      ...(enrichedMap[recordId] || {})
    };

    let expression = config.expr;

    // replace tokens safely
    for (const token in context) {
      expression = expression.replaceAll(
        token,
        context[token] ?? 0
      );
    }

    let value = 0;

    try {
      value = Function(`"use strict"; return (${expression})`)();
    } catch {
      value = 0;
    }

    if (!enrichedMap[recordId])
      enrichedMap[recordId] = {};

    enrichedMap[recordId][key] = value;
  }
}

export async function mosySecureCount({
  key,
  config,
  rows,
  enrichedMap,
  authData,
  conn,
  recordIdColumn
}) {

  //console.log(`🧮 mosySecureCount START: ${key}`, rows);

  if (!Array.isArray(rows) || rows.length === 0) {
    console.warn("⚠️ mosySecureCount: No rows supplied.");
    return;
  }

  if (!config?.table || !config?.link) {
    console.error("❌ mosySecureCount: Invalid config", config);
    return;
  }

  const linkParts = config.link.split(":");
  if (linkParts.length !== 2) {
    console.error("❌ mosySecureCount: Invalid link format", config.link);
    return;
  }

  const [childColumn, parentColumn] = linkParts;

  if (!childColumn || !parentColumn) {
    console.error("❌ mosySecureCount: Empty link parts", config.link);
    return;
  }

  // 🔥 Extract unique parent values safely
  const parentValues = [
    ...new Set(
      rows
        .map(r => r?.[parentColumn])
        .filter(v => v !== undefined && v !== null && v !== "")
    )
  ];

  console.log("🔎 Extracted parentValues:", parentValues);

  if (parentValues.length === 0) {
    console.warn(`⚠️ No valid parent values found for ${parentColumn}`);

    // Still normalize output to 0
    for (const row of rows) {
      const parentRecordId = row[recordIdColumn];
      if (!enrichedMap[parentRecordId])
        enrichedMap[parentRecordId] = {};
      enrichedMap[parentRecordId][key] = 0;
    }

    return;
  }

  const placeholders = parentValues.map(() => "?").join(",");

  let whereParts = [`\`${childColumn}\` IN (${placeholders})`];
  let values = [...parentValues];

  // optional filters
  if (config.where) {
    for (const rawKey in config.where) {

      let operator = "=";
      let column = rawKey;

      if (rawKey.endsWith("<")) {
        operator = "<";
        column = rawKey.slice(0, -1);
      }
      else if (rawKey.endsWith(">")) {
        operator = ">";
        column = rawKey.slice(0, -1);
      }

      whereParts.push(`\`${column}\` ${operator} ?`);
      values.push(config.where[rawKey]);
    }
  }

  // tenant enforcement
  if (authData?.hive_site_id) {
    whereParts.push("`hive_site_id` = ?");
    values.push(authData.hive_site_id);
  }

  const sql = `
    SELECT \`${childColumn}\` as ref_id,
           COUNT(*) as total
    FROM \`${activeDB}\`.\`${config.table}\`
    WHERE ${whereParts.join(" AND ")}
    GROUP BY \`${childColumn}\`
  `;

  const placeholderCount = (sql.match(/\?/g) || []).length;

  console.log("🧾 SQL:", sql.trim());
  console.log("📊 Placeholder count:", placeholderCount);
  console.log("📊 Values count:", values.length);

  if (placeholderCount !== values.length) {
    console.error("❌ mosySecureCount: Placeholder mismatch");
    console.error("SQL:", sql);
    console.error("Values:", values);
    return;
  }

  let results = [];

  try {
    results = await mosyBatchSelect({
      sql,
      values,
      conn
    });

    console.log(`✅ mosySecureCount fetched ${results.length} rows`);
  }
  catch (err) {
    console.error("❌ mosySecureCount DB error:", err);
    throw err;
  }

  const resultMap = {};
  for (const row of results) {
    resultMap[row.ref_id] = row.total ?? 0;
  }

  // Attach results back to parent rows
  for (const row of rows) {

    const parentRecordId = row[recordIdColumn];
    const lookupValue    = row[parentColumn];

    if (!enrichedMap[parentRecordId])
      enrichedMap[parentRecordId] = {};

    enrichedMap[parentRecordId][key] =
      resultMap[lookupValue] ?? 0;
  }

  console.log(`🧮 mosySecureCount END: ${key}`);
}

export async function mosySecureCountFlags({
  key,
  config,
  rows,
  enrichedMap,
  authData,
  conn,
  recordIdColumn
}) {

  /*
  |--------------------------------------------------------------------------
  | Validate
  |--------------------------------------------------------------------------
  */

  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }


  if (
    !config?.table ||
    !config?.link ||
    !Array.isArray(config?.columns) ||
    config.columns.length === 0
  ) {

    console.error(
      "mosySecureCountFlags: Invalid config",
      config
    );

    return;

  }


  /*
  |--------------------------------------------------------------------------
  | Link
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | role_id:record_id
  |
  | childColumn  = role_id
  | parentColumn = record_id
  |
  */

  const linkParts =
    config.link.split(":");


  if (linkParts.length !== 2) {

    console.error(
      "mosySecureCountFlags: Invalid link",
      config.link
    );

    return;

  }


  const [
    childColumn,
    parentColumn
  ] = linkParts;


  /*
  |--------------------------------------------------------------------------
  | Parent values
  |--------------------------------------------------------------------------
  */

  const parentValues = [

    ...new Set(

      rows
        .map(
          row =>
            row?.[parentColumn]
        )
        .filter(
          value =>
            value !== undefined &&
            value !== null &&
            value !== ""
        )

    )

  ];


  /*
  |--------------------------------------------------------------------------
  | Default everything to zero
  |--------------------------------------------------------------------------
  */

  if (parentValues.length === 0) {

    for (const row of rows) {

      const parentRecordId =
        row[recordIdColumn];


      if (!enrichedMap[parentRecordId]) {

        enrichedMap[parentRecordId] = {};

      }


      enrichedMap[parentRecordId][key] = 0;

    }


    return;

  }


  /*
  |--------------------------------------------------------------------------
  | Build placeholders
  |--------------------------------------------------------------------------
  */

  const placeholders =
    parentValues
      .map(() => "?")
      .join(",");


  const whereParts = [

    `\`${childColumn}\` IN (${placeholders})`

  ];


  const values = [
    ...parentValues
  ];


  /*
  |--------------------------------------------------------------------------
  | Tenant enforcement
  |--------------------------------------------------------------------------
  */

  if (authData?.hive_site_id) {

    whereParts.push(
      "`hive_site_id` = ?"
    );


    values.push(
      authData.hive_site_id
    );

  }


  /*
  |--------------------------------------------------------------------------
  | Build permission expression
  |--------------------------------------------------------------------------
  |
  | Generates:
  |
  | COALESCE(can_view,0)
  | + COALESCE(can_add,0)
  | + COALESCE(can_edit,0)
  | ...
  |
  */

  const permissionExpression =
    config.columns
      .map(
        column =>
          `COALESCE(\`${column}\`, 0)`
      )
      .join(" + ");


  /*
  |--------------------------------------------------------------------------
  | Query
  |--------------------------------------------------------------------------
  |
  | SUM() adds the enabled flags across ALL module rows belonging
  | to the role.
  |
  */

  const sql = `

    SELECT

      \`${childColumn}\` AS ref_id,

      SUM(
        ${permissionExpression}
      ) AS total

    FROM
      \`${activeDB}\`.\`${config.table}\`

    WHERE
      ${whereParts.join(" AND ")}

    GROUP BY
      \`${childColumn}\`

  `;


  /*
  |--------------------------------------------------------------------------
  | Execute
  |--------------------------------------------------------------------------
  */

  const results =
    await mosyBatchSelect({
      sql,
      values,
      conn
    });


  /*
  |--------------------------------------------------------------------------
  | Lookup map
  |--------------------------------------------------------------------------
  */

  const resultMap = {};


  for (const result of results) {

    resultMap[
      result.ref_id
    ] =
      Number(result.total) || 0;

  }


  /*
  |--------------------------------------------------------------------------
  | Attach to parent rows
  |--------------------------------------------------------------------------
  */

  for (const row of rows) {

    const parentRecordId =
      row[recordIdColumn];


    const lookupValue =
      row[parentColumn];


    if (!enrichedMap[parentRecordId]) {

      enrichedMap[parentRecordId] = {};

    }


    enrichedMap[parentRecordId][key] =
      resultMap[lookupValue] ?? 0;

  }

}

export async function mosyEnrichFinalResponse({
  batchMutations,
  rows,
  authData,
  conn,
  recordIdColumn
}) {

 // console.log(`🧩 batchMutations keys: recordIdColumn  ${recordIdColumn}`, Object.keys(batchMutations));

  if (!batchMutations || rows.length === 0)
    return rows;

  const enrichedMap = {};

  for (const key of Object.keys(batchMutations)) {
    //console.log("🧩 const key of Object.keys(batchMutations)  keys:", batchMutations, "rowss... ", rows);

    const config = batchMutations[key];

    switch (config.type) {

      case "sum":
        await mosySecureSum({
          key,
          config,
          rows,
          enrichedMap,
          authData,
          conn,
          recordIdColumn
        });
        break;

      case "mini":
        await mosySecureMini({
          key,
          config,
          rows,
          enrichedMap,
          authData,
          conn,
          recordIdColumn
        });
        break;

      case "compute":
        mosySecureCompute({
          key,
          config,
          rows,
          enrichedMap,
          recordIdColumn
        });
        break;

      case "count":
        await mosySecureCount({
          key,
          config,
          rows,
          enrichedMap,
          authData,
          conn,
          recordIdColumn
        });
        break;

      case "count_flags":
        await mosySecureCountFlags({
          key,
          config,
          rows,
          enrichedMap,
          authData,
          conn,
          recordIdColumn
        });      
        break;

      case "join":
        await mosySecureJoin({
          key,
          config,
          parentRows:rows,
          enrichedMap,
          authData,
          conn,
          recordIdColumn
        });
        break;

      default:
        console.warn("⚠️ Unknown mutation type:", config.type);
    }
  }

  return rows.map(function(row) 
  {
    return {
      ...row,
      ...(enrichedMap[row[recordIdColumn]] || {})
    };
  });

}

export async function mosyBatchSelect({
  sql,
  values = [],
  conn
}) {

  if (!conn) {
    throw new Error("mosyBatchSelect requires an active DB connection");
  }

  const [rows] = await conn.execute(sql, values);

 // console.log(`✅ mosyBatchSelect: ${sql} ${rows.length} rows fetched`, rows, values);
  
  return rows;
}


export function processImport(csvData, colsArray) {
  if (!Array.isArray(csvData) || csvData.length === 0) return [];
  if (!Array.isArray(colsArray) || colsArray.length === 0) return [];

  return csvData.map((row) => {
    const record = {};
    colsArray.forEach((col) => {
      record[col] = row[col] ?? "";
    });

    return record;

  });
}

export async function mosySafeAuditLog({
  table_name,
  where_str,
  roll_type 
}) {
  const conn = await connectDB();

  try {
    let rows = [];

    let hive_site_id = null;
    let hive_site_name = null;
    let whereStrOperation ="WHERE"
    if(roll_type=="DELETE"){
      whereStrOperation=''
    }
    // Fetch OLD data
    if (roll_type === "UPDATE" || roll_type === "DELETE") {
      const query = `SELECT * FROM ${table_name} ${whereStrOperation} ${where_str}`;
      const [result] = await conn.query(query);
      rows = result;

      // AUTO-EXTRACT HIVE FROM DATA
      if (rows.length > 0) {
        const firstRow = rows[0];

        if ("hive_site_id" in firstRow) {
          hive_site_id = firstRow.hive_site_id ?? null;
        }

        if ("hive_site_name" in firstRow) {
          hive_site_name = firstRow.hive_site_name ?? null;
        }
      }
    }

    // Unique rollback key
    const roll_bk_key = `rbk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const roll_timestamp = new Date();

    // Insert audit
    const insertQuery = `
      INSERT INTO mosy_sql_roll_back 
      (roll_bk_key, table_name, roll_type, where_str, roll_timestamp, value_entries, hive_site_id, hive_site_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await conn.execute(insertQuery, [
      roll_bk_key,
      table_name,
      roll_type,
      where_str,
      roll_timestamp,
      JSON.stringify(rows),
      hive_site_id,
      hive_site_name
    ]);

    return {
      success: true,
      roll_bk_key,
      affected_rows: rows.length
    };

  } catch (err) {
    console.error("Audit Log Error:", err);
    return { success: false, error: err.message };
  } finally {
    conn.end(); // if using pool
  }
}