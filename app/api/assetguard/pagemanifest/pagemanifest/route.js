
//utils 
import {base64Decode, mosyUploadFile, mosyDeleteFile, magicRandomStr , mosySecureSelect} from '../../../apiUtils/dataControl/dataUtils';

import { PageManifestBatchMutations } from './PageManifestBatchMutations';

//be gate keeper and auth 
import { mosyMutateQuery, mutateInputArray } from '../../beMonitor';

//role access control 
import { validateRoleAccess } from '../../validateRoleAccess';

import { processAuthToken } from '../../../auth/authManager';

import { AddPageManifest, UpdatePageManifest } from './PageManifestDbGateway';

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
      table: 'page_manifest_',
      source: 'PageManifest',
      action : 'select',
      role: 'view_page_manifest_',
      authData
    });

    if (!canSelect.valid) {
      return Response.json({
        status: 'error',
        message: canSelect.message,
        data: []
      });
    }

    
    // page_manifest_ column DictionaryMap
  const PageManifestColumnDictionary={

    Node : "primkey", 
    NodeId : "record_id", 
    recordId : "record_id", 
    manifestKey : "manifest_key", 
    pageGroup : "page_group", 
    siteId : "site_id", 
    pageUrl : "page_url", 
    projectId : "project_id", 
    projectName : "project_name", 
    createdAt : "created_at", 
    updatedAt : "updated_at", 

  }


    
    
    
    
   const result = await mosySecureSelect({
      table: `page_manifest_`,
      recordIdColumn: `record_id`,
      dictionary: PageManifestColumnDictionary,
      searchParams,
      authData,
      batchMutations: PageManifestBatchMutations,
      defaultOrderColumn : `primkey`
    });

    return Response.json({
      status: 'success',
      message: 'PageManifest data retrieved',
      ...result
    });
      
   
  } catch (err) {
    console.error('GET PageManifest failed:', err);
    return Response.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}



export async function POST(PageManifestRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = PageManifestRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await PageManifestRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await PageManifestRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(PageManifestRequest);
     
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
      table: 'page_manifest_',
      source: 'PageManifest',
      action : 'create',
      role: 'manage_page_manifest_',
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

		
  
  //--- Begin  page_manifest_ inputs array ---// 
  const PageManifestInputsArr = {

    "manifest_key" : "?", 
    "page_group" : "?", 
    "site_id" : "?", 
    "page_url" : "?", 
    "project_id" : "?", 
    "project_name" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End page_manifest_ inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('page_manifest_',PageManifestInputsArr, PageManifestRequest, newId, authData)

      
      mutatedDataArray.record_id = newId;
      
      // Insert into table PageManifest
      const result = await AddPageManifest(newId, mutatedDataArray, body, authData);     

       

      return Response.json({
        status: 'success',
        message: result.message,
        page_manifest__dataNode: result.record_id
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

export async function PUT(PageManifestRequest) {
  try {
    let body;
    let isMultipart = false;

    const contentType = PageManifestRequest.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      isMultipart = true;
      const formData = await PageManifestRequest.formData();

      // Convert FormData to plain object
      body = {};
      for (let [key, value] of formData.entries()) {
        body[key] = value;
      }

    } else {
      body = await PageManifestRequest.json();
    }
    
    
    const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(PageManifestRequest);
     
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
      table: 'page_manifest_',
      source: 'PageManifest',
      action : 'update',
      role: 'manage_page_manifest_',
      authData
    });

    if (!canUpdate.valid) {
      return Response.json({
        status: 'error',
        message: canUpdate.message,
        data: []
      });
    }
    
    const PageManifestFormAction = body.page_manifest__mosy_action;
    const page_manifest__dataNode_value = base64Decode(body.page_manifest__dataNode);
    
    const newId = magicRandomStr(7);

		
  
  //--- Begin  page_manifest_ inputs array ---// 
  const PageManifestInputsArr = {

    "manifest_key" : "?", 
    "page_group" : "?", 
    "site_id" : "?", 
    "page_url" : "?", 
    "project_id" : "?", 
    "project_name" : "?", 
    "created_at" : "?", 
    "updated_at" : "?", 

  };

  //--- End page_manifest_ inputs array --//

    //mutate requested values eg add authData.hive_site_id or add more values that only the back end control etc 
    const mutatedDataArray =mutateInputArray('page_manifest_',PageManifestInputsArr, PageManifestRequest, newId, authData)
       
      // update table PageManifest
      const result = await UpdatePageManifest(newId, mutatedDataArray, body, authData, `primkey='${page_manifest__dataNode_value}'`)

      

      return Response.json({
        status: 'success',
        message: result.message,
        page_manifest__dataNode: page_manifest__dataNode_value
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


