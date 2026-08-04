
//utils 
import {base64Decode, mosyUploadFile, mosyDeleteFile, magicRandomStr , mosySecureSelect} from '../../../apiUtils/dataControl/dataUtils';

import { UserBundleRoleFunctionsBatchMutations } from './UserBundleRoleFunctionsBatchMutations';

//be gate keeper and auth 
import { mosyMutateQuery, mutateInputArray } from '../../beMonitor';

//role access control 
import { validateRoleAccess } from '../../validateRoleAccess';

import { processAuthToken } from '../../../auth/authManager';

import { AddUserBundleRoleFunctions, UpdateUserBundleRoleFunctions } from './UserBundleRoleFunctionsDbGateway';

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
      table: 'user_bundle_role_functions',
      source: 'UserBundleRoleFunctions',
      action : 'select',
      role: 'view_user_bundle_role_functions',
      authData
    });

    if (!canSelect.valid) {
      return Response.json({
        status: 'error',
        message: canSelect.message,
        data: []
      });
    }

    
    // user_bundle_role_functions column DictionaryMap
  const UserBundleRoleFunctionsColumnDictionary={

    Node : "primkey", 
    NodeId : "record_id", 
    recordId : "record_id", 
    bundleId : "bundle_id", 
    bundleName : "bundle_name", 
    roleId : "role_id", 
    roleName : "role_name", 
    remark : "remark", 
    createdAt : "created_at", 
    updatedAt : "updated_at", 

  }


    
    
    
    
   const result = await mosySecureSelect({
      table: `user_bundle_role_functions`,
      recordIdColumn: `record_id`,
      dictionary: UserBundleRoleFunctionsColumnDictionary,
      searchParams,
      authData,
      batchMutations: UserBundleRoleFunctionsBatchMutations,
      defaultOrderColumn : `primkey`
    });

    return Response.json({
      status: 'success',
      message: 'UserBundleRoleFunctions data retrieved',
      ...result
    });
      
   
  } catch (err) {
    console.error('GET UserBundleRoleFunctions failed:', err);
    return Response.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}



export async function POST(UserBundleRoleFunctionsRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = UserBundleRoleFunctionsRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await UserBundleRoleFunctionsRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await UserBundleRoleFunctionsRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(UserBundleRoleFunctionsRequest);
     
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
      table: 'user_bundle_role_functions',
      source: 'UserBundleRoleFunctions',
      action : 'create',
      role: 'manage_user_bundle_role_functions',
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

		
  
  //--- Begin  user_bundle_role_functions inputs array ---// 
  const UserBundleRoleFunctionsInputsArr = {

    "bundle_id" : "?", 
    "bundle_name" : "?", 
    "role_id" : "?", 
    "role_name" : "?", 
    "remark" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End user_bundle_role_functions inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('user_bundle_role_functions',UserBundleRoleFunctionsInputsArr, UserBundleRoleFunctionsRequest, newId, authData)

      
      mutatedDataArray.record_id = newId;
      
      // Insert into table UserBundleRoleFunctions
      const result = await AddUserBundleRoleFunctions(newId, mutatedDataArray, body, authData);     

       

      return Response.json({
        status: 'success',
        message: result.message,
        user_bundle_role_functions_dataNode: result.record_id
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

export async function PUT(UserBundleRoleFunctionsRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = UserBundleRoleFunctionsRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await UserBundleRoleFunctionsRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await UserBundleRoleFunctionsRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(UserBundleRoleFunctionsRequest);
     
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
      table: 'user_bundle_role_functions',
      source: 'UserBundleRoleFunctions',
      action : 'update',
      role: 'manage_user_bundle_role_functions',
      authData
    });

    if (!canUpdate.valid) {
      return Response.json({
        status: 'error',
        message: canUpdate.message,
        data: []
      });
    }
    
    const UserBundleRoleFunctionsFormAction = body.user_bundle_role_functions_mosy_action;
    const user_bundle_role_functions_dataNode_value = base64Decode(body.user_bundle_role_functions_dataNode);
    
    const newId = magicRandomStr(7);

		
  
  //--- Begin  user_bundle_role_functions inputs array ---// 
  const UserBundleRoleFunctionsInputsArr = {

    "bundle_id" : "?", 
    "bundle_name" : "?", 
    "role_id" : "?", 
    "role_name" : "?", 
    "remark" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End user_bundle_role_functions inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('user_bundle_role_functions',UserBundleRoleFunctionsInputsArr, UserBundleRoleFunctionsRequest, newId, authData)
       
      // update table UserBundleRoleFunctions
      const result = await UpdateUserBundleRoleFunctions(newId, mutatedDataArray, body, authData, `primkey='${user_bundle_role_functions_dataNode_value}'`)

      

      return Response.json({
        status: 'success',
        message: result.message,
        user_bundle_role_functions_dataNode: user_bundle_role_functions_dataNode_value
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


