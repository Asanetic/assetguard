
//utils 
import {base64Decode, mosyUploadFile, mosyDeleteFile, magicRandomStr , mosySecureSelect} from '../../../apiUtils/dataControl/dataUtils';

import { SystemRoleBundlesBatchMutations } from './SystemRoleBundlesBatchMutations';

//be gate keeper and auth 
import { mosyMutateQuery, mutateInputArray } from '../../beMonitor';

//role access control 
import { validateRoleAccess } from '../../validateRoleAccess';

import { processAuthToken } from '../../../auth/authManager';

import { AddSystemRoleBundles, UpdateSystemRoleBundles } from './SystemRoleBundlesDbGateway';

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
      table: 'system_role_bundles',
      source: 'SystemRoleBundles',
      action : 'select',
      role: 'view_system_role_bundles',
      authData
    });

    if (!canSelect.valid) {
      return Response.json({
        status: 'error',
        message: canSelect.message,
        data: []
      });
    }

    
    // system_role_bundles column DictionaryMap
  const SystemRoleBundlesColumnDictionary={

    Node : "primkey", 
    NodeId : "record_id", 
    recordId : "record_id", 
    bundleId : "bundle_id", 
    bundleName : "bundle_name", 
    remark : "remark", 
    createdAt : "created_at", 
    updatedAt : "updated_at", 

  }


    
    
    
    
   const result = await mosySecureSelect({
      table: `system_role_bundles`,
      recordIdColumn: `record_id`,
      dictionary: SystemRoleBundlesColumnDictionary,
      searchParams,
      authData,
      batchMutations: SystemRoleBundlesBatchMutations,
      defaultOrderColumn : `primkey`
    });

    return Response.json({
      status: 'success',
      message: 'SystemRoleBundles data retrieved',
      ...result
    });
      
   
  } catch (err) {
    console.error('GET SystemRoleBundles failed:', err);
    return Response.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}



export async function POST(SystemRoleBundlesRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = SystemRoleBundlesRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await SystemRoleBundlesRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await SystemRoleBundlesRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(SystemRoleBundlesRequest);
     
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
      table: 'system_role_bundles',
      source: 'SystemRoleBundles',
      action : 'create',
      role: 'manage_system_role_bundles',
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

		
  
  //--- Begin  system_role_bundles inputs array ---// 
  const SystemRoleBundlesInputsArr = {

    "bundle_id" : "?", 
    "bundle_name" : "?", 
    "remark" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End system_role_bundles inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('system_role_bundles',SystemRoleBundlesInputsArr, SystemRoleBundlesRequest, newId, authData)

      
      mutatedDataArray.record_id = newId;
      
      // Insert into table SystemRoleBundles
      const result = await AddSystemRoleBundles(newId, mutatedDataArray, body, authData);     

       

      return Response.json({
        status: 'success',
        message: result.message,
        system_role_bundles_dataNode: result.record_id
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

export async function PUT(SystemRoleBundlesRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = SystemRoleBundlesRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await SystemRoleBundlesRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await SystemRoleBundlesRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(SystemRoleBundlesRequest);
     
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
      table: 'system_role_bundles',
      source: 'SystemRoleBundles',
      action : 'update',
      role: 'manage_system_role_bundles',
      authData
    });

    if (!canUpdate.valid) {
      return Response.json({
        status: 'error',
        message: canUpdate.message,
        data: []
      });
    }
    
    const SystemRoleBundlesFormAction = body.system_role_bundles_mosy_action;
    const system_role_bundles_dataNode_value = base64Decode(body.system_role_bundles_dataNode);
    
    const newId = magicRandomStr(7);

		
  
  //--- Begin  system_role_bundles inputs array ---// 
  const SystemRoleBundlesInputsArr = {

    "bundle_id" : "?", 
    "bundle_name" : "?", 
    "remark" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End system_role_bundles inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('system_role_bundles',SystemRoleBundlesInputsArr, SystemRoleBundlesRequest, newId, authData)
       
      // update table SystemRoleBundles
      const result = await UpdateSystemRoleBundles(newId, mutatedDataArray, body, authData, `primkey='${system_role_bundles_dataNode_value}'`)

      

      return Response.json({
        status: 'success',
        message: result.message,
        system_role_bundles_dataNode: system_role_bundles_dataNode_value
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


