
//utils 
import {base64Decode, mosyUploadFile, mosyDeleteFile, magicRandomStr , mosySecureSelect} from '../../../apiUtils/dataControl/dataUtils';

import { ActivitiesBatchMutations } from './ActivitiesBatchMutations';

//be gate keeper and auth 
import { mosyMutateQuery, mutateInputArray } from '../../beMonitor';

//role access control 
import { validateRoleAccess } from '../../validateRoleAccess';

import { processAuthToken } from '../../../auth/authManager';

import { AddActivities, UpdateActivities } from './ActivitiesDbGateway';

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
      table: 'activities',
      source: 'Activities',
      action : 'select',
      role: 'view_activities',
      authData
    });

    if (!canSelect.valid) {
      return Response.json({
        status: 'error',
        message: canSelect.message,
        data: []
      });
    }

    
    // activities column DictionaryMap
  const ActivitiesColumnDictionary={

    Node : "primkey", 
    NodeId : "record_id", 
    recordId : "record_id", 
    clientId : "client_id", 
    dealId : "deal_id", 
    activityType : "activity_type", 
    activityTitle : "activity_title", 
    activityDescription : "activity_description", 
    activityStatus : "activity_status", 
    performedBy : "performed_by", 
    activityDate : "activity_date", 
    nextActionDate : "next_action_date", 
    createdAt : "created_at", 
    updatedAt : "updated_at", 

  }


    
    
    
    
   const result = await mosySecureSelect({
      table: `activities`,
      recordIdColumn: `record_id`,
      dictionary: ActivitiesColumnDictionary,
      searchParams,
      authData,
      batchMutations: ActivitiesBatchMutations,
      defaultOrderColumn : `primkey`
    });

    return Response.json({
      status: 'success',
      message: 'Activities data retrieved',
      ...result
    });
      
   
  } catch (err) {
    console.error('GET Activities failed:', err);
    return Response.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}



export async function POST(ActivitiesRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = ActivitiesRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await ActivitiesRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await ActivitiesRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(ActivitiesRequest);
     
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
      table: 'activities',
      source: 'Activities',
      action : 'create',
      role: 'manage_activities',
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

		
  
  //--- Begin  activities inputs array ---// 
  const ActivitiesInputsArr = {

    "client_id" : "?", 
    "deal_id" : "?", 
    "activity_type" : "?", 
    "activity_title" : "?", 
    "activity_description" : "?", 
    "activity_status" : "?", 
    "performed_by" : "?", 
    "activity_date" : "?", 
    "next_action_date" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End activities inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('activities',ActivitiesInputsArr, ActivitiesRequest, newId, authData)

      
      mutatedDataArray.record_id = newId;
      
      // Insert into table Activities
      const result = await AddActivities(newId, mutatedDataArray, body, authData);     

       

      return Response.json({
        status: 'success',
        message: result.message,
        activities_dataNode: result.record_id
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

export async function PUT(ActivitiesRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = ActivitiesRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await ActivitiesRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await ActivitiesRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(ActivitiesRequest);
     
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
      table: 'activities',
      source: 'Activities',
      action : 'update',
      role: 'manage_activities',
      authData
    });

    if (!canUpdate.valid) {
      return Response.json({
        status: 'error',
        message: canUpdate.message,
        data: []
      });
    }
    
    const ActivitiesFormAction = body.activities_mosy_action;
    const activities_dataNode_value = base64Decode(body.activities_dataNode);
    
    const newId = magicRandomStr(7);

		
  
  //--- Begin  activities inputs array ---// 
  const ActivitiesInputsArr = {

    "client_id" : "?", 
    "deal_id" : "?", 
    "activity_type" : "?", 
    "activity_title" : "?", 
    "activity_description" : "?", 
    "activity_status" : "?", 
    "performed_by" : "?", 
    "activity_date" : "?", 
    "next_action_date" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End activities inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('activities',ActivitiesInputsArr, ActivitiesRequest, newId, authData)
       
      // update table Activities
      const result = await UpdateActivities(newId, mutatedDataArray, body, authData, `primkey='${activities_dataNode_value}'`)

      

      return Response.json({
        status: 'success',
        message: result.message,
        activities_dataNode: activities_dataNode_value
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


