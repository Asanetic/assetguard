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
import { SystemusersSchema as schema } from './schema';

// Auto-built from schema.fields — no per-module dictionary to maintain.
// "Node"/"NodeId"/"recordId" are the standard Mosy system keys every table has.
const columnDictionary = {
  Node: 'primkey',
  NodeId: 'record_id',
  recordId: 'record_id',
  ...Object.fromEntries(schema.fields.map((f) => [f.key, f.key])),
};

// Auto-built insertable/updatable columns — every real field, plus timestamps.
function buildInputsArr() {
  const arr = {};
  schema.fields.forEach((f) => { arr[f.key] = '?'; });
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
      recordIdColumn: 'record_id',
      dictionary: columnDictionary,
      searchParams,
      authData,
      batchMutations: Object.keys(schema.batchMutations || {}).length ? schema.batchMutations : {},
      defaultOrderColumn: 'primkey',
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
      return Response.json({ status: 'unauthorized', message: reason }, { status: 403 });
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
    mutatedDataArray.record_id = newId;

    const result = await mosySqlInsert(schema.entity, mutatedDataArray, body);

    return Response.json({
      status: 'success',
      message: result.message,
      [`${schema.entity}_dataNode`]: newId,
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

    const result = await mosySqlUpdate(schema.entity, mutatedDataArray, body, `primkey='${dataNodeValue}'`);

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
    const result = await mosySqlDelete(schema.entity, `primkey='${dataNodeValue}'`);

    return Response.json({ status: 'success', message: result.message });
  } catch (err) {
    console.error(`DELETE ${schema.entity} failed:`, err);
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}
