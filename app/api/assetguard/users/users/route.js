
//utils 
import {base64Decode, mosyUploadFile, mosyDeleteFile, magicRandomStr , mosySecureSelect} from '../../../apiUtils/dataControl/dataUtils';

import { UsersBatchMutations } from './UsersBatchMutations';

//be gate keeper and auth 
import { mosyMutateQuery, mutateInputArray } from '../../beMonitor';

//role access control 
import { validateRoleAccess } from '../../validateRoleAccess';

import { processAuthToken } from '../../../auth/authManager';

import { AddUsers, UpdateUsers } from './UsersDbGateway';

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
      table: 'users',
      source: 'Users',
      action : 'select',
      role: 'view_users',
      authData
    });

    if (!canSelect.valid) {
      return Response.json({
        status: 'error',
        message: canSelect.message,
        data: []
      });
    }

    
    // users column DictionaryMap
  const UsersColumnDictionary={

    Node : "primkey", 
    NodeId : "record_id", 
    recordId : "record_id", 
    fullName : "full_name", 
    phoneNumber : "phone_number", 
    emailAddress : "email_address", 
    userPassword : "user_password", 
    userRole : "user_role", 
    departmentName : "department_name", 
    profilePhoto : "profile_photo", 
    accountStatus : "account_status", 
    lastLogin : "last_login", 
    createdAt : "created_at", 
    updatedAt : "updated_at", 

  }


    
    
    
    
   const result = await mosySecureSelect({
      table: `users`,
      recordIdColumn: `record_id`,
      dictionary: UsersColumnDictionary,
      searchParams,
      authData,
      batchMutations: UsersBatchMutations,
      defaultOrderColumn : `primkey`
    });

    return Response.json({
      status: 'success',
      message: 'Users data retrieved',
      ...result
    });
      
   
  } catch (err) {
    console.error('GET Users failed:', err);
    return Response.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}



export async function POST(UsersRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = UsersRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await UsersRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await UsersRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(UsersRequest);
     
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
      table: 'users',
      source: 'Users',
      action : 'create',
      role: 'manage_users',
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

		
  
  //--- Begin  users inputs array ---// 
  const UsersInputsArr = {

    "full_name" : "?", 
    "phone_number" : "?", 
    "email_address" : "?", 
    "user_password" : "?", 
    "user_role" : "?", 
    "department_name" : "?", 
    "profile_photo" : "?", 
    "account_status" : "?", 
    "last_login" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End users inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('users',UsersInputsArr, UsersRequest, newId, authData)

      
      mutatedDataArray.record_id = newId;
      
      // Insert into table Users
      const result = await AddUsers(newId, mutatedDataArray, body, authData);     

       
                // Now handle the file upload for profile_photo, if any
                if (body.fileusers_profile_photo) {
                  if(body["fileusers_profile_photo"].size>0){
                  try {
                    
                    const filePath = await mosyUploadFile(body[ "fileusers_profile_photo"], "media/users");
                    
                    UsersInputsArr.profile_photo = filePath; // Update file path in the database

                    // After file upload, update the database with the file path
                    await UpdateUsers(newId, { profile_photo: filePath }, body, authData,  `primkey='${result.record_id}'`)
                    
                    let fileToDelete = body.media_users_profile_photo;
                      
                    //Delete file if need be

                  } catch (fileErr) {
                    console.error("File upload failed:", fileErr);
                    // You can either handle this error or return a partial success message
                  }
                }
               }

      return Response.json({
        status: 'success',
        message: result.message,
        users_dataNode: result.record_id
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

export async function PUT(UsersRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = UsersRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await UsersRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await UsersRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(UsersRequest);
     
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
      table: 'users',
      source: 'Users',
      action : 'update',
      role: 'manage_users',
      authData
    });

    if (!canUpdate.valid) {
      return Response.json({
        status: 'error',
        message: canUpdate.message,
        data: []
      });
    }
    
    const UsersFormAction = body.users_mosy_action;
    const users_dataNode_value = base64Decode(body.users_dataNode);
    
    const newId = magicRandomStr(7);

		
  
  //--- Begin  users inputs array ---// 
  const UsersInputsArr = {

    "full_name" : "?", 
    "phone_number" : "?", 
    "email_address" : "?", 
    "user_password" : "?", 
    "user_role" : "?", 
    "department_name" : "?", 
    "profile_photo" : "?", 
    "account_status" : "?", 
    "last_login" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End users inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('users',UsersInputsArr, UsersRequest, newId, authData)
       
      // update table Users
      const result = await UpdateUsers(newId, mutatedDataArray, body, authData, `primkey='${users_dataNode_value}'`)

      
                // Now handle the file upload for profile_photo, if any
                if (body.fileusers_profile_photo) {
                  if(body["fileusers_profile_photo"].size>0){
                  try {
                    
                    const filePath = await mosyUploadFile(body[ "fileusers_profile_photo"], "media/users");
                    
                    UsersInputsArr.profile_photo = filePath; // Update file path in the database

                    // After file upload, update the database with the file path
                    await UpdateUsers(newId, { profile_photo: filePath }, body, authData,  `primkey='${users_dataNode_value}'`)
                    
                    let fileToDelete = body.media_users_profile_photo;
                      
                    //Delete old file
mosyDeleteFile(fileToDelete);
// Log or store deleted file: fileToDelete

                  } catch (fileErr) {
                    console.error("File upload failed:", fileErr);
                    // You can either handle this error or return a partial success message
                  }
                }
               }

      return Response.json({
        status: 'success',
        message: result.message,
        users_dataNode: users_dataNode_value
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


