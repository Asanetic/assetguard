
//utils 
import {base64Decode, mosyUploadFile, mosyDeleteFile, magicRandomStr , mosySecureSelect} from '../../../apiUtils/dataControl/dataUtils';

import { GpsLogsBatchMutations } from './GpsLogsBatchMutations';

//be gate keeper and auth 
import { mosyMutateQuery, mutateInputArray } from '../../beMonitor';

//role access control 
import { validateRoleAccess } from '../../validateRoleAccess';

import { processAuthToken } from '../../../auth/authManager';

import { AddGpsLogs, UpdateGpsLogs } from './GpsLogsDbGateway';

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
      table: 'gps_logs',
      source: 'GpsLogs',
      action : 'select',
      role: 'view_gps_logs',
      authData
    });

    if (!canSelect.valid) {
      return Response.json({
        status: 'error',
        message: canSelect.message,
        data: []
      });
    }

    
    // gps_logs column DictionaryMap
  const GpsLogsColumnDictionary={

    Node : "primkey", 
    NodeId : "record_id", 
    recordId : "record_id", 
    logType : "log_type", 
    siteName : "site_name", 
    deviceId : "device_id", 
    batteryLevel : "battery_level", 
    latitude : "latitude", 
    longitude : "longitude", 
    logDetails : "log_details", 
    speed : "speed", 
    remark : "remark", 
    timestamp : "timestamp", 
    createdOn : "created_on", 
    createdAt : "created_at", 
    updatedAt : "updated_at", 

  }


    
    
    
    
   const result = await mosySecureSelect({
      table: `gps_logs`,
      recordIdColumn: `record_id`,
      dictionary: GpsLogsColumnDictionary,
      searchParams,
      authData,
      batchMutations: GpsLogsBatchMutations,
      defaultOrderColumn : `primkey`
    });

    return Response.json({
      status: 'success',
      message: 'GpsLogs data retrieved',
      ...result
    });
      
   
  } catch (err) {
    console.error('GET GpsLogs failed:', err);
    return Response.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}



export async function POST(GpsLogsRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = GpsLogsRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await GpsLogsRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await GpsLogsRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(GpsLogsRequest);
     
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
      table: 'gps_logs',
      source: 'GpsLogs',
      action : 'create',
      role: 'manage_gps_logs',
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

		
  
  //--- Begin  gps_logs inputs array ---// 
  const GpsLogsInputsArr = {

    "log_type" : "?", 
    "site_name" : "?", 
    "device_id" : "?", 
    "battery_level" : "?", 
    "latitude" : "?", 
    "longitude" : "?", 
    "log_details" : "?", 
    "speed" : "?", 
    "remark" : "?", 
    "timestamp" : "?", 
    "created_on" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End gps_logs inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('gps_logs',GpsLogsInputsArr, GpsLogsRequest, newId, authData)

      
      mutatedDataArray.record_id = newId;
      
      // Insert into table GpsLogs
      const result = await AddGpsLogs(newId, mutatedDataArray, body, authData);     

       

      return Response.json({
        status: 'success',
        message: result.message,
        gps_logs_dataNode: result.record_id
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

export async function PUT(GpsLogsRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = GpsLogsRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await GpsLogsRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await GpsLogsRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(GpsLogsRequest);
     
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
      table: 'gps_logs',
      source: 'GpsLogs',
      action : 'update',
      role: 'manage_gps_logs',
      authData
    });

    if (!canUpdate.valid) {
      return Response.json({
        status: 'error',
        message: canUpdate.message,
        data: []
      });
    }
    
    const GpsLogsFormAction = body.gps_logs_mosy_action;
    const gps_logs_dataNode_value = base64Decode(body.gps_logs_dataNode);
    
    const newId = magicRandomStr(7);

		
  
  //--- Begin  gps_logs inputs array ---// 
  const GpsLogsInputsArr = {

    "log_type" : "?", 
    "site_name" : "?", 
    "device_id" : "?", 
    "battery_level" : "?", 
    "latitude" : "?", 
    "longitude" : "?", 
    "log_details" : "?", 
    "speed" : "?", 
    "remark" : "?", 
    "timestamp" : "?", 
    "created_on" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End gps_logs inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('gps_logs',GpsLogsInputsArr, GpsLogsRequest, newId, authData)
       
      // update table GpsLogs
      const result = await UpdateGpsLogs(newId, mutatedDataArray, body, authData, `primkey='${gps_logs_dataNode_value}'`)

      

      return Response.json({
        status: 'success',
        message: result.message,
        gps_logs_dataNode: gps_logs_dataNode_value
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


