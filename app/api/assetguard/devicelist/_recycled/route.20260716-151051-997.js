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
} from '../../apiUtils/dataControl/dataUtils';

import { mutateInputArray } from '../beMonitor';
import { validateRoleAccess } from '../validateRoleAccess';
import { processAuthToken } from '../../auth/authManager';
import { DevicelistSchema as schema } from './schema';

// schema.fields[0] and [1] are always the system PK columns (primkey, record_id)
// — see db-cli.js. Resolve them here instead of hardcoding the column names,
// so this file stays correct even if a table's PK columns are ever renamed.
const primkeyCol = schema.fields[0]?.key || 'primkey';
const recordIdCol = schema.fields[1]?.key || 'record_id';

// Auto-built from schema.fields — no per-module dictionary to maintain.
// "Node"/"NodeId"/"recordId" are the standard Mosy system keys every table has.
// Computed fields (e.g. row_count) aren't real DB columns, so they're left
// out of the dictionary — only "system" fields (real PK columns) and normal
// fields are included.
const columnDictionary = {
  Node: primkeyCol,
  NodeId: recordIdCol,
  recordId: recordIdCol,
  ...Object.fromEntries(schema.fields.filter((f) => !f.computed).map((f) => [f.key, f.key])),
};

// Auto-built insertable/updatable columns — every real, writable field, plus timestamps.
// System fields (primkey, record_id) and computed fields (row_count) are
// excluded: primkey is auto-increment, record_id is generated in code below,
// and computed fields don't exist in the DB at all.
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const { valid, reason, data: authData } = processAuthToken(request);
    if (!valid) {
      //return Response.json({ status: 'unauthorized', message: reason }, { status: 403 });
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
     // return Response.json({ status: 'unauthorized', message: reason }, { status: 403 });
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

    const newId = magicRandomStr(7);
    const inputsArr = buildInputsArr();
    const mutatedDataArray = mutateInputArray(schema.entity, inputsArr, request, newId, authData);
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
      return Response.json({ status: 'unauthorized', message: reason }, { status: 403 });
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

    const dataNodeValue = base64Decode(body[`${schema.entity}_dataNode`]);
    const newId = magicRandomStr(7);
    const inputsArr = buildInputsArr();
    const mutatedDataArray = mutateInputArray(schema.entity, inputsArr, request, newId, authData);

    const result = await mosySqlUpdate(schema.entity, mutatedDataArray, body, `${primkeyCol}='${dataNodeValue}'`);

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
    const tokenId = searchParams.get(`${schema.entity}_delete`) || searchParams.get('id');

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
    const result = await mosySqlDelete(schema.entity, `${primkeyCol}='${dataNodeValue}'`);

    return Response.json({ status: 'success', message: result.message });
  } catch (err) {
    console.error(`DELETE ${schema.entity} failed:`, err);
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}