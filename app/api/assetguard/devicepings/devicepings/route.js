
//utils 
import {base64Decode, mosyUploadFile, mosyDeleteFile, magicRandomStr , mosySecureSelect} from '../../../apiUtils/dataControl/dataUtils';

import { DevicePingsBatchMutations } from './DevicePingsBatchMutations';

//be gate keeper and auth 
import { mosyMutateQuery, mutateInputArray } from '../../beMonitor';

//role access control 
import { validateRoleAccess } from '../../validateRoleAccess';

import { processAuthToken } from '../../../auth/authManager';

import { AddDevicePings, UpdateDevicePings } from './DevicePingsDbGateway';

export async function GET(request) {

  try {
    const { searchParams } = new URL(request.url);

    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(request);
     
    if (!isTokenValid) {
      return Response.json(
        { status: 'unauthorized', message: tokenError },
        { status: 403 }
      );
    }
    
    // -----------------------------
    // SIMPLE ROLE VALIDATION
    // -----------------------------
    const canSelect = validateRoleAccess({
      table: 'device_pings',
      source: 'DevicePings',
      action : 'select',
      role: 'view_device_pings',
      authData
    });

    if (!canSelect.valid) {
      return Response.json({
        status: 'error',
        message: canSelect.message,
        data: []
      });
    }

    
    // device_pings column DictionaryMap
  const DevicePingsColumnDictionary={

    Node : "primkey", 
    NodeId : "record_id", 
    recordId : "record_id", 
    deviceId : "device_id", 
    pingTime : "ping_time", 
    signalStrength : "signal_strength", 
    batteryLevel : "battery_level", 
    remark : "remark", 
    status : "status", 
    createdOn : "created_on", 
    createdAt : "created_at", 
    updatedAt : "updated_at", 

  }


    
    
    
    
   const result = await mosySecureSelect({
      table: `device_pings`,
      recordIdColumn: `record_id`,
      dictionary: DevicePingsColumnDictionary,
      searchParams,
      authData,
      batchMutations: DevicePingsBatchMutations,
      defaultOrderColumn : `primkey`
    });

    return Response.json({
      status: 'success',
      message: 'DevicePings data retrieved',
      ...result
    });
      
   
  } catch (err) {
    console.error('GET DevicePings failed:', err);
    return Response.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}



export async function POST(DevicePingsRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = DevicePingsRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await DevicePingsRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await DevicePingsRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(DevicePingsRequest);
     
    if (!isTokenValid) {
      return Response.json(
        { status: 'unauthorized', message: tokenError },
        { status: 403 }
      );
    }
    
    // -----------------------------
    // SIMPLE ROLE VALIDATION
    // -----------------------------
    const canPost = validateRoleAccess({
      table: 'device_pings',
      source: 'DevicePings',
      action : 'create',
      role: 'manage_device_pings',
      authData
    });

    if (!canPost.valid) {
      return Response.json({
        status: 'error',
        message: canPost.message,
        data: []
      });
    }
    
    //generate Record id 
    const newId = magicRandomStr(7);

		
  
  //--- Begin  device_pings inputs array ---// 
  const DevicePingsInputsArr = {

    "device_id" : "?", 
    "ping_time" : "?", 
    "signal_strength" : "?", 
    "battery_level" : "?", 
    "remark" : "?", 
    "status" : "?", 
    "created_on" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End device_pings inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('device_pings',DevicePingsInputsArr, DevicePingsRequest, newId, authData)

      
      mutatedDataArray.record_id = newId;
      
      // Insert into table DevicePings
      const result = await AddDevicePings(newId, mutatedDataArray, body, authData);     

       

      return Response.json({
        status: 'success',
        message: result.message,
        device_pings_dataNode: result.record_id
      });
      
    
 
  } catch (err) {
    console.error(`Request failed:`, err);
    return Response.json(
      { status: 'error', 
      message: `Data Post error ${err.message}` },
      { status: 500 }
    );
  }
}

export async function PUT(DevicePingsRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = DevicePingsRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await DevicePingsRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await DevicePingsRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(DevicePingsRequest);
     
    if (!isTokenValid) {
      return Response.json(
        { status: 'unauthorized', message: tokenError },
        { status: 403 }
      );
    }
    
    // -----------------------------
    // SIMPLE ROLE VALIDATION
    // -----------------------------
    const canUpdate = validateRoleAccess({
      table: 'device_pings',
      source: 'DevicePings',
      action : 'update',
      role: 'manage_device_pings',
      authData
    });

    if (!canUpdate.valid) {
      return Response.json({
        status: 'error',
        message: canUpdate.message,
        data: []
      });
    }
    
    const DevicePingsFormAction = body.device_pings_mosy_action;
    const device_pings_dataNode_value = base64Decode(body.device_pings_dataNode);
    
    const newId = magicRandomStr(7);

		
  
  //--- Begin  device_pings inputs array ---// 
  const DevicePingsInputsArr = {

    "device_id" : "?", 
    "ping_time" : "?", 
    "signal_strength" : "?", 
    "battery_level" : "?", 
    "remark" : "?", 
    "status" : "?", 
    "created_on" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End device_pings inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('device_pings',DevicePingsInputsArr, DevicePingsRequest, newId, authData)
       
      // update table DevicePings
      const result = await UpdateDevicePings(newId, mutatedDataArray, body, authData, `primkey='${device_pings_dataNode_value}'`)

      

      return Response.json({
        status: 'success',
        message: result.message,
        device_pings_dataNode: device_pings_dataNode_value
      });
 

  } catch (err) {
    console.error(`Request failed:`, err);
    return Response.json(
      { status: 'error', 
      message: `Data Post error ${err.message}` },
      { status: 500 }
    );
  }
}


