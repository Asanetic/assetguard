
import { mosySqlDelete  , mosySqlInsert , mosySqlUpdate } from "../../../apiUtils/dataControl/dataUtils";

//insert page_manifest_ 
export async function AddPageManifest(newId, mutatedDataArray, body, authData)
{

  const result = await mosySqlInsert("page_manifest_", mutatedDataArray, body);
   
  return result;
}


//update page_manifest_ 
export async function UpdatePageManifest(newId, mutatedDataArray, body, authData, whereStr)
{

  const result = await mosySqlUpdate("page_manifest_", mutatedDataArray, body, whereStr);
  
  return result;
}


//delete page_manifest_ 
export async function DeletePageManifest(tokenId, whereStr)
{  
  const result = await mosySqlDelete("page_manifest_", whereStr);

  return result;
}

