
import { mosySqlDelete  , mosySqlInsert , mosySqlUpdate } from "../../../apiUtils/dataControl/dataUtils";

//insert user_manifest_ 
export async function AddUserManifest(newId, mutatedDataArray, body, authData)
{

  const result = await mosySqlInsert("user_manifest_", mutatedDataArray, body);
   
  return result;
}


//update user_manifest_ 
export async function UpdateUserManifest(newId, mutatedDataArray, body, authData, whereStr)
{

  const result = await mosySqlUpdate("user_manifest_", mutatedDataArray, body, whereStr);
  
  return result;
}


//delete user_manifest_ 
export async function DeleteUserManifest(tokenId, whereStr)
{  
  const result = await mosySqlDelete("user_manifest_", whereStr);

  return result;
}

