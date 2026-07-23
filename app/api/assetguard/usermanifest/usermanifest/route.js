
//utils 
import {base64Decode, mosyUploadFile, mosyDeleteFile, magicRandomStr , mosySecureSelect} from '../../../apiUtils/dataControl/dataUtils';

import { UserManifestBatchMutations } from './UserManifestBatchMutations';

//be gate keeper and auth 
import { mosyMutateQuery, mutateInputArray } from '../../beMonitor';

//role access control 
import { validateRoleAccess } from '../../validateRoleAccess';

import { processAuthToken } from '../../../auth/authManager';

import { AddUserManifest, UpdateUserManifest } from './UserManifestDbGateway';

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
      table: 'user_manifest_',
      source: 'UserManifest',
      action : 'select',
      role: 'view_user_manifest_',
      authData
    });

    if (!canSelect.valid) {
      return Response.json({
        status: 'error',
        message: canSelect.message,
        data: []
      });
    }

    
    // user_manifest_ column DictionaryMap
  const UserManifestColumnDictionary={

    Node : "primkey", 
    NodeId : "record_id", 
    recordId : "record_id", 
    adminManifestKey : "admin_manifest_key", 
    userId : "user_id", 
    userName : "user_name", 
    roleId : "role_id", 
    siteId : "site_id", 
    roleName : "role_name", 
    projectId : "project_id", 
    projectName : "project_name", 
    createdAt : "created_at", 
    updatedAt : "updated_at", 

  }


    
    
    
    
   const result = await mosySecureSelect({
      table: `user_manifest_`,
      recordIdColumn: `record_id`,
      dictionary: UserManifestColumnDictionary,
      searchParams,
      authData,
      batchMutations: UserManifestBatchMutations,
      defaultOrderColumn : `primkey`
    });

    return Response.json({
      status: 'success',
      message: 'UserManifest data retrieved',
      ...result
    });
      
   
  } catch (err) {
    console.error('GET UserManifest failed:', err);
    return Response.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}



export async function POST(UserManifestRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = UserManifestRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await UserManifestRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await UserManifestRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(UserManifestRequest);
     
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
      table: 'user_manifest_',
      source: 'UserManifest',
      action : 'create',
      role: 'manage_user_manifest_',
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

		
  
  //--- Begin  user_manifest_ inputs array ---// 
  const UserManifestInputsArr = {

    "admin_manifest_key" : "?", 
    "user_id" : "?", 
    "user_name" : "?", 
    "role_id" : "?", 
    "site_id" : "?", 
    "role_name" : "?", 
    "project_id" : "?", 
    "project_name" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End user_manifest_ inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('user_manifest_',UserManifestInputsArr, UserManifestRequest, newId, authData)

      
      mutatedDataArray.record_id = newId;
      
      // Insert into table UserManifest
      const result = await AddUserManifest(newId, mutatedDataArray, body, authData);     

       

      return Response.json({
        status: 'success',
        message: result.message,
        user_manifest__dataNode: result.record_id
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

export async function PUT(UserManifestRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = UserManifestRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await UserManifestRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await UserManifestRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(UserManifestRequest);
     
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
      table: 'user_manifest_',
      source: 'UserManifest',
      action : 'update',
      role: 'manage_user_manifest_',
      authData
    });

    if (!canUpdate.valid) {
      return Response.json({
        status: 'error',
        message: canUpdate.message,
        data: []
      });
    }
    
    const UserManifestFormAction = body.user_manifest__mosy_action;
    const user_manifest__dataNode_value = base64Decode(body.user_manifest__dataNode);
    
    const newId = magicRandomStr(7);

		
  
  //--- Begin  user_manifest_ inputs array ---// 
  const UserManifestInputsArr = {

    "admin_manifest_key" : "?", 
    "user_id" : "?", 
    "user_name" : "?", 
    "role_id" : "?", 
    "site_id" : "?", 
    "role_name" : "?", 
    "project_id" : "?", 
    "project_name" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End user_manifest_ inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('user_manifest_',UserManifestInputsArr, UserManifestRequest, newId, authData)
       
      // update table UserManifest
      const result = await UpdateUserManifest(newId, mutatedDataArray, body, authData, `primkey='${user_manifest__dataNode_value}'`)

      

      return Response.json({
        status: 'success',
        message: result.message,
        user_manifest__dataNode: user_manifest__dataNode_value
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


