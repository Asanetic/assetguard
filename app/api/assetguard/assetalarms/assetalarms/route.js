
//utils 
import {base64Decode, mosyUploadFile, mosyDeleteFile, magicRandomStr , mosySecureSelect} from '../../../apiUtils/dataControl/dataUtils';

import { AssetAlarmsBatchMutations } from './AssetAlarmsBatchMutations';

//be gate keeper and auth 
import { mosyMutateQuery, mutateInputArray } from '../../beMonitor';

//role access control 
import { validateRoleAccess } from '../../validateRoleAccess';

import { processAuthToken } from '../../../auth/authManager';

import { AddAssetAlarms, UpdateAssetAlarms } from './AssetAlarmsDbGateway';

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
      table: 'asset_alarms',
      source: 'AssetAlarms',
      action : 'select',
      role: 'view_asset_alarms',
      authData
    });

    if (!canSelect.valid) {
      return Response.json({
        status: 'error',
        message: canSelect.message,
        data: []
      });
    }

    
    // asset_alarms column DictionaryMap
  const AssetAlarmsColumnDictionary={

    Node : "primkey", 
    NodeId : "record_id", 
    recordId : "record_id", 
    alarmType : "alarm_type", 
    alarmTime : "alarm_time", 
    deviceSerial : "device_serial", 
    siteId : "site_id", 
    ackStatus : "ack_status", 
    status : "status", 
    description : "description", 
    ackBy : "ack_by", 
    closeStatus : "close_status", 
    registeredOn : "registered_on", 
    closedBy : "closed_by", 
    ackTime : "ack_time", 
    closeTime : "close_time", 
    createdAt : "created_at", 
    updatedAt : "updated_at", 

  }


    
    
    
    
   const result = await mosySecureSelect({
      table: `asset_alarms`,
      recordIdColumn: `record_id`,
      dictionary: AssetAlarmsColumnDictionary,
      searchParams,
      authData,
      batchMutations: AssetAlarmsBatchMutations,
      defaultOrderColumn : `primkey`
    });

    return Response.json({
      status: 'success',
      message: 'AssetAlarms data retrieved',
      ...result
    });
      
   
  } catch (err) {
    console.error('GET AssetAlarms failed:', err);
    return Response.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}



export async function POST(AssetAlarmsRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = AssetAlarmsRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await AssetAlarmsRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await AssetAlarmsRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(AssetAlarmsRequest);
     
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
      table: 'asset_alarms',
      source: 'AssetAlarms',
      action : 'create',
      role: 'manage_asset_alarms',
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

		
  
  //--- Begin  asset_alarms inputs array ---// 
  const AssetAlarmsInputsArr = {

    "alarm_type" : "?", 
    "alarm_time" : "?", 
    "device_serial" : "?", 
    "site_id" : "?", 
    "ack_status" : "?", 
    "status" : "?", 
    "description" : "?", 
    "ack_by" : "?", 
    "close_status" : "?", 
    "registered_on" : "?", 
    "closed_by" : "?", 
    "ack_time" : "?", 
    "close_time" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End asset_alarms inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('asset_alarms',AssetAlarmsInputsArr, AssetAlarmsRequest, newId, authData)

      
      mutatedDataArray.record_id = newId;
      
      // Insert into table AssetAlarms
      const result = await AddAssetAlarms(newId, mutatedDataArray, body, authData);     

       

      return Response.json({
        status: 'success',
        message: result.message,
        asset_alarms_dataNode: result.record_id
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

export async function PUT(AssetAlarmsRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = AssetAlarmsRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await AssetAlarmsRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await AssetAlarmsRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(AssetAlarmsRequest);
     
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
      table: 'asset_alarms',
      source: 'AssetAlarms',
      action : 'update',
      role: 'manage_asset_alarms',
      authData
    });

    if (!canUpdate.valid) {
      return Response.json({
        status: 'error',
        message: canUpdate.message,
        data: []
      });
    }
    
    const AssetAlarmsFormAction = body.asset_alarms_mosy_action;
    const asset_alarms_dataNode_value = base64Decode(body.asset_alarms_dataNode);
    
    const newId = magicRandomStr(7);

		
  
  //--- Begin  asset_alarms inputs array ---// 
  const AssetAlarmsInputsArr = {

    "alarm_type" : "?", 
    "alarm_time" : "?", 
    "device_serial" : "?", 
    "site_id" : "?", 
    "ack_status" : "?", 
    "status" : "?", 
    "description" : "?", 
    "ack_by" : "?", 
    "close_status" : "?", 
    "registered_on" : "?", 
    "closed_by" : "?", 
    "ack_time" : "?", 
    "close_time" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End asset_alarms inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('asset_alarms',AssetAlarmsInputsArr, AssetAlarmsRequest, newId, authData)
       
      // update table AssetAlarms
      const result = await UpdateAssetAlarms(newId, mutatedDataArray, body, authData, `primkey='${asset_alarms_dataNode_value}'`)

      

      return Response.json({
        status: 'success',
        message: result.message,
        asset_alarms_dataNode: asset_alarms_dataNode_value
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


