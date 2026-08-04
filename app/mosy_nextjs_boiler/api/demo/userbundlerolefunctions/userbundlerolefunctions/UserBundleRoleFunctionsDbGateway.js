
import { mosySqlDelete  , mosySqlInsert , mosySqlUpdate } from "../../../apiUtils/dataControl/dataUtils";

//insert user_bundle_role_functions 
export async function AddUserBundleRoleFunctions(newId, mutatedDataArray, body, authData)
{

  const result = await mosySqlInsert("user_bundle_role_functions", mutatedDataArray, body);
   
  return result;
}


//update user_bundle_role_functions 
export async function UpdateUserBundleRoleFunctions(newId, mutatedDataArray, body, authData, whereStr)
{

  const result = await mosySqlUpdate("user_bundle_role_functions", mutatedDataArray, body, whereStr);
  
  return result;
}


//delete user_bundle_role_functions 
export async function DeleteUserBundleRoleFunctions(tokenId, whereStr)
{  
  const result = await mosySqlDelete("user_bundle_role_functions", whereStr);

  return result;
}

