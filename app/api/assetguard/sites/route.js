// This file NEVER needs manual edits. It's built entirely from schema.js,
// using your existing secure DB utils (auth, role checks, tenant scoping,
// parameterized queries) — same utils DisbursementsRequestHandler.jsx uses.
// Clone the module, edit schema.js, this file just works.

import {
  base64Decode,
  magicRandomStr,
  mosySecureSelect,
  mosySqlInsert,
  mosySqlUpdate,
  mosySqlDelete,
  mosyUploadFile,
  mosyDeleteFile,
  mosyQddata,
} from '../../apiUtils/dataControl/dataUtils';

import { mutateInputArray } from '../beMonitor';
import { validateRoleAccess } from '../validateRoleAccess';
import { processAuthToken } from '../../auth/authManager';
import { SitesSchema as schema } from './schema';

// schema.fields[0] and [1] are always the system PK columns (primkey, record_id)
// — see db-cli.js. Resolve them here instead of hardcoding the column names,
// so this file stays correct even if a table's PK columns are ever renamed.
const primkeyCol = schema.fields[0]?.key || 'primkey';
const recordIdCol = schema.fields[1]?.key || 'record_id';

// Converts a snake_case DB column name into the camelCase name the public
// API/URL uses, e.g. "regist_date_user" -> "registDateUser".
function toCamelCase(str) {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

// Auto-built from schema.fields — no per-module dictionary to maintain.
// Keys are the camelCase names the GET URL's searchParams use; values are
// the real snake_case DB column names. "Node"/"NodeId"/"recordId" are the
// standard Mosy system aliases every table has. Computed fields (e.g.
// row_count) aren't real DB columns, so they're left out of the dictionary
// entirely — only "system" fields (real PK columns) and normal fields are
// included.
const columnDictionary = {
  Node: primkeyCol,
  NodeId: recordIdCol,
  recordId: recordIdCol,
  ...Object.fromEntries(
    schema.fields.filter((f) => !f.computed).map((f) => [toCamelCase(f.key), f.key])
  ),
};

// Auto-built insertable/updatable columns — every real, writable field, plus timestamps.
// Keyed by the real DB column name (not camelCase) since this feeds straight
// into the SQL bind array via mutateInputArray, which matches the request
// body against these same snake_case keys. System fields (primkey, record_id)
// and computed fields (row_count) are excluded: primkey is auto-increment,
// record_id is generated in code below, and computed fields don't exist in
// the DB at all.
function buildInputsArr() {
  const arr = {};
  schema.fields.filter((f) => !f.system && !f.computed).forEach((f) => { arr[f.key] = '?'; });
  arr.created_at = '?';
  arr.updated_at = '?';
  return arr;
}

async function readBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const body = {};
    for (const [key, value] of formData.entries()) body[key] = value;
    return body;
  }
  return request.json();
}

// Reads the CURRENT stored path for every type:'image' field on one
// record, before anything overwrites or deletes it. Same schema-driven
// idea as processImageUploads — mosyQddata('clients','primkey', id) in
// the legacy Clients route only ever read .profile_photo, hardcoded;
// this reads every image field, whatever a given schema has.
async function getImageFieldPaths(id) {
  if (!id) return {};
  const row = await mosyQddata(schema.entity, primkeyCol, id);
  const paths = {};
  schema.fields.filter((f) => f.type === 'image').forEach((f) => { paths[f.key] = row?.[f.key] || ''; });
  return paths;
}

// schema-driven version of what the legacy Clients route did by hand for
// exactly one hardcoded column (profile_photo). Runs for EVERY field
// flagged type: 'image' — add another image field to schema.fields and
// this covers it with zero route.js edits, same as everything else here.
//
// One real improvement over the legacy version: that route inserted the
// record FIRST (with whatever garbage a raw File object turns into once
// it hits the query), then ran a SEPARATE update afterward just to fix
// the photo column, because it didn't have the record's id until after
// the insert. This route already generates `newId` before either
// insert/update runs, so the upload happens first and `body[f.key]` gets
// swapped for the real stored path BEFORE mosySqlInsert/mosySqlUpdate
// ever reads it — one write, not two.
//
// `existingPaths` (from getImageFieldPaths, PUT only — undefined on
// create, where there's nothing to replace yet) lets this report back
// exactly which fields got a genuine new upload AND had an old file to
// clean up — never every image field, only the ones actually swapped
// this request. The caller decides when it's safe to actually delete
// those (i.e. only after the DB write itself succeeds).
async function processImageUploads(body, entity, existingPaths = {}) {
  const imageFields = schema.fields.filter((f) => f.type === 'image');
  const replaced = [];

  for (const f of imageFields) {
    const incoming = body[f.key];
    if (!incoming || typeof incoming !== 'object') continue; // plain string (existing path, or blank) — nothing to upload

    if (typeof incoming.size === 'number' && incoming.size > 0) {
      const filePath = await mosyUploadFile(incoming, `media/${entity}`);
      body[f.key] = filePath; // swap the File for its stored path so the insert/update binds the real value
      if (existingPaths[f.key]) replaced.push({ key: f.key, oldPath: existingPaths[f.key] });
    } else {
      // A File object with no actual bytes (nothing chosen, or a 0-byte
      // pick) — treat as blank rather than let a raw File object reach
      // the query.
      body[f.key] = '';
    }
  }

  return replaced;
}

// Best-effort — a file that's already gone (manually removed, storage
// hiccup, whatever) shouldn't fail the request that's trying to clean up
// after itself. Logged, not thrown.
async function deleteFiles(paths) {
  for (const path of paths) {
    if (!path) continue;
    try {
      await mosyDeleteFile(path);
    } catch (err) {
      console.error(`Failed to delete attached media at "${path}":`, err);
    }
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const { valid, reason, data: authData } = processAuthToken(request);
    if (!valid) {
      return Response.json({ status: 'unauthorized', message: reason }, { status: 403 });
    }

    const canSelect = validateRoleAccess({
      table: schema.entity,
      source: schema.entity,
      action: 'select',
      role: `view_${schema.entity}`,
      authData,
    });
    if (!canSelect.valid) {
      return Response.json({ status: 'error', message: canSelect.message, data: [] });
    }

    const result = await mosySecureSelect({
      table: schema.entity,
      recordIdColumn: recordIdCol,
      dictionary: columnDictionary,
      searchParams,
      authData,
      batchMutations: Object.keys(schema.batchMutations || {}).length ? schema.batchMutations : null,
      defaultOrderColumn: primkeyCol,
    });

    return Response.json({ status: 'success', message: `${schema.entity} data retrieved`, ...result });
  } catch (err) {
    console.error(`GET ${schema.entity} failed:`, err);
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await readBody(request);

    const { valid, reason, data: authData } = processAuthToken(request);
    if (!valid) {
      //return Response.json({ status: 'unauthorized', message: reason }, { status: 403 });
    }

    const canPost = validateRoleAccess({
      table: schema.entity,
      source: schema.entity,
      action: 'create',
      role: `manage_${schema.entity}`,
      authData,
    });
    if (!canPost.valid) {
      return Response.json({ status: 'error', message: canPost.message, data: [] });
    }

    await processImageUploads(body, schema.entity);

    const newId = magicRandomStr(7);
    const inputsArr = buildInputsArr();
    const mutatedDataArray = mutateInputArray(schema.entity, inputsArr, body, newId, authData);
    mutatedDataArray[recordIdCol] = newId;

    const result = await mosySqlInsert(schema.entity, mutatedDataArray, body);

    return Response.json({
      status: 'success',
      message: result.message,
      [`${schema.entity}_dataNode`]: result.record_id,
    });
  } catch (err) {
    console.error(`POST ${schema.entity} failed:`, err);
    return Response.json({ status: 'error', message: `Data Post error ${err.message}` }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await readBody(request);

    const { valid, reason, data: authData } = processAuthToken(request);
    if (!valid) {
      //return Response.json({ status: 'unauthorized', message: reason }, { status: 403 });
    }

    const canUpdate = validateRoleAccess({
      table: schema.entity,
      source: schema.entity,
      action: 'update',
      role: `manage_${schema.entity}`,
      authData,
    });
    if (!canUpdate.valid) {
      return Response.json({ status: 'error', message: canUpdate.message, data: [] });
    }

    // dataNodeValue has to come first — both getImageFieldPaths (needs
    // the record's id to know what to look up) and processImageUploads
    // (needs to know which old paths are actually being replaced) depend
    // on it, and processImageUploads overwrites body[f.key] with the NEW
    // path, so this is the only chance to read the OLD one.
    const dataNodeValue = base64Decode(body[`${schema.entity}_dataNode`]);
    const existingImagePaths = await getImageFieldPaths(dataNodeValue);
    const replacedImages = await processImageUploads(body, schema.entity, existingImagePaths);

    const newId = magicRandomStr(7);
    const inputsArr = buildInputsArr();
    const mutatedDataArray = mutateInputArray(schema.entity, inputsArr, body, newId, authData);

    const result = await mosySqlUpdate(schema.entity, mutatedDataArray, body, `${primkeyCol}='${dataNodeValue}'`);

    // Only clean up the old file once the update actually persisted the
    // new one — never delete on a failed write.
    if (result && replacedImages.length) {
      await deleteFiles(replacedImages.map((r) => r.oldPath));
    }

    return Response.json({
      status: 'success',
      message: result.message,
      [`${schema.entity}_dataNode`]: dataNodeValue,
    });
  } catch (err) {
    console.error(`PUT ${schema.entity} failed:`, err);
    return Response.json({ status: 'error', message: `Data Post error ${err.message}` }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId =searchParams.get('Node');

    const { valid, reason, data: authData } = processAuthToken(request);
    if (!valid) {
      return Response.json({ status: 'unauthorized', message: reason }, { status: 403 });
    }

    const canDelete = validateRoleAccess({
      table: schema.entity,
      source: schema.entity,
      action: 'delete',
      role: `manage_${schema.entity}`,
      authData,
    });
    if (!canDelete.valid) {
      return Response.json({ status: 'error', message: canDelete.message, data: [] });
    }

    const dataNodeValue = base64Decode(tokenId);

    // Has to happen BEFORE the row is gone — once mosySqlDelete runs,
    // there's no record left to read a stored media path from.
    const existingImagePaths = await getImageFieldPaths(dataNodeValue);

    const result = await mosySqlDelete(schema.entity, `where ${primkeyCol}='${dataNodeValue}'`);

    if (result) {
      await deleteFiles(Object.values(existingImagePaths));
    }

    console.log("delete result", result, `${dataNodeValue} token ${tokenId}` , schema.entity, primkeyCol);

    return Response.json({ status: 'success', message: result.message });
  } catch (err) {
    console.error(`DELETE ${schema.entity} failed:`, err);
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}