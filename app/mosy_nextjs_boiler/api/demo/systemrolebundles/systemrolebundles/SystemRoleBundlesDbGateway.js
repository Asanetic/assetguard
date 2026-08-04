
import { mosySqlDelete  , mosySqlInsert , mosySqlUpdate } from "../../../apiUtils/dataControl/dataUtils";

//insert system_role_bundles 
export async function AddSystemRoleBundles(newId, mutatedDataArray, body, authData)
{

  const result = await mosySqlInsert("system_role_bundles", mutatedDataArray, body);
   
  return result;
}


//update system_role_bundles 
export async function UpdateSystemRoleBundles(newId, mutatedDataArray, body, authData, whereStr)
{

  const result = await mosySqlUpdate("system_role_bundles", mutatedDataArray, body, whereStr);
  
  return result;
}


//delete system_role_bundles 
export async function DeleteSystemRoleBundles(tokenId, whereStr)
{  
  const result = await mosySqlDelete("system_role_bundles", whereStr);

  return result;
}

